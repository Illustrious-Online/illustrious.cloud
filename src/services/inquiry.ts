import ConflictError from "@/domain/exceptions/ConflictError";
import ServerError from "@/domain/exceptions/ServerError";
import type {
  CreateInquiry,
  UpdateInquiry,
} from "@/domain/interfaces/inquiries";
import { db } from "@/drizzle/db";
import { inquiry, org, orgInquiry } from "@/drizzle/schema";
import { sendMail } from "@/libs/mailer";
import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { v4 as uuidv4 } from "uuid";

/**
 * Creates a new inquiry in the database and sends a notification email to the organization contact.
 *
 * @param payload - The inquiry data to create.
 * @returns A promise that resolves to the created inquiry.
 * @throws {ConflictError} If the inquiry creation fails.
 * @throws {ServerError} If the email sending fails.
 */
export async function createInquiry(payload: CreateInquiry) {
  const { orgId, name, email, subject, message } = payload;

  // Verify the organization exists and get contact email
  const orgResult = await db.select().from(org).where(eq(org.id, orgId));

  if (orgResult.length === 0) {
    throw new ConflictError("Organization not found.");
  }

  const orgData = orgResult[0];
  const inquiryId = uuidv4();

  // Create the inquiry
  const result = await db
    .insert(inquiry)
    .values({
      id: inquiryId,
      orgId,
      name,
      email,
      subject,
      message,
      status: "pending",
      createdAt: new Date(),
    })
    .returning();

  await db.insert(orgInquiry).values({
    orgId,
    inquiryId,
  });

  if (result.length === 0) {
    throw new ConflictError("Failed to create the inquiry.");
  }

  // Send notification email to org contact
  try {
    await sendMail({
      to: orgData.contact,
      subject: `New Inquiry: ${subject}`,
      text: `
New inquiry received for ${orgData.name}:

From: ${name} (${email})
Subject: ${subject}

Message:
${message}

---
This inquiry was submitted through the Illustrious Cloud platform.
      `,
      html: `
        <h2>New Inquiry Received</h2>
        <p><strong>Organization:</strong> ${orgData.name}</p>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr>
        <p><em>This inquiry was submitted through the Illustrious Cloud platform.</em></p>
      `,
    });
  } catch (error) {
    // Log the error but don't fail the inquiry creation
    console.error("Failed to send inquiry notification email:", error);
    // Optionally, you could throw a ServerError here if email delivery is critical
  }

  return result[0];
}

// Fetch an inquiry by its ID
export async function fetchInquiry(id: string) {
  const data = await db.select().from(inquiry).where(eq(inquiry.id, id));
  if (data.length === 0) {
    throw new NotFoundError("Inquiry not found.");
  }
  return data[0];
}

// Update an inquiry's status by its ID
export async function updateInquiry(payload: UpdateInquiry) {
  const { id, status } = payload;
  const found = await db.select().from(inquiry).where(eq(inquiry.id, id));
  if (found.length === 0) {
    throw new NotFoundError("Inquiry not found.");
  }
  const result = await db
    .update(inquiry)
    .set({ status, updatedAt: new Date() })
    .where(eq(inquiry.id, id))
    .returning();
  if (result.length === 0) {
    throw new ServerError("Failed to update the inquiry.", 503);
  }
  return result[0];
}

// Remove an inquiry by its ID
export async function removeInquiry(id: string): Promise<void> {
  await db.delete(orgInquiry).where(eq(orgInquiry.inquiryId, id));
  await db.delete(inquiry).where(eq(inquiry.id, id));
}
