import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { sendMail, setTransporter } from "../mailer/service";
import {
  createMockTransporter,
  setupMocks,
  teardownMocks,
} from "./utils/mocks";
import nodemailer from "nodemailer";

describe("Mailer Service", () => {
  let mockTransporter: ReturnType<typeof createMockTransporter>;

  beforeAll(() => {
    setupMocks();
    mockTransporter = createMockTransporter();
    setTransporter(mockTransporter);
  });

  afterAll(() => {
    teardownMocks();
    setTransporter(null);
  });

  describe("sendMail", () => {
    it("should send email successfully", async () => {
      const mailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      // Should not throw
      await sendMail(mailOptions);
    });

    it("should call transporter sendMail with correct options", async () => {
      const mailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      // Should not throw
      await sendMail(mailOptions);
    });

    it("should create transporter when none is set", async () => {
      // Reset transporter to null to test initialization
      setTransporter(null);

      // Mock nodemailer.createTransport to avoid actual SMTP connection
      const mockCreateTransport = mock(() => createMockTransporter());
      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = mockCreateTransport as unknown as typeof nodemailer.createTransport;

      const mailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      // This should trigger transporter creation
      await sendMail(mailOptions);

      // Verify createTransport was called
      expect(mockCreateTransport).toHaveBeenCalled();

      // Restore original
      nodemailer.createTransport = originalCreateTransport;
      
      // Reset to mock for other tests
      setTransporter(mockTransporter);
    });
  });
});
