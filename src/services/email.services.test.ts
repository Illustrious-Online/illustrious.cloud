import { beforeEach, describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { vi } from "vitest";
import type { Inquiry as InquiryType } from "@/drizzle/schema";
import { EmailService } from "./email";

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn(),
    }),
  },
}));

describe("email service", () => {
  let emailService: EmailService;
  let mockTransporter: { sendMail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.restoreAllMocks();

    // Get the mocked transporter
    const nodemailer = vi.mocked(require("nodemailer"));
    mockTransporter = {
      sendMail: vi.fn(),
    };
    nodemailer.default.createTransport.mockReturnValue(mockTransporter);

    emailService = new EmailService();
  });

  describe("sendCustomerConfirmation", () => {
    it("should send customer confirmation email successfully", async () => {
      const mockInquiry: InquiryType = {
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
      };

      const organizationName = "Acme Corporation";

      mockTransporter.sendMail.mockResolvedValue({
        messageId: "test-message-id",
      });

      await emailService.sendCustomerConfirmation(
        mockInquiry,
        organizationName,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to: mockInquiry.email,
        subject: `Thank you for your inquiry - ${organizationName}`,
        html: expect.stringContaining(organizationName),
        text: expect.stringContaining(organizationName),
      });
    });

    it("should throw error if email sending fails", async () => {
      const mockInquiry: InquiryType = {
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
      };

      const organizationName = "Acme Corporation";

      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP Error"));

      await expect(
        emailService.sendCustomerConfirmation(mockInquiry, organizationName),
      ).rejects.toThrow("Failed to send confirmation email");
    });
  });

  describe("sendOwnerNotification", () => {
    it("should send owner notification email successfully", async () => {
      const mockInquiry: InquiryType = {
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
      };

      const orgEmail = "owner@acme.com";
      const organizationName = "Acme Corporation";

      mockTransporter.sendMail.mockResolvedValue({
        messageId: "test-message-id",
      });

      await emailService.sendOwnerNotification(
        mockInquiry,
        orgEmail,
        organizationName,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to: orgEmail,
        subject: `New Inquiry: ${mockInquiry.service} - ${mockInquiry.name}`,
        html: expect.stringContaining(mockInquiry.name),
        text: expect.stringContaining(mockInquiry.name),
      });
    });

    it("should throw error if email sending fails", async () => {
      const mockInquiry: InquiryType = {
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
      };

      const orgEmail = "owner@acme.com";
      const organizationName = "Acme Corporation";

      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP Error"));

      await expect(
        emailService.sendOwnerNotification(
          mockInquiry,
          orgEmail,
          organizationName,
        ),
      ).rejects.toThrow("Failed to send notification email");
    });
  });

  describe("email template generation", () => {
    it("should generate customer email with organization name", () => {
      const mockInquiry: InquiryType = {
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
      };

      const organizationName = "Test Organization";

      // Access private method through type assertion for testing
      const emailService = new EmailService() as EmailService & {
        generateCustomerEmailHTML: (
          inquiry: InquiryType,
          organizationName: string,
        ) => string;
        generateCustomerEmailText: (
          inquiry: InquiryType,
          organizationName: string,
        ) => string;
      };
      const htmlContent = emailService.generateCustomerEmailHTML(
        mockInquiry,
        organizationName,
      );
      const textContent = emailService.generateCustomerEmailText(
        mockInquiry,
        organizationName,
      );

      expect(htmlContent).toContain(organizationName);
      expect(htmlContent).toContain(mockInquiry.name);
      expect(htmlContent).toContain(mockInquiry.service);
      expect(htmlContent).toContain(mockInquiry.message);

      expect(textContent).toContain(organizationName);
      expect(textContent).toContain(mockInquiry.name);
      expect(textContent).toContain(mockInquiry.service);
      expect(textContent).toContain(mockInquiry.message);
    });

    it("should generate owner email with organization name", () => {
      const mockInquiry: InquiryType = {
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
      };

      const organizationName = "Test Organization";

      // Access private method through type assertion for testing
      const emailService = new EmailService() as EmailService & {
        generateCustomerEmailHTML: (
          inquiry: InquiryType,
          organizationName: string,
        ) => string;
        generateCustomerEmailText: (
          inquiry: InquiryType,
          organizationName: string,
        ) => string;
      };
      const htmlContent = emailService.generateOwnerEmailHTML(
        mockInquiry,
        organizationName,
      );
      const textContent = emailService.generateOwnerEmailText(
        mockInquiry,
        organizationName,
      );

      expect(htmlContent).toContain(mockInquiry.name);
      expect(htmlContent).toContain(mockInquiry.email);
      expect(htmlContent).toContain(mockInquiry.phone);
      expect(htmlContent).toContain(mockInquiry.service);
      expect(htmlContent).toContain(mockInquiry.message);

      expect(textContent).toContain(mockInquiry.name);
      expect(textContent).toContain(mockInquiry.email);
      expect(textContent).toContain(mockInquiry.phone);
      expect(textContent).toContain(mockInquiry.service);
      expect(textContent).toContain(mockInquiry.message);
    });
  });
});
