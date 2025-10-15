import { beforeEach, describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { vi } from "vitest";
import type {
  CreateInquiryInput,
  UpdateInquiryInput,
} from "@/domain/interfaces/inquiries";
import type { Inquiry as InquiryType } from "@/drizzle/schema";
import {
  createInquiry,
  deleteInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
} from "./inquiry";

// Mock the database and email service
vi.mock("@/drizzle/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/services/email", () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendCustomerConfirmation: vi.fn(),
    sendOwnerNotification: vi.fn(),
  })),
}));

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("inquiry service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createInquiry", () => {
    it("should create inquiry successfully", async () => {
      const mockInquiryData: CreateInquiryInput = {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        service: "Web Development",
        message: "I need help with my website",
        recaptchaToken: "test-token",
      };

      const mockInquiry: InquiryType = {
        id: faker.string.uuid(),
        name: mockInquiryData.name,
        email: mockInquiryData.email,
        phone: mockInquiryData.phone ?? null,
        service: mockInquiryData.service,
        message: mockInquiryData.message,
        recaptchaToken: mockInquiryData.recaptchaToken,
        createdAt: new Date(),
        updatedAt: null,
        deletedAt: null,
      };

      const orgId = "test-org-id";

      // Mock reCAPTCHA verification
      const axios = await import("axios");
      vi.spyOn(axios.default, "post").mockResolvedValue({
        data: { success: true },
      });

      // Mock database operations
      const { db } = await import("@/drizzle/db");
      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]), // No existing org
          }),
        }),
      });
      const mockDbInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInquiry]),
        }),
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockDbSelect);
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockDbInsert);

      const result = await createInquiry(mockInquiryData, orgId);

      expect(result).toEqual(mockInquiry);
      expect(axios.default.post).toHaveBeenCalledWith(
        "https://www.google.com/recaptcha/api/siteverify",
        expect.any(URLSearchParams),
        expect.any(Object),
      );
    });

    it("should throw error if reCAPTCHA verification fails", async () => {
      const mockInquiryData: CreateInquiryInput = {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        service: "Web Development",
        message: "I need help with my website",
        recaptchaToken: "invalid-token",
      };

      const orgId = "test-org-id";

      // Mock reCAPTCHA verification failure
      const axios = await import("axios");
      vi.spyOn(axios.default, "post").mockResolvedValue({
        data: { success: false },
      });

      await expect(createInquiry(mockInquiryData, orgId)).rejects.toThrow(
        "reCAPTCHA verification failed",
      );
    });

    it("should create default organization if not found", async () => {
      const mockInquiryData: CreateInquiryInput = {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        service: "Web Development",
        message: "I need help with my website",
        recaptchaToken: "test-token",
      };

      const mockInquiry: InquiryType = {
        id: faker.string.uuid(),
        name: mockInquiryData.name,
        email: mockInquiryData.email,
        phone: mockInquiryData.phone ?? null,
        service: mockInquiryData.service,
        message: mockInquiryData.message,
        recaptchaToken: mockInquiryData.recaptchaToken,
        createdAt: new Date(),
        updatedAt: null,
        deletedAt: null,
      };

      const orgId = "non-existent-org";

      // Mock reCAPTCHA verification
      const axios = await import("axios");
      vi.spyOn(axios.default, "post").mockResolvedValue({
        data: { success: true },
      });

      // Mock database operations - no existing org
      const { db } = await import("@/drizzle/db");
      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]), // No existing org
          }),
        }),
      });
      const mockDbInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInquiry]),
        }),
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockDbSelect);
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockDbInsert);

      const result = await createInquiry(mockInquiryData, orgId);

      expect(result).toEqual(mockInquiry);
      // Should create default organization
      expect(db.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: orgId,
          name: "Default Organization",
        }),
      );
    });
  });

  describe("getInquiryById", () => {
    it("should return inquiry if found", async () => {
      const inquiryId = faker.string.uuid();
      const mockInquiry: InquiryType = {
        id: inquiryId,
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        service: "Web Development",
        message: "I need help with my website",
        recaptchaToken: "test-token",
        createdAt: new Date(),
        updatedAt: null,
        deletedAt: null,
      };

      const { db } = await import("@/drizzle/db");
      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockInquiry]),
          }),
        }),
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockDbSelect);

      const result = await getInquiryById(inquiryId);

      expect(result).toEqual(mockInquiry);
    });

    it("should return null if inquiry not found", async () => {
      const inquiryId = "non-existent-id";

      const { db } = await import("@/drizzle/db");
      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]),
          }),
        }),
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockDbSelect);

      const result = await getInquiryById(inquiryId);

      expect(result).toBeNull();
    });
  });

  describe("getInquiries", () => {
    it("should return inquiries with default pagination", async () => {
      const mockInquiries: InquiryType[] = [
        {
          id: faker.string.uuid(),
          name: "John Doe",
          email: "john@example.com",
          phone: "555-1234",
          service: "Web Development",
          message: "I need help with my website",
          recaptchaToken: "test-token",
          createdAt: new Date(),
          updatedAt: null,
          deletedAt: null,
        },
      ];

      const { db } = await import("@/drizzle/db");
      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockInquiries),
              }),
            }),
          }),
        }),
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockDbSelect);

      const result = await getInquiries({});

      expect(result).toEqual(mockInquiries);
    });

    it("should handle query filters correctly", async () => {
      const mockInquiries: InquiryType[] = [];

      const { db } = await import("@/drizzle/db");
      const mockDbSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockInquiries),
              }),
            }),
          }),
        }),
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockDbSelect);

      const query = {
        page: 2,
        limit: 5,
        orgId: "test-org",
        service: "Web Development",
        email: "john@example.com",
      };

      const result = await getInquiries(query);

      expect(result).toEqual(mockInquiries);
    });
  });

  describe("updateInquiry", () => {
    it("should update inquiry successfully", async () => {
      const inquiryId = faker.string.uuid();
      const updateData: UpdateInquiryInput = {
        name: "John Doe Updated",
        email: "john.updated@example.com",
      };

      const mockUpdatedInquiry: InquiryType = {
        id: inquiryId,
        name: "John Doe Updated",
        email: "john.updated@example.com",
        phone: "555-1234",
        service: "Web Development",
        message: "I need help with my website",
        recaptchaToken: "test-token",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const { db } = await import("@/drizzle/db");
      const mockDbUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedInquiry]),
          }),
        }),
      });

      (db.update as ReturnType<typeof vi.fn>).mockImplementation(mockDbUpdate);

      const result = await updateInquiry(inquiryId, updateData);

      expect(result).toEqual(mockUpdatedInquiry);
    });

    it("should return null if inquiry not found", async () => {
      const inquiryId = "non-existent-id";
      const updateData: UpdateInquiryInput = {
        name: "John Doe Updated",
      };

      const { db } = await import("@/drizzle/db");
      const mockDbUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([null]),
          }),
        }),
      });

      (db.update as ReturnType<typeof vi.fn>).mockImplementation(mockDbUpdate);

      const result = await updateInquiry(inquiryId, updateData);

      expect(result).toBeNull();
    });
  });

  describe("deleteInquiry", () => {
    it("should soft delete inquiry successfully", async () => {
      const inquiryId = faker.string.uuid();
      const mockDeletedInquiry: InquiryType = {
        id: inquiryId,
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        service: "Web Development",
        message: "I need help with my website",
        recaptchaToken: "test-token",
        createdAt: new Date(),
        updatedAt: null,
        deletedAt: new Date(),
      };

      const { db } = await import("@/drizzle/db");
      const mockDbUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockDeletedInquiry]),
          }),
        }),
      });

      (db.update as ReturnType<typeof vi.fn>).mockImplementation(mockDbUpdate);

      const result = await deleteInquiry(inquiryId);

      expect(result).toBe(true);
    });

    it("should return false if inquiry not found", async () => {
      const inquiryId = "non-existent-id";

      const { db } = await import("@/drizzle/db");
      const mockDbUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([null]),
          }),
        }),
      });

      (db.update as ReturnType<typeof vi.fn>).mockImplementation(mockDbUpdate);

      const result = await deleteInquiry(inquiryId);

      expect(result).toBe(false);
    });
  });
});
