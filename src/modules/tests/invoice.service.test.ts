import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
  invoice,
  OrgRole,
  org,
  orgUser,
  user,
  userInvoice,
  userProfile,
} from "@/drizzle/schema";
import { ForbiddenError, NotFoundError } from "@/plugins/error";
import {
  addInvoiceUsers,
  createInvoice,
  deleteInvoice,
  getInvoiceById,
  getOrgInvoices,
  getUserInvoices,
  removeInvoiceUser,
  updateInvoice,
} from "../invoice/service";
import {
  createTestInvoice,
  createTestOrg,
  createTestOrgUser,
  createTestUser,
  createTestUserInvoice,
  createTestUserProfile,
} from "./utils/fixtures";

describe("Invoice Service", () => {
  let testUser: typeof user.$inferSelect;
  let testUser2: typeof user.$inferSelect;
  let testOrg: typeof org.$inferSelect;
  let testInvoice: typeof invoice.$inferSelect;

  beforeAll(async () => {
    testUser = await createTestUser();
    testUser2 = await createTestUser();
    await createTestUserProfile(testUser.id);
    await createTestUserProfile(testUser2.id);
    testOrg = await createTestOrg();
    await createTestOrgUser(testUser.id, testOrg.id, OrgRole.ADMIN);
    await createTestOrgUser(testUser2.id, testOrg.id, OrgRole.CLIENT);

    // Create test invoice for use across tests
    testInvoice = await createTestInvoice(testOrg.id, testUser.id);
  });

  afterAll(async () => {
    if (testInvoice) {
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, testInvoice.id));
      await db.delete(invoice).where(eq(invoice.id, testInvoice.id));
    }
    if (testOrg) {
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
    }
    if (testUser) {
      await db.delete(userProfile).where(eq(userProfile.userId, testUser.id));
      await db.delete(user).where(eq(user.id, testUser.id));
    }
    if (testUser2) {
      await db.delete(userProfile).where(eq(userProfile.userId, testUser2.id));
      await db.delete(user).where(eq(user.id, testUser2.id));
    }
  });

  describe("createInvoice", () => {
    it("should create invoice for org member", async () => {
      const invoiceData = {
        orgId: testOrg.id,
        amount: 100.5,
        status: "draft" as const,
        dueDate: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(),
        description: "Test invoice",
        userIds: [],
      };

      const created = await createInvoice(testOrg.id, invoiceData, testUser.id);

      expect(created.orgId).toBe(testOrg.id);
      expect(Number.parseFloat(created.amount)).toBe(invoiceData.amount);
      expect(created.status).toBe(invoiceData.status);
      expect(created.createdBy).toBe(testUser.id);

      // Cleanup
      await db.delete(invoice).where(eq(invoice.id, created.id));
    });

    it("should throw ForbiddenError for non-member", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      const invoiceData = {
        orgId: testOrg.id,
        amount: 100,
        status: "draft" as const,
        dueDate: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(),
        userIds: [],
      };

      await expect(
        createInvoice(testOrg.id, invoiceData, otherUser.id),
      ).rejects.toThrow(ForbiddenError);

      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should throw ForbiddenError for read-only user", async () => {
      const readOnlyUser = await createTestUser();
      await createTestUserProfile(readOnlyUser.id);
      await createTestOrgUser(readOnlyUser.id, testOrg.id, OrgRole.READ_ONLY);
      const invoiceData = {
        orgId: testOrg.id,
        amount: 100,
        status: "draft" as const,
        dueDate: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(),
        userIds: [],
      };

      await expect(
        createInvoice(testOrg.id, invoiceData, readOnlyUser.id),
      ).rejects.toThrow(ForbiddenError);

      await db
        .delete(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, readOnlyUser.id)),
        );
      await db
        .delete(userProfile)
        .where(eq(userProfile.userId, readOnlyUser.id));
      await db.delete(user).where(eq(user.id, readOnlyUser.id));
    });

    it("should create invoice with user relationships", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      const invoiceData = {
        orgId: testOrg.id,
        amount: 200,
        status: "unpaid" as const,
        dueDate: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(),
        userIds: [otherUser.id],
      };

      const created = await createInvoice(testOrg.id, invoiceData, testUser.id);

      // Verify user relationship was created
      const [userInv] = await db
        .select()
        .from(userInvoice)
        .where(eq(userInvoice.invoiceId, created.id))
        .limit(1);

      expect(userInv).toBeDefined();
      expect(userInv.userId).toBe(otherUser.id);

      // Cleanup
      await db.delete(userInvoice).where(eq(userInvoice.invoiceId, created.id));
      await db.delete(invoice).where(eq(invoice.id, created.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });

  describe("getInvoiceById", () => {
    it("should return invoice for org member", async () => {
      const found = await getInvoiceById(testInvoice.id, testUser.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(testInvoice.id);
    });

    it("should return invoice via user-invoice relationship", async () => {
      const linkedInvoice = await createTestInvoice(testOrg.id, testUser.id);
      await createTestUserInvoice(testUser2.id, linkedInvoice.id);

      const found = await getInvoiceById(linkedInvoice.id, testUser2.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(linkedInvoice.id);

      // Cleanup
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, linkedInvoice.id));
      await db.delete(invoice).where(eq(invoice.id, linkedInvoice.id));
    });

    it("should return null for invoice user doesn't have access to", async () => {
      const otherOrg = await createTestOrg();
      const otherInvoice = await createTestInvoice(otherOrg.id, testUser.id);

      const found = await getInvoiceById(otherInvoice.id, testUser2.id);
      expect(found).toBeNull();

      // Cleanup
      await db.delete(invoice).where(eq(invoice.id, otherInvoice.id));
      await db.delete(org).where(eq(org.id, otherOrg.id));
    });
  });

  describe("getUserInvoices", () => {
    it("should return all invoices user has access to", async () => {
      const invoices = await getUserInvoices(testUser.id);
      expect(invoices.length).toBeGreaterThan(0);
      expect(invoices.some((inv) => inv.id === testInvoice.id)).toBe(true);
    });

    it("should deduplicate invoices from org and userInvoice relationships", async () => {
      // Create an invoice linked via userInvoice (covers line 147)
      const linkedInvoice = await createTestInvoice(testOrg.id, testUser.id);
      await createTestUserInvoice(testUser.id, linkedInvoice.id);

      const invoices = await getUserInvoices(testUser.id);

      // Should include both org invoices and userInvoice-linked invoices
      const invoiceIds = invoices.map((inv) => inv.id);
      expect(invoiceIds.includes(testInvoice.id)).toBe(true);
      expect(invoiceIds.includes(linkedInvoice.id)).toBe(true);

      // Should deduplicate (user is both org member and has userInvoice link)
      const uniqueIds = new Set(invoiceIds);
      expect(uniqueIds.size).toBe(invoiceIds.length);

      // Cleanup
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, linkedInvoice.id));
      await db.delete(invoice).where(eq(invoice.id, linkedInvoice.id));
    });
  });

  describe("getOrgInvoices", () => {
    it("should return org invoices for member", async () => {
      const invoices = await getOrgInvoices(testOrg.id, testUser.id);
      expect(Array.isArray(invoices)).toBe(true);
      expect(invoices.some((inv) => inv.id === testInvoice.id)).toBe(true);
    });

    it("should throw ForbiddenError for non-member", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);

      await expect(getOrgInvoices(testOrg.id, otherUser.id)).rejects.toThrow(
        ForbiddenError,
      );

      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });

  describe("updateInvoice", () => {
    it("should update invoice", async () => {
      const updateData = {
        amount: 250.75,
        status: "paid" as const,
        description: "Updated description",
      };

      const updated = await updateInvoice(
        testInvoice.id,
        updateData,
        testUser.id,
      );

      expect(Number.parseFloat(updated.amount)).toBe(updateData.amount);
      expect(updated.status).toBe(updateData.status);
      expect(updated.description).toBe(updateData.description);
    });

    it("should update dueDate, periodStart, and periodEnd", async () => {
      const newDueDate = new Date("2024-12-31");
      const newPeriodStart = new Date("2024-01-01");
      const newPeriodEnd = new Date("2024-12-31");
      const updateData = {
        dueDate: newDueDate,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
      };

      const updated = await updateInvoice(
        testInvoice.id,
        updateData,
        testUser.id,
      );

      expect(updated.dueDate).toEqual(newDueDate);
      expect(updated.periodStart).toEqual(newPeriodStart);
      expect(updated.periodEnd).toEqual(newPeriodEnd);
    });

    it("should update userIds and handle user relationships", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      const updateData = {
        userIds: [otherUser.id],
      };

      const _updated = await updateInvoice(
        testInvoice.id,
        updateData,
        testUser.id,
      );

      // Verify old relationships removed and new ones added (covers lines 220, 222-224)
      const userInvs = await db
        .select()
        .from(userInvoice)
        .where(eq(userInvoice.invoiceId, testInvoice.id));

      expect(userInvs.length).toBe(1);
      expect(userInvs[0].userId).toBe(otherUser.id);

      // Cleanup
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, testInvoice.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should remove all userIds when empty array provided", async () => {
      // First add a user relationship
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      await addInvoiceUsers(testInvoice.id, [otherUser.id]);

      // Then remove it
      const updateData = {
        userIds: [],
      };

      await updateInvoice(testInvoice.id, updateData, testUser.id);

      // Verify relationships removed
      const userInvs = await db
        .select()
        .from(userInvoice)
        .where(eq(userInvoice.invoiceId, testInvoice.id));

      expect(userInvs.length).toBe(0);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should throw NotFoundError for non-existent invoice", async () => {
      await expect(
        updateInvoice("non-existent-id", { amount: 100 }, testUser.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteInvoice", () => {
    it("should delete invoice as admin", async () => {
      const invoiceToDelete = await createTestInvoice(testOrg.id, testUser.id);

      // Delete should not throw
      await deleteInvoice(invoiceToDelete.id, testUser.id);

      // Verify deleted - check that no invoice with this ID exists
      const found = await db
        .select()
        .from(invoice)
        .where(eq(invoice.id, invoiceToDelete.id))
        .limit(1);
      expect(found.length).toBe(0);
    });

    it("should throw ForbiddenError for non-admin", async () => {
      const invoiceToDelete = await createTestInvoice(testOrg.id, testUser.id);

      await expect(
        deleteInvoice(invoiceToDelete.id, testUser2.id),
      ).rejects.toThrow(ForbiddenError);

      // Cleanup
      await db.delete(invoice).where(eq(invoice.id, invoiceToDelete.id));
    });
  });

  describe("addInvoiceUsers", () => {
    it("should add user relationships", async () => {
      const testInv = await createTestInvoice(testOrg.id, testUser.id);
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);

      await addInvoiceUsers(testInv.id, [otherUser.id]);

      const [userInv] = await db
        .select()
        .from(userInvoice)
        .where(eq(userInvoice.invoiceId, testInv.id))
        .limit(1);

      expect(userInv).toBeDefined();
      expect(userInv.userId).toBe(otherUser.id);

      // Cleanup
      await db.delete(userInvoice).where(eq(userInvoice.invoiceId, testInv.id));
      await db.delete(invoice).where(eq(invoice.id, testInv.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should handle empty userIds array", async () => {
      const testInv = await createTestInvoice(testOrg.id, testUser.id);

      // Should not throw when userIds is empty (covers line 270-272)
      await addInvoiceUsers(testInv.id, []);

      // Cleanup
      await db.delete(invoice).where(eq(invoice.id, testInv.id));
    });
  });

  describe("removeInvoiceUser", () => {
    it("should remove user relationship", async () => {
      const testInv = await createTestInvoice(testOrg.id, testUser.id);
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      await addInvoiceUsers(testInv.id, [otherUser.id]);

      await removeInvoiceUser(testInv.id, otherUser.id);

      const userInvs = await db
        .select()
        .from(userInvoice)
        .where(eq(userInvoice.invoiceId, testInv.id));

      expect(userInvs.length).toBe(0);

      // Cleanup
      await db.delete(invoice).where(eq(invoice.id, testInv.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });
});
