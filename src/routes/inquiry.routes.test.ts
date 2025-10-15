import { beforeEach, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { vi } from "vitest";
import inquiryRoutes from "./inquiry";

// Mock the inquiry module
vi.mock("@/modules/inquiry", () => ({
  createInquiry: vi.fn(),
  getInquiryById: vi.fn(),
  getInquiries: vi.fn(),
  updateInquiry: vi.fn(),
  deleteInquiry: vi.fn(),
}));

describe("inquiry routes", () => {
  let app: Elysia;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = new Elysia().use(inquiryRoutes);
  });

  describe("POST /inquiry", () => {
    it("should create inquiry with valid data", async () => {
      const mockInquiry = {
        id: "test-id",
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

      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "createInquiry").mockResolvedValue({
        data: mockInquiry,
        message: "Inquiry created successfully",
      });

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-Id": "test-org-id",
          },
          body: JSON.stringify({
            name: "John Doe",
            email: "john@example.com",
            phone: "555-1234",
            service: "Web Development",
            message: "I need help with my website",
            recaptchaToken: "test-token",
          }),
        }),
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe("Inquiry created successfully");
      expect(data.data).toEqual(mockInquiry);
    });

    it("should return 400 for invalid data", async () => {
      const response = await app.handle(
        new Request("http://localhost:3000/inquiry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-Id": "test-org-id",
          },
          body: JSON.stringify({
            name: "J", // Too short
            email: "invalid-email",
            phone: "",
            service: "",
            message: "Too short",
            recaptchaToken: "",
          }),
        }),
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 if organization ID is missing", async () => {
      const response = await app.handle(
        new Request("http://localhost:3000/inquiry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "John Doe",
            email: "john@example.com",
            phone: "555-1234",
            service: "Web Development",
            message: "I need help with my website",
            recaptchaToken: "test-token",
          }),
        }),
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /inquiry/:id", () => {
    it("should return inquiry by ID", async () => {
      const mockInquiry = {
        id: "test-id",
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

      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "getInquiryById").mockResolvedValue({
        data: mockInquiry,
        message: "Inquiry retrieved successfully",
      });

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry/test-id", {
          method: "GET",
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Inquiry retrieved successfully");
      expect(data.data).toEqual(mockInquiry);
    });

    it("should return 404 for non-existent inquiry", async () => {
      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "getInquiryById").mockRejectedValue(
        new Error("Inquiry not found"),
      );

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry/non-existent-id", {
          method: "GET",
        }),
      );

      expect(response.status).toBe(500);
    });
  });

  describe("GET /inquiry", () => {
    it("should return list of inquiries", async () => {
      const mockInquiries = [
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

      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "getInquiries").mockResolvedValue({
        data: mockInquiries,
        message: "Inquiries retrieved successfully",
      });

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry", {
          method: "GET",
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Inquiries retrieved successfully");
      expect(data.data).toEqual(mockInquiries);
    });

    it("should handle query parameters", async () => {
      const mockInquiries: unknown[] = [];

      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "getInquiries").mockResolvedValue({
        data: mockInquiries,
        message: "Inquiries retrieved successfully",
      });

      const response = await app.handle(
        new Request(
          "http://localhost:3000/inquiry?page=2&limit=5&service=Web%20Development",
          {
            method: "GET",
          },
        ),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Inquiries retrieved successfully");
    });
  });

  describe("PUT /inquiry/:id", () => {
    it("should update inquiry successfully", async () => {
      const mockUpdatedInquiry = {
        id: "test-id",
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

      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "updateInquiry").mockResolvedValue({
        data: mockUpdatedInquiry,
        message: "Inquiry updated successfully",
      });

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry/test-id", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "John Doe Updated",
            email: "john.updated@example.com",
            phone: "555-9999",
            service: "Mobile Development",
            message: "Updated message",
          }),
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Inquiry updated successfully");
      expect(data.data).toEqual(mockUpdatedInquiry);
    });

    it("should return 404 for non-existent inquiry", async () => {
      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "updateInquiry").mockRejectedValue(
        new Error("Inquiry not found"),
      );

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry/non-existent-id", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Updated Name",
          }),
        }),
      );

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /inquiry/:id", () => {
    it("should delete inquiry successfully", async () => {
      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "deleteInquiry").mockResolvedValue({
        data: null,
        message: "Inquiry deleted successfully",
      });

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry/test-id", {
          method: "DELETE",
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Inquiry deleted successfully");
      expect(data.data).toBeNull();
    });

    it("should return 404 for non-existent inquiry", async () => {
      const inquiryModule = await import("@/modules/inquiry");
      vi.spyOn(inquiryModule, "deleteInquiry").mockRejectedValue(
        new Error("Inquiry not found"),
      );

      const response = await app.handle(
        new Request("http://localhost:3000/inquiry/non-existent-id", {
          method: "DELETE",
        }),
      );

      expect(response.status).toBe(500);
    });
  });
});
