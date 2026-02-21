import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
  inquiry,
  invoice,
  notification,
  OrgRole,
  org,
  orgUser,
  report,
  SiteRole,
  session,
  user,
  userInvoice,
  userProfile,
  userReport,
} from "@/drizzle/schema";

/**
 * Creates a test user in the database
 */
export async function createTestUser(
  overrides?: Partial<typeof user.$inferInsert>,
) {
  const [createdUser] = await db
    .insert(user)
    .values({
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      emailVerified: true,
      ...overrides,
    })
    .returning();
  return createdUser;
}

/**
 * Creates a test user profile
 */
export async function createTestUserProfile(
  userId: string,
  overrides?: Partial<typeof userProfile.$inferInsert>,
) {
  const [createdProfile] = await db
    .insert(userProfile)
    .values({
      userId,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      managed: false,
      siteRole: SiteRole.NORMAL_USER,
      ...overrides,
    })
    .returning();
  return createdProfile;
}

/**
 * Creates a test session for a user
 */
export async function createTestSession(
  userId: string,
  overrides?: Partial<typeof session.$inferInsert>,
) {
  const [createdSession] = await db
    .insert(session)
    .values({
      id: faker.string.uuid(),
      userId,
      token: faker.string.alphanumeric(64),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ...overrides,
    })
    .returning();
  return createdSession;
}

/**
 * Creates a test organization
 */
export async function createTestOrg(
  overrides?: Partial<typeof org.$inferInsert>,
) {
  const [createdOrg] = await db
    .insert(org)
    .values({
      id: faker.string.uuid(),
      name: faker.company.name(),
      contact: faker.internet.email(),
      ...overrides,
    })
    .returning();
  return createdOrg;
}

/**
 * Creates an org-user relationship
 * @param userId - User ID
 * @param orgId - Organization ID
 * @param role - Org role (default: OrgRole.ADMIN = 0)
 *   - 0 = Org Admin
 *   - 1 = Org Moderator
 *   - 2 = User/Client
 *   - 3 = Read-only/Invited
 */
export async function createTestOrgUser(
  userId: string,
  orgId: string,
  role: number = OrgRole.ADMIN,
) {
  const [createdOrgUser] = await db
    .insert(orgUser)
    .values({
      userId,
      orgId,
      role,
    })
    .returning();
  return createdOrgUser;
}

/**
 * Creates a test inquiry
 */
export async function createTestInquiry(
  orgId: string,
  overrides?: Partial<typeof inquiry.$inferInsert>,
) {
  const [createdInquiry] = await db
    .insert(inquiry)
    .values({
      id: faker.string.uuid(),
      orgId,
      userId: null,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      comment: faker.lorem.paragraph(),
      ...overrides,
    })
    .returning();
  return createdInquiry;
}

/**
 * Creates a test invoice
 */
export async function createTestInvoice(
  orgId: string,
  createdBy: string,
  overrides?: Partial<typeof invoice.$inferInsert>,
) {
  const [createdInvoice] = await db
    .insert(invoice)
    .values({
      id: faker.string.uuid(),
      orgId,
      amount: "100.00",
      status: "draft",
      dueDate: new Date(),
      periodStart: new Date(),
      periodEnd: new Date(),
      description: faker.lorem.sentence(),
      createdBy,
      ...overrides,
    })
    .returning();
  return createdInvoice;
}

/**
 * Creates a test report
 */
export async function createTestReport(
  orgId: string,
  createdBy: string,
  overrides?: Partial<typeof report.$inferInsert>,
) {
  const [createdReport] = await db
    .insert(report)
    .values({
      id: faker.string.uuid(),
      orgId,
      title: faker.lorem.sentence(),
      status: "draft",
      content: faker.lorem.paragraph(),
      periodStart: new Date(),
      periodEnd: new Date(),
      rating: null,
      createdBy,
      ...overrides,
    })
    .returning();
  return createdReport;
}

/**
 * Creates a user-invoice relationship
 */
export async function createTestUserInvoice(userId: string, invoiceId: string) {
  const [created] = await db
    .insert(userInvoice)
    .values({
      userId,
      invoiceId,
    })
    .returning();
  return created;
}

/**
 * Creates a user-report relationship
 */
export async function createTestUserReport(userId: string, reportId: string) {
  const [created] = await db
    .insert(userReport)
    .values({
      userId,
      reportId,
    })
    .returning();
  return created;
}

/**
 * Creates a test notification
 */
export async function createTestNotification(
  userId: string,
  overrides?: Partial<typeof notification.$inferInsert>,
) {
  const [created] = await db
    .insert(notification)
    .values({
      id: faker.string.uuid(),
      userId,
      type: "ownership_transfer",
      title: faker.lorem.sentence(),
      message: faker.lorem.paragraph(),
      metadata: null,
      read: false,
      createdAt: new Date(),
      ...overrides,
    })
    .returning();
  return created;
}

/**
 * Cleans up test data
 */
export async function cleanupTestData(ids: {
  userIds?: string[];
  orgIds?: string[];
  inquiryIds?: string[];
  invoiceIds?: string[];
  reportIds?: string[];
}) {
  if (ids.reportIds?.length) {
    const reportId = ids.reportIds[0];
    if (reportId) {
      await db.delete(userReport).where(eq(userReport.reportId, reportId));
      await db.delete(report).where(eq(report.id, reportId));
    }
  }
  if (ids.invoiceIds?.length) {
    const invoiceId = ids.invoiceIds[0];
    if (invoiceId) {
      await db.delete(userInvoice).where(eq(userInvoice.invoiceId, invoiceId));
      await db.delete(invoice).where(eq(invoice.id, invoiceId));
    }
  }
  if (ids.inquiryIds?.length) {
    const inquiryId = ids.inquiryIds[0];
    if (inquiryId) {
      await db.delete(inquiry).where(eq(inquiry.id, inquiryId));
    }
  }
  if (ids.orgIds?.length) {
    const orgId = ids.orgIds[0];
    if (orgId) {
      await db.delete(orgUser).where(eq(orgUser.orgId, orgId));
      await db.delete(org).where(eq(org.id, orgId));
    }
  }
  if (ids.userIds?.length) {
    const userId = ids.userIds[0];
    if (userId) {
      await db.delete(userProfile).where(eq(userProfile.userId, userId));
      await db.delete(session).where(eq(session.userId, userId));
      await db.delete(user).where(eq(user.id, userId));
    }
  }
}
