import nodemailer from "nodemailer";
import config from "../config";
import type { IEmailService } from "../domain/interfaces/inquiries";
import type { Inquiry } from "../drizzle/schema";

/**
 * Email service implementation using nodemailer.
 * Handles sending inquiry-related emails via GoDaddy Outlook.
 */
export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure nodemailer using config
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      tls: {
        ciphers: "SSLv3",
      },
    });
  }

  /**
   * Sends a confirmation email to the customer.
   * @param inquiry - The inquiry data.
   * @param organizationName - The name of the organization.
   */
  async sendCustomerConfirmation(
    inquiry: Inquiry,
    organizationName: string,
  ): Promise<void> {
    const mailOptions = {
      from: config.email.user,
      to: inquiry.email,
      subject: `Thank you for your inquiry - ${organizationName}`,
      html: this.generateCustomerEmailHTML(inquiry, organizationName),
      text: this.generateCustomerEmailText(inquiry, organizationName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Confirmation email sent to ${inquiry.email}`);
    } catch (error) {
      console.error("Failed to send customer confirmation email:", error);
      throw new Error("Failed to send confirmation email");
    }
  }

  /**
   * Sends a notification email to the organization.
   * @param inquiry - The inquiry data.
   * @param orgEmail - The organization's email address.
   * @param organizationName - The name of the organization.
   */
  async sendOwnerNotification(
    inquiry: Inquiry,
    orgEmail: string,
    organizationName: string,
  ): Promise<void> {
    const mailOptions = {
      from: config.email.user,
      to: orgEmail,
      subject: `New Inquiry: ${inquiry.service} - ${inquiry.name}`,
      html: this.generateOwnerEmailHTML(inquiry, organizationName),
      text: this.generateOwnerEmailText(inquiry, organizationName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Notification email sent to ${orgEmail}`);
    } catch (error) {
      console.error("Failed to send owner notification email:", error);
      throw new Error("Failed to send notification email");
    }
  }

  /**
   * Generates HTML content for customer confirmation email.
   */
  private generateCustomerEmailHTML(
    inquiry: Inquiry,
    organizationName: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Thank you for your inquiry</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Thank you for your inquiry!</h2>
            <p>Dear ${inquiry.name},</p>
            <p>Thank you for reaching out to ${organizationName}. We have received your inquiry regarding <strong>${inquiry.service}</strong> and will get back to you within 24 hours.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Your Inquiry Details:</h3>
              <p><strong>Name:</strong> ${inquiry.name}</p>
              <p><strong>Email:</strong> ${inquiry.email}</p>
              <p><strong>Phone:</strong> ${inquiry.phone}</p>
              <p><strong>Service:</strong> ${inquiry.service}</p>
              <p><strong>Message:</strong></p>
              <p style="background-color: white; padding: 10px; border-radius: 3px;">${inquiry.message}</p>
            </div>
            
            <p>We appreciate your interest in our services and look forward to helping you with your needs.</p>
            <p>Best regards,<br>The ${organizationName} Team</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generates plain text content for customer confirmation email.
   */
  private generateCustomerEmailText(
    inquiry: Inquiry,
    organizationName: string,
  ): string {
    return `
Thank you for your inquiry!

Dear ${inquiry.name},

Thank you for reaching out to ${organizationName}. We have received your inquiry regarding ${inquiry.service} and will get back to you within 24 hours.

Your Inquiry Details:
- Name: ${inquiry.name}
- Email: ${inquiry.email}
- Phone: ${inquiry.phone}
- Service: ${inquiry.service}
- Message: ${inquiry.message}

We appreciate your interest in our services and look forward to helping you with your needs.

Best regards,
The ${organizationName} Team
    `.trim();
  }

  /**
   * Generates HTML content for owner notification email.
   */
  private generateOwnerEmailHTML(
    inquiry: Inquiry,
    _organizationName: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Inquiry Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c;">New Inquiry Received</h2>
            <p>A new inquiry has been submitted through the website.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Inquiry Details:</h3>
              <p><strong>Name:</strong> ${inquiry.name}</p>
              <p><strong>Email:</strong> ${inquiry.email}</p>
              <p><strong>Phone:</strong> ${inquiry.phone}</p>
              <p><strong>Service:</strong> ${inquiry.service}</p>
              <p><strong>Message:</strong></p>
              <p style="background-color: white; padding: 10px; border-radius: 3px;">${inquiry.message}</p>
              <p><strong>Submitted:</strong> ${new Date(inquiry.createdAt).toLocaleString()}</p>
            </div>
            
            <p>Please respond to this inquiry as soon as possible.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generates plain text content for owner notification email.
   */
  private generateOwnerEmailText(
    inquiry: Inquiry,
    _organizationName: string,
  ): string {
    return `
New Inquiry Received

A new inquiry has been submitted through the website.

Inquiry Details:
- Name: ${inquiry.name}
- Email: ${inquiry.email}
- Phone: ${inquiry.phone}
- Service: ${inquiry.service}
- Message: ${inquiry.message}
- Submitted: ${new Date(inquiry.createdAt).toLocaleString()}

Please respond to this inquiry as soon as possible.
    `.trim();
  }
}
