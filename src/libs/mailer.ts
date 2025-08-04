import nodemailer from "nodemailer";

// Choose email provider based on environment variable
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "smtp"; // "smtp" or "resend"

// SMTP transporter (for GoDaddy or other SMTP providers)
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtpout.secureserver.net",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true" || true, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || "nick@illustrious.online",
    pass: process.env.SMTP_PASS || "password123",
  },
});

// Resend transporter (alternative to SMTP)
const resendTransporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

// Use appropriate transporter based on provider
const transporter =
  EMAIL_PROVIDER === "resend" ? resendTransporter : smtpTransporter;

/**
 * Sends an email using the configured SMTP transporter.
 * @param {Object} options - The email options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text body.
 * @param {string} [options.html] - HTML body (optional).
 * @param {string} [options.from] - Sender email (optional, defaults to SMTP_USER).
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
  from,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}) {
  return transporter.sendMail({
    from: from || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
