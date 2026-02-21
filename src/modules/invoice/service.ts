import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/drizzle/db";
import type { InsertInvoice, Invoice } from "@/drizzle/schema";
import { invoice, OrgRole, orgUser, userInvoice } from "@/drizzle/schema";
import { ForbiddenError, NotFoundError } from "@/plugins/error";
import {
  canReadAcrossOrgs,
  canWriteAcrossOrgs,
  canWriteResource,
  getUserOrgRole,
  getUserSiteRole,
  isResourceAssignedToUser,
} from "../auth/permissions";

export interface CreateInvoiceData {
  orgId: string;
  amount: number;
  status?: "draft" | "unpaid" | "paid";
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
  description?: string;
  userIds?: string[];
}

export interface UpdateInvoiceData {
  amount?: number;
  status?: "draft" | "unpaid" | "paid";
  dueDate?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  description?: string;
  userIds?: string[];
}

/**
 * Creates an invoice for an organization
 */
export async function createInvoice(
  orgId: string,
  data: CreateInvoiceData,
  userId: string,
): Promise<Invoice> {
  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, orgId);

  // Site admin can create invoices in any org
  if (!canWriteAcrossOrgs(siteRole)) {
    // Must be a member of the org
    if (orgRole === null) {
      throw new ForbiddenError("User is not a member of this organization");
    }

    // Read-only users cannot create invoices
    if (orgRole === OrgRole.READ_ONLY) {
      throw new ForbiddenError(
        "Read-only users cannot create invoices in this organization",
      );
    }
  }

  const invoiceId = uuidv4();
  const [newInvoice] = await db
    .insert(invoice)
    .values({
      id: invoiceId,
      orgId,
      amount: data.amount.toString(),
      status: data.status || "draft",
      dueDate: data.dueDate,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      description: data.description || null,
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();

  // Add user relationships if provided
  if (data.userIds && data.userIds.length > 0) {
    await addInvoiceUsers(invoiceId, data.userIds);
  }

  return newInvoice;
}

/**
 * Gets an invoice by ID if user has access
 */
export async function getInvoiceById(
  id: string,
  userId: string,
): Promise<Invoice | null> {
  const [foundInvoice] = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, id))
    .limit(1);

  if (!foundInvoice) {
    return null;
  }

  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, foundInvoice.orgId);

  // Site admin/moderator can read everything
  if (canReadAcrossOrgs(siteRole)) {
    return foundInvoice;
  }

  // Org admin and moderator can read all invoices in their org
  if (orgRole === OrgRole.ADMIN || orgRole === OrgRole.MODERATOR) {
    return foundInvoice;
  }

  // Client and read-only users can only read invoices assigned to them
  if (orgRole === OrgRole.CLIENT || orgRole === OrgRole.READ_ONLY) {
    const isAssigned = await isResourceAssignedToUser(
      userId,
      id,
      "userInvoice",
    );
    if (isAssigned) {
      return foundInvoice;
    }
  }

  // Not a member of the org - check if assigned via junction table
  const isAssigned = await isResourceAssignedToUser(userId, id, "userInvoice");
  if (isAssigned) {
    return foundInvoice;
  }

  return null;
}

/**
 * Gets all invoices user has access to
 */
export async function getUserInvoices(userId: string): Promise<Invoice[]> {
  const siteRole = await getUserSiteRole(userId);

  // Site admin/moderator can read all invoices
  if (canReadAcrossOrgs(siteRole)) {
    return await db.select().from(invoice);
  }

  // Get user's org memberships with roles
  const userOrgs = await db
    .select({ orgId: orgUser.orgId, role: orgUser.role })
    .from(orgUser)
    .where(eq(orgUser.userId, userId));

  const invoiceMap = new Map<string, Invoice>();

  // Process each org membership
  for (const userOrg of userOrgs) {
    if (userOrg.role === OrgRole.ADMIN || userOrg.role === OrgRole.MODERATOR) {
      // Org admin and moderator see all invoices in their org
      const orgInvoices = await db
        .select()
        .from(invoice)
        .where(eq(invoice.orgId, userOrg.orgId));
      for (const inv of orgInvoices) {
        invoiceMap.set(inv.id, inv);
      }
    } else if (
      userOrg.role === OrgRole.CLIENT ||
      userOrg.role === OrgRole.READ_ONLY
    ) {
      // Client and read-only see only assigned invoices
      const assignedInvoices = await db
        .select({ invoice })
        .from(invoice)
        .innerJoin(userInvoice, eq(invoice.id, userInvoice.invoiceId))
        .where(
          and(eq(invoice.orgId, userOrg.orgId), eq(userInvoice.userId, userId)),
        );
      for (const { invoice: inv } of assignedInvoices) {
        invoiceMap.set(inv.id, inv);
      }
    }
  }

  // Also get invoices assigned via junction table (for users not in org)
  const userInvoices = await db
    .select({ invoice })
    .from(invoice)
    .innerJoin(userInvoice, eq(invoice.id, userInvoice.invoiceId))
    .where(eq(userInvoice.userId, userId));

  for (const { invoice: inv } of userInvoices) {
    invoiceMap.set(inv.id, inv);
  }

  return Array.from(invoiceMap.values());
}

