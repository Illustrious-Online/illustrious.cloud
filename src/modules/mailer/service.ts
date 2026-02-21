import config from "@/config";
import nodemailer from "nodemailer";

/**
 * Nodemailer transporter configured for GoDaddy Office365 SMTP
 * Uses smtp.office365.com on port 587 (TLS)
 */
let transporter: nodemailer.Transporter | null = null;

/**
 * Gets or creates the Nodemailer transporter
 * Creates transporter on first call, reuses on subsequent calls
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false, // Use TLS (STARTTLS)
      auth: {
        user: config.mailer.mailUser, // GoDaddy Office365 email address
        pass: config.mailer.mailPass, // App password if required
      },
    });
  }
  return transporter;
}

// Allow injection of mock transporter for testing
export function setTransporter(mockTransporter: nodemailer.Transporter | null) {
  transporter = mockTransporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using Nodemailer
 * @param opts - Email options (to, subject, html)
 * @returns Promise resolving when email is sent
 */
export async function sendMail(opts: SendMailOptions): Promise<void> {
  const mailTransporter = getTransporter();
  await mailTransporter.sendMail({
    from: config.mailer.mailFrom,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
