import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { inquiry, org, user } from "@/drizzle/schema";
import { NotFoundError } from "@/plugins/error";
import {
  createInquiry,
  getInquiryById,
  getUserInquiries,
} from "../inquiry/service";

describe("Inquiry Module", () => {
  let testOrg: typeof org.$inferSelect;
  let testUser: typeof user.$inferSelect;
  let testInquiry: typeof inquiry.$inferSelect;

  beforeAll(async () => {
    // Create test org
    const [createdOrg] = await db
      .insert(org)
      .values({
        id: faker.string.uuid(),
        name: "Test Org",
        contact: faker.internet.email(),
      })
      .returning();
    testOrg = createdOrg;

    // Create test user (using new better-auth schema)
    const [createdUser] = await db
      .insert(user)
      .values({
        id: faker.string.uuid(),
        email: faker.internet.email(),
        name: "Test User",
        emailVerified: true,
      })
      .returning();
    testUser = createdUser;
  });

  afterAll(async () => {
    if (testInquiry) {
      await db.delete(inquiry).where(eq(inquiry.id, testInquiry.id));
    }
    if (testUser) {
      await db.delete(user).where(eq(user.id, testUser.id));
    }
    if (testOrg) {
      await db.delete(org).where(eq(org.id, testOrg.id));
    }
  });

  describe("createInquiry", () => {
    it("should create inquiry without user association", async () => {
      const created = await createInquiry(
        {
          orgId: testOrg.id,
          name: "Test Inquirer",
          email: faker.internet.email(),
          phone: "123-456-7890",
          comment: "Test inquiry comment",
        },
        undefined,
      );

      testInquiry = created;

      expect(testInquiry).toBeTruthy();
      expect(testInquiry.orgId).toBe(testOrg.id);
      expect(testInquiry.name).toBe("Test Inquirer");
      expect(testInquiry.userId).toBeNull();
    });

    it("should create inquiry with user association", async () => {
      const created = await createInquiry(
        {
          orgId: testOrg.id,
          name: "Test User",
          email: faker.internet.email(),
          comment: "Test inquiry with user",
        },
        testUser.id,
      );

      expect(created.userId).toBe(testUser.id);

      // Cleanup
      await db.delete(inquiry).where(eq(inquiry.id, created.id));
    });

    it("should throw error for non-existent org", async () => {
      await expect(
        createInquiry(
          {
            orgId: faker.string.uuid(),
            name: "Test",
            email: faker.internet.email(),
            comment: "Test",
          },
          undefined,
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getUserInquiries", () => {
    it("should fetch inquiries for a user", async () => {
      // Create inquiry with user association
      const created = await createInquiry(
        {
          orgId: testOrg.id,
          name: "Test",
          email: faker.internet.email(),
          comment: "Test",
        },
        testUser.id,
      );

      const inquiries = await getUserInquiries(testUser.id);
      expect(inquiries.length).toBeGreaterThan(0);
      expect(inquiries.some((i) => i.id === created.id)).toBe(true);

      // Cleanup
      await db.delete(inquiry).where(eq(inquiry.id, created.id));
    });
  });

  describe("getInquiryById", () => {
    it("should fetch inquiry by ID", async () => {
      const found = await getInquiryById(testInquiry.id);
      expect(found).toBeTruthy();
      expect(found?.id).toBe(testInquiry.id);
    });

    it("should return undefined for non-existent inquiry", async () => {
      const found = await getInquiryById(faker.string.uuid());
      expect(found).toBeUndefined();
    });
  });
});
