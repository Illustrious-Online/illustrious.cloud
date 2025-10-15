import { beforeEach, describe, expect, it } from "bun:test";
import type { Context } from "elysia";
import { vi } from "vitest";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import ServerError from "@/domain/exceptions/ServerError";
import type { Inquiry as InquiryType } from "@/drizzle/schema";
import {
  createInquiry,
  deleteInquiry,
  getInquiries,
  getInquiryById,
  updateInquiry,
} from "../inquiry";

// Mock the database connection
vi.mock("@/drizzle/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the email service
vi.mock("@/services/email", () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendCustomerConfirmation: vi.fn(),
    sendOwnerNotification: vi.fn(),
  })),
}));

// Mock axios for reCAPTCHA
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

const defaultContext: Context = {} as Context;

describe("inquiry module", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createInquiry", () => {
    it("should throw BadRequestError if organization ID is not provided", async () => {
      const context = { ...defaultContext, body: {}, headers: {} };

      await expect(createInquiry(context)).rejects.toThrow(BadRequestError);
    });

    it("should create inquiry successfully with valid data", async () => {
      const mockInquiry: InquiryType = {
        id: "test-inquiry-id",
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

      const context = {
        ...defaultContext,
        body: {
          name: "John Doe",
          email: "john@example.com",
          phone: "555-1234",
          service: "Web Development",
          message: "I need help with my website",
          recaptchaToken: "test-token",
        },
        headers: { "x-org-id": "test-org-id" },
      };

      // Mock the inquiry service
      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "createInquiry").mockResolvedValue(mockInquiry);

      const response = await createInquiry(context);

      expect(response).toEqual({
        data: mockInquiry,
        message: "Inquiry created successfully",
      });
      expect(inquiryService.createInquiry).toHaveBeenCalledWith(
        context.body,
        "test-org-id",
      );
    });

    it("should handle case-insensitive organization ID header", async () => {
      const mockInquiry: InquiryType = {
        id: "test-inquiry-id",
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

      const context = {
        ...defaultContext,
        body: {
          name: "John Doe",
          email: "john@example.com",
          phone: "555-1234",
          service: "Web Development",
          message: "I need help with my website",
          recaptchaToken: "test-token",
        },
        headers: { "X-Org-Id": "test-org-id" }, // Capital X
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "createInquiry").mockResolvedValue(mockInquiry);

      const response = await createInquiry(context);

      expect(response).toEqual({
        data: mockInquiry,
        message: "Inquiry created successfully",
      });
      expect(inquiryService.createInquiry).toHaveBeenCalledWith(
        context.body,
        "test-org-id",
      );
    });
  });

  describe("getInquiryById", () => {
    it("should return inquiry if found", async () => {
      const mockInquiry: InquiryType = {
        id: "test-inquiry-id",
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

      const context = {
        ...defaultContext,
        params: { id: "test-inquiry-id" },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "getInquiryById").mockResolvedValue(mockInquiry);

      const response = await getInquiryById(context);

      expect(response).toEqual({
        data: mockInquiry,
        message: "Inquiry retrieved successfully",
      });
      expect(inquiryService.getInquiryById).toHaveBeenCalledWith(
        "test-inquiry-id",
      );
    });

    it("should throw ServerError if inquiry not found", async () => {
      const context = {
        ...defaultContext,
        params: { id: "non-existent-id" },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "getInquiryById").mockResolvedValue(null);

      await expect(getInquiryById(context)).rejects.toThrow(ServerError);
      expect(inquiryService.getInquiryById).toHaveBeenCalledWith(
        "non-existent-id",
      );
    });
  });

  describe("getInquiries", () => {
    it("should return list of inquiries", async () => {
      const mockInquiries: InquiryType[] = [
        {
          id: "inquiry-1",
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
        {
          id: "inquiry-2",
          name: "Jane Smith",
          email: "jane@example.com",
          phone: "555-5678",
          service: "Mobile Development",
          message: "I need help with my mobile app",
          recaptchaToken: "test-token-2",
          createdAt: new Date(),
          updatedAt: null,
          deletedAt: null,
        },
      ];

      const context = {
        ...defaultContext,
        query: { page: "1", limit: "10" },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "getInquiries").mockResolvedValue(mockInquiries);

      const response = await getInquiries(context);

      expect(response).toEqual({
        data: mockInquiries,
        message: "Inquiries retrieved successfully",
      });
      expect(inquiryService.getInquiries).toHaveBeenCalledWith(context.query);
    });

    it("should handle query parameters correctly", async () => {
      const mockInquiries: InquiryType[] = [];

      const context = {
        ...defaultContext,
        query: {
          page: "2",
          limit: "5",
          orgId: "test-org",
          service: "Web Development",
          email: "john@example.com",
        },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "getInquiries").mockResolvedValue(mockInquiries);

      const response = await getInquiries(context);

      expect(response).toEqual({
        data: mockInquiries,
        message: "Inquiries retrieved successfully",
      });
      expect(inquiryService.getInquiries).toHaveBeenCalledWith(context.query);
    });
  });

  describe("updateInquiry", () => {
    it("should update inquiry successfully", async () => {
      const mockUpdatedInquiry: InquiryType = {
        id: "test-inquiry-id",
        name: "John Doe Updated",
        email: "john.updated@example.com",
        phone: "555-9999",
        service: "Mobile Development",
        message: "Updated message",
        recaptchaToken: "test-token",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const context = {
        ...defaultContext,
        params: { id: "test-inquiry-id" },
        body: {
          name: "John Doe Updated",
          email: "john.updated@example.com",
          phone: "555-9999",
          service: "Mobile Development",
          message: "Updated message",
        },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "updateInquiry").mockResolvedValue(
        mockUpdatedInquiry,
      );

      const response = await updateInquiry(context);

      expect(response).toEqual({
        data: mockUpdatedInquiry,
        message: "Inquiry updated successfully",
      });
      expect(inquiryService.updateInquiry).toHaveBeenCalledWith(
        "test-inquiry-id",
        context.body,
      );
    });

    it("should throw ServerError if inquiry not found for update", async () => {
      const context = {
        ...defaultContext,
        params: { id: "non-existent-id" },
        body: { name: "Updated Name" },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "updateInquiry").mockResolvedValue(null);

      await expect(updateInquiry(context)).rejects.toThrow(ServerError);
      expect(inquiryService.updateInquiry).toHaveBeenCalledWith(
        "non-existent-id",
        context.body,
      );
    });
  });

  describe("deleteInquiry", () => {
    it("should delete inquiry successfully", async () => {
      const context = {
        ...defaultContext,
        params: { id: "test-inquiry-id" },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "deleteInquiry").mockResolvedValue(true);

      const response = await deleteInquiry(context);

      expect(response).toEqual({
        data: null,
        message: "Inquiry deleted successfully",
      });
      expect(inquiryService.deleteInquiry).toHaveBeenCalledWith(
        "test-inquiry-id",
      );
    });

    it("should throw ServerError if inquiry not found for deletion", async () => {
      const context = {
        ...defaultContext,
        params: { id: "non-existent-id" },
      };

      const inquiryService = await import("@/services/inquiry");
      vi.spyOn(inquiryService, "deleteInquiry").mockResolvedValue(false);

      await expect(deleteInquiry(context)).rejects.toThrow(ServerError);
      expect(inquiryService.deleteInquiry).toHaveBeenCalledWith(
        "non-existent-id",
      );
    });
  });
});
