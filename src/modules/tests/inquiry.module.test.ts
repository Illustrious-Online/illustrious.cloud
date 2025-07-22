import { verifyRecaptcha } from "@/libs/recaptcha";
import * as inquiryService from "@/services/inquiry";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postInquiry } from "../inquiry";

// Mock dependencies
vi.mock("@/services/inquiry");
vi.mock("@/libs/recaptcha");
vi.mock("@/config", () => ({
  default: {
    auth: {
      supabaseServiceRoleKey: "test-service-role-key",
    },
  },
}));

describe("Inquiry Module", () => {
  const mockInquiry = {
    id: "test-inquiry-id",
    status: "pending",
    orgId: "test-org-id",
    name: "Test User",
    email: "test@example.com",
    subject: "Test Subject",
    message: "Test message",
    createdAt: new Date(),
    updatedAt: null,
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("postInquiry", () => {
    it("should create an inquiry with valid Service Role Key and reCAPTCHA token", async () => {
      // Mock successful reCAPTCHA verification
      vi.mocked(verifyRecaptcha).mockResolvedValue(true);

      // Mock successful inquiry creation
      vi.mocked(inquiryService.createInquiry).mockResolvedValue(mockInquiry);

      const context = {
        headers: {
          authorization: "Bearer test-service-role-key",
        },
        body: {
          status: "pending" as const,
          orgId: "test-org-id",
          name: "Test User",
          email: "test@example.com",
          subject: "Test Subject",
          message: "Test message",
          recaptchaToken: "valid-recaptcha-token",
        },
      };

      const result = await postInquiry(context);

      expect(result).toEqual({
        data: { id: "test-inquiry-id" },
        message: "Inquiry submitted successfully!",
      });

      expect(verifyRecaptcha).toHaveBeenCalledWith("valid-recaptcha-token");
      expect(inquiryService.createInquiry).toHaveBeenCalledWith({
        orgId: "test-org-id",
        name: "Test User",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test message",
      });
    });

    it("should throw UnauthorizedError when Service Role Key is missing", async () => {
      const context = {
        headers: {},
        body: {
          status: "pending" as const,
          orgId: "test-org-id",
          name: "Test User",
          email: "test@example.com",
          subject: "Test Subject",
          message: "Test message",
          recaptchaToken: "valid-recaptcha-token",
        },
      };

      await expect(postInquiry(context)).rejects.toThrow(
        "Service Role Key required.",
      );
    });

    it("should throw UnauthorizedError when Service Role Key is invalid", async () => {
      const context = {
        headers: {
          authorization: "Bearer invalid-key",
        },
        body: {
          status: "pending" as const,
          orgId: "test-org-id",
          name: "Test User",
          email: "test@example.com",
          subject: "Test Subject",
          message: "Test message",
          recaptchaToken: "valid-recaptcha-token",
        },
      };

      await expect(postInquiry(context)).rejects.toThrow(
        "Invalid Service Role Key.",
      );
    });

    it("should throw BadRequestError when reCAPTCHA verification fails", async () => {
      // Mock failed reCAPTCHA verification
      vi.mocked(verifyRecaptcha).mockResolvedValue(false);

      const context = {
        headers: {
          authorization: "Bearer test-service-role-key",
        },
        body: {
          status: "pending" as const,
          orgId: "test-org-id",
          name: "Test User",
          email: "test@example.com",
          subject: "Test Subject",
          message: "Test message",
          recaptchaToken: "invalid-recaptcha-token",
        },
      };

      await expect(postInquiry(context)).rejects.toThrow(
        "reCAPTCHA verification failed.",
      );
    });
  });
});
