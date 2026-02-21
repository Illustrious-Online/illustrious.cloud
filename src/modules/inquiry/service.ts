import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/drizzle/db";
import type { Inquiry, InsertInquiry } from "@/drizzle/schema";
import { inquiry, org } from "@/drizzle/schema";
import { NotFoundError } from "@/plugins/error";

/**
 * Creates an inquiry in the database
 * @param data - Inquiry data
 * @param userId - Optional user ID to associate with the inquiry
 * @returns Promise resolving to the created inquiry
 */
export async function createInquiry(
  data: Omit<InsertInquiry, "id" | "createdAt">,
  userId?: string,
): Promise<Inquiry> {
  // Validate org exists
  const [foundOrg] = await db
    .select()
    .from(org)
    .where(eq(org.id, data.orgId))
    .limit(1);

  if (!foundOrg) {
    throw new NotFoundError("Organization not found");
  }

  const [newInquiry] = await db
    .insert(inquiry)
    .values({
      id: uuidv4(),
      orgId: data.orgId,
      userId: userId || null,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      comment: data.comment,
      createdAt: new Date(),
    })
    .returning();

  return newInquiry;
}

/**
 * Gets all inquiries associated with a user
 * @param userId - User ID
 * @returns Promise resolving to array of inquiries
 */
export async function getUserInquiries(userId: string): Promise<Inquiry[]> {
  return await db.select().from(inquiry).where(eq(inquiry.userId, userId));
}

/**
 * Gets an inquiry by ID, optionally verifying user association
 * @param id - Inquiry ID
 * @param userId - Optional user ID to verify access
 * @returns Promise resolving to the inquiry or undefined
 */
export async function getInquiryById(
  id: string,
  userId?: string,
): Promise<Inquiry | undefined> {
  const [foundInquiry] = await db
    .select()
    .from(inquiry)
    .where(eq(inquiry.id, id))
    .limit(1);

  if (!foundInquiry) {
    return undefined;
  }

  // If userId provided, verify association
  if (userId && foundInquiry.userId !== userId) {
    // Could also check if user is org admin here
    return undefined;
  }

  return foundInquiry;
}