/**
 * Gets invoices for an organization
 */
export async function getOrgInvoices(
  orgId: string,
  userId: string,
): Promise<Invoice[]> {
  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, orgId);

  // Site admin/moderator can read all orgs
  if (canReadAcrossOrgs(siteRole)) {
    return await db.select().from(invoice).where(eq(invoice.orgId, orgId));
  }

  // Must be a member of the org
  if (orgRole === null) {
    throw new ForbiddenError("User is not a member of this organization");
  }

  // Org admin and moderator see all invoices
  if (orgRole === OrgRole.ADMIN || orgRole === OrgRole.MODERATOR) {
    return await db.select().from(invoice).where(eq(invoice.orgId, orgId));
  }

  // Client and read-only see only assigned invoices
  if (orgRole === OrgRole.CLIENT || orgRole === OrgRole.READ_ONLY) {
    const assignedInvoices = await db
      .select({ invoice })
      .from(invoice)
      .innerJoin(userInvoice, eq(invoice.id, userInvoice.invoiceId))
      .where(and(eq(invoice.orgId, orgId), eq(userInvoice.userId, userId)));

    return assignedInvoices.map((r) => r.invoice);
  }

  return [];
}

/**
 * Updates an invoice
 */
export async function updateInvoice(
  id: string,
  data: UpdateInvoiceData,
  userId: string,
): Promise<Invoice> {
  const [foundInvoice] = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, id))
    .limit(1);

  if (!foundInvoice) {
    throw new NotFoundError("Invoice not found");
  }

  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, foundInvoice.orgId);

  // Check write permissions
  const canWrite = canWriteResource(
    siteRole,
    orgRole,
    foundInvoice.createdBy,
    userId,
  );

  if (!canWrite) {
    throw new ForbiddenError(
      "User does not have permission to update this invoice",
    );
  }

  const updateData: Partial<InsertInvoice> = {
    modifiedBy: userId,
    updatedAt: new Date(),
  };

  if (data.amount !== undefined) {
    updateData.amount = data.amount.toString();
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate;
  }
  if (data.periodStart !== undefined) {
    updateData.periodStart = data.periodStart;
  }
  if (data.periodEnd !== undefined) {
    updateData.periodEnd = data.periodEnd;
  }
  if (data.description !== undefined) {
    updateData.description = data.description || null;
  }

  const [updatedInvoice] = await db
    .update(invoice)
    .set(updateData)
    .where(eq(invoice.id, id))
    .returning();

  // Update user relationships if provided
  if (data.userIds !== undefined) {
    // Remove existing relationships
    await db.delete(userInvoice).where(eq(userInvoice.invoiceId, id));
    // Add new relationships
    if (data.userIds.length > 0) {
      await addInvoiceUsers(id, data.userIds);
    }
  }

  return updatedInvoice;
}

/**
 * Deletes an invoice (org admin or site admin only)
 */
export async function deleteInvoice(id: string, userId: string): Promise<void> {
  const [foundInvoice] = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, id))
    .limit(1);

  if (!foundInvoice) {
    throw new NotFoundError("Invoice not found");
  }

  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, foundInvoice.orgId);

  // Site admin can delete anything
  if (!canWriteAcrossOrgs(siteRole)) {
    // Must be org admin
    if (orgRole !== OrgRole.ADMIN) {
      throw new ForbiddenError("User is not an admin of this organization");
    }
  }

  // Delete user relationships first
  await db.delete(userInvoice).where(eq(userInvoice.invoiceId, id));
  // Delete invoice
  await db.delete(invoice).where(eq(invoice.id, id));
}

/**
 * Adds user relationships for client/recipient access
 */
export async function addInvoiceUsers(
  invoiceId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  await db.insert(userInvoice).values(
    userIds.map((uid) => ({
      userId: uid,
      invoiceId,
    })),
  );
}

/**
 * Removes a user relationship
 */
export async function removeInvoiceUser(
  invoiceId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(userInvoice)
    .where(
      and(eq(userInvoice.invoiceId, invoiceId), eq(userInvoice.userId, userId)),
    );
}
