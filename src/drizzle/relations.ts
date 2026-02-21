import { relations } from "drizzle-orm";
import {
  account,
  inquiry,
  invoice,
  org,
  orgUser,
  report,
  session,
  user,
  userInvoice,
  userProfile,
  userReport,
} from "./schema";

// ============================================
// BETTER-AUTH TABLE RELATIONS
// ============================================

export const userRelations = relations(user, ({ many, one }) => ({
  // Better-auth relations
  sessions: many(session),
  accounts: many(account),
  // Custom profile
  profile: one(userProfile),
  // Business relations
  userInvoices: many(userInvoice),
  userReports: many(userReport),
  orgUsers: many(orgUser),
  inquiries: many(inquiry),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

// ============================================
// BUSINESS DOMAIN RELATIONS
// ============================================

export const orgRelations = relations(org, ({ many }) => ({
  orgUsers: many(orgUser),
  inquiries: many(inquiry),
  invoices: many(invoice),
  reports: many(report),
}));

export const inquiryRelations = relations(inquiry, ({ one }) => ({
  org: one(org, {
    fields: [inquiry.orgId],
    references: [org.id],
  }),
  user: one(user, {
    fields: [inquiry.userId],
    references: [user.id],
  }),
}));

export const invoiceRelations = relations(invoice, ({ many, one }) => ({
  org: one(org, {
    fields: [invoice.orgId],
    references: [org.id],
  }),
  userInvoices: many(userInvoice),
  createdByUser: one(user, {
    fields: [invoice.createdBy],
    references: [user.id],
    relationName: "createdBy",
  }),
  modifiedByUser: one(user, {
    fields: [invoice.modifiedBy],
    references: [user.id],
    relationName: "modifiedBy",
  }),
}));

export const reportRelations = relations(report, ({ many, one }) => ({
  org: one(org, {
    fields: [report.orgId],
    references: [org.id],
  }),
  userReports: many(userReport),
  createdByUser: one(user, {
    fields: [report.createdBy],
    references: [user.id],
    relationName: "createdBy",
  }),
  modifiedByUser: one(user, {
    fields: [report.modifiedBy],
    references: [user.id],
    relationName: "modifiedBy",
  }),
}));

// ============================================
// JUNCTION TABLE RELATIONS
// ============================================

export const orgUserRelations = relations(orgUser, ({ one }) => ({
  org: one(org, {
    fields: [orgUser.orgId],
    references: [org.id],
  }),
  user: one(user, {
    fields: [orgUser.userId],
    references: [user.id],
  }),
}));

export const userInvoiceRelations = relations(userInvoice, ({ one }) => ({
  invoice: one(invoice, {
    fields: [userInvoice.invoiceId],
    references: [invoice.id],
  }),
  user: one(user, {
    fields: [userInvoice.userId],
    references: [user.id],
  }),
}));

export const userReportRelations = relations(userReport, ({ one }) => ({
  report: one(report, {
    fields: [userReport.reportId],
    references: [report.id],
  }),
  user: one(user, {
    fields: [userReport.userId],
    references: [user.id],
  }),
}));
