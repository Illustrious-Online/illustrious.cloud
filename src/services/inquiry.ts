import axios from "axios";
import { and, desc, eq, isNull, like } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import config from "../config";
import type {
  CreateInquiryInput,
  InquiryQuery,
  UpdateInquiryInput,
} from "../domain/interfaces/inquiries";
import { db } from "../drizzle/db";
import type { Inquiry, InsertInquiry } from "../drizzle/schema";
import { inquiry, org, orgInquiry } from "../drizzle/schema";
import { EmailService } from "./email";

// Create email service instance
const emailService = new EmailService();

/**
 * Verifies a reCAPTCHA token with Google's API.
 * @param token - The reCAPTCHA token to verify.
 * @returns Promise resolving to true if valid, false otherwise.
 */
async function verifyRecaptchaToken(token: string): Promise<boolean> {
  try {
    const secretKey = config.recaptcha.secretKey;

    if (!secretKey) {
      console.warn(
        "RECAPTCHA_SECRET_KEY not configured, skipping verification",
      );
      return true; // Allow in development if not configured
    }

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return response.data.success === true;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

/**
 * Creates a new inquiry and sends notification emails.
 * @param inquiryData - The inquiry data to create.
 * @param orgId - The organization ID to associate with the inquiry.
 * @returns Promise resolving to the created inquiry.
 */
export async function createInquiry(
  inquiryData: CreateInquiryInput,
  orgId: string,
): Promise<Inquiry> {
  // Verify reCAPTCHA token first
  const isRecaptchaValid = await verifyRecaptchaToken(
    inquiryData.recaptchaToken,
  );

  if (!isRecaptchaValid) {
    throw new Error("reCAPTCHA verification failed");
  }

  const inquiryId = uuidv4();
  const now = new Date();

  // Create the inquiry record
  const newInquiry: InsertInquiry = {
    id: inquiryId,
    name: inquiryData.name,
    email: inquiryData.email,
    phone: inquiryData.phone,
    service: inquiryData.service,
    message: inquiryData.message,
    recaptchaToken: inquiryData.recaptchaToken,
    createdAt: now,
  };

  try {
    // Get organization details for email, create default if not found
    let [organization] = await db
      .select()
      .from(org)
      .where(eq(org.id, orgId))
      .limit(1);

    if (!organization) {
      // Create a default organization if it doesn't exist
      const defaultOrg = {
        id: orgId,
        name: "Default Organization",
        contact: config.email.user,
      };

      await db.insert(org).values(defaultOrg);
      organization = defaultOrg;
    }

    // Insert inquiry into database
    const [createdInquiry] = await db
      .insert(inquiry)
      .values(newInquiry)
      .returning();

    // Create organization-inquiry relationship
    await db.insert(orgInquiry).values({
      orgId,
      inquiryId,
    });

    // Send emails asynchronously (don't wait for them)
    sendInquiryEmails(
      createdInquiry,
      organization?.contact || config.email.user,
      organization?.name || "Default Organization",
    ).catch((error) => {
      console.error("Failed to send inquiry emails:", error);
      // Don't throw here as the inquiry was already created successfully
    });

    return createdInquiry;
  } catch (error) {
    console.error("Failed to create inquiry:", error);
    throw new Error("Failed to create inquiry");
  }
}

/**
 * Retrieves an inquiry by its ID.
 * @param id - The inquiry ID.
 * @returns Promise resolving to the inquiry or null if not found.
 */
export async function getInquiryById(id: string): Promise<Inquiry | null> {
  try {
    const [result] = await db
      .select()
      .from(inquiry)
      .where(and(eq(inquiry.id, id), isNull(inquiry.deletedAt)))
      .limit(1);

    return result || null;
  } catch (error) {
    console.error("Failed to get inquiry by ID:", error);
    throw new Error("Failed to retrieve inquiry");
  }
}

/**
 * Retrieves inquiries with optional filtering and pagination.
 * @param query - Query parameters for filtering and pagination.
 * @returns Promise resolving to an array of inquiries.
 */
export async function getInquiries(query: InquiryQuery): Promise<Inquiry[]> {
  try {
    const { page = 1, limit = 10, orgId, service, email } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [isNull(inquiry.deletedAt)];

    if (orgId) {
      // Join with orgInquiry to filter by organization
      const orgInquiries = await db
        .select({ inquiryId: orgInquiry.inquiryId })
        .from(orgInquiry)
        .where(eq(orgInquiry.orgId, orgId));

      const inquiryIds = orgInquiries.map((oi) => oi.inquiryId);
      if (inquiryIds.length > 0) {
        conditions.push(eq(inquiry.id, inquiryIds[0])); // This needs to be fixed for multiple IDs
      }
    }

    if (service) {
      conditions.push(like(inquiry.service, `%${service}%`));
    }

    if (email) {
      conditions.push(like(inquiry.email, `%${email}%`));
    }

    const results = await db
      .select()
      .from(inquiry)
      .where(and(...conditions))
      .orderBy(desc(inquiry.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  } catch (error) {
    console.error("Failed to get inquiries:", error);
    throw new Error("Failed to retrieve inquiries");
  }
}

/**
 * Updates an inquiry.
 * @param id - The inquiry ID.
 * @param updateData - The data to update.
 * @returns Promise resolving to the updated inquiry or null if not found.
 */
export async function updateInquiry(
  id: string,
  updateData: UpdateInquiryInput,
): Promise<Inquiry | null> {
  try {
    const updateFields = {
      ...updateData,
      updatedAt: new Date(),
    };

    const [updatedInquiry] = await db
      .update(inquiry)
      .set(updateFields)
      .where(and(eq(inquiry.id, id), isNull(inquiry.deletedAt)))
      .returning();

    return updatedInquiry || null;
  } catch (error) {
    console.error("Failed to update inquiry:", error);
    throw new Error("Failed to update inquiry");
  }
}

/**
 * Soft deletes an inquiry.
 * @param id - The inquiry ID.
 * @returns Promise resolving to true if deleted, false if not found.
 */
export async function deleteInquiry(id: string): Promise<boolean> {
  try {
    const [deletedInquiry] = await db
      .update(inquiry)
      .set({ deletedAt: new Date() })
      .where(and(eq(inquiry.id, id), isNull(inquiry.deletedAt)))
      .returning();

    return !!deletedInquiry;
  } catch (error) {
    console.error("Failed to delete inquiry:", error);
    throw new Error("Failed to delete inquiry");
  }
}

/**
 * Sends inquiry-related emails.
 * @param inquiry - The inquiry data.
 * @param orgEmail - The organization's email address.
 * @param organizationName - The name of the organization.
 */
async function sendInquiryEmails(
  inquiry: Inquiry,
  orgEmail: string,
  organizationName: string,
): Promise<void> {
  try {
    // Send confirmation email to customer
    await emailService.sendCustomerConfirmation(inquiry, organizationName);

    // Send notification email to organization
    await emailService.sendOwnerNotification(
      inquiry,
      orgEmail,
      organizationName,
    );
  } catch (error) {
    console.error("Failed to send inquiry emails:", error);
    throw error;
  }
}
