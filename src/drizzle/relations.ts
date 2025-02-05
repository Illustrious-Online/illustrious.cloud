import { relations } from "drizzle-orm/relations";
import {
  invoices,
  orgInvoices,
  orgReports,
  orgUsers,
  orgs,
  reports,
  userInvoices,
  userReports,
  users,
} from "./schema";

export const OrgRelations = relations(orgs, ({ one, many }) => ({
  OrgUser: one(orgUsers, {
    fields: [orgs.id],
    references: [orgUsers.orgId],
  }),
  OrgReport: many(orgReports),
  OrgInvoice: many(orgInvoices),
}));

export const OrgUserRelations = relations(orgUsers, ({ one }) => ({
  Orgs: one(orgs, {
    fields: [orgUsers.orgId],
    references: [orgs.id],
  }),
  User: one(users, {
    fields: [orgUsers.userId],
    references: [users.id],
  }),
}));

export const UserRelations = relations(users, ({ many }) => ({
  OrgUsers: many(orgUsers),
  UserReports: many(userReports),
  UserInvoices: many(userInvoices),
}));

export const UserInvoiceRelations = relations(userInvoices, ({ one }) => ({
  Invoice: one(invoices, {
    fields: [userInvoices.invoiceId],
    references: [invoices.id],
  }),
  User: one(users, {
    fields: [userInvoices.userId],
    references: [users.id],
  }),
}));

export const InvoiceRelations = relations(invoices, ({ many }) => ({
  UserInvoices: many(userInvoices),
  OrgInvoices: many(orgInvoices),
}));

export const UserReportRelations = relations(userReports, ({ one }) => ({
  Report: one(reports, {
    fields: [userReports.reportId],
    references: [reports.id],
  }),
  User: one(users, {
    fields: [userReports.userId],
    references: [users.id],
  }),
}));

export const ReportRelations = relations(reports, ({ many }) => ({
  UserReports: many(userReports),
  OrgReports: many(orgReports),
}));
