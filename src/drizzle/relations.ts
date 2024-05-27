import { relations } from "drizzle-orm/relations";
import {
  invoices,
  orgUsers,
  orgs,
  reports,
  userAuthentications,
  userInvoices,
  userReports,
  users,
} from "./schema";

export const OrgRelations = relations(orgs, ({ one }) => ({
  OrgUser: one(orgUsers, {
    fields: [orgs.id],
    references: [orgUsers.orgId],
  }),
}));

export const OrgUserRelations = relations(orgUsers, ({ one, many }) => ({
  Orgs: one(orgs, {
    fields: [orgUsers.orgId],
    references: [orgs.id],
  }),
  User: one(users, {
    fields: [orgUsers.userId],
    references: [users.id],
  }),
  UserInvoices: many(userInvoices),
  UserReports: many(userReports),
}));

export const UserRelations = relations(users, ({ many }) => ({
  OrgUsers: many(orgUsers),
  UserAuthentications: many(userAuthentications),
}));

export const UserAuthentications = relations(
  userAuthentications,
  ({ one }) => ({
    User: one(users, {
      fields: [userAuthentications.userId],
      references: [users.id],
    }),
  }),
);

export const UserInvoiceRelations = relations(userInvoices, ({ one }) => ({
  Invoice: one(invoices, {
    fields: [userInvoices.invoiceId],
    references: [invoices.id],
  }),
  OrgUser: one(orgUsers, {
    fields: [userInvoices.userId],
    references: [orgUsers.id],
  }),
}));

export const InvoiceRelations = relations(invoices, ({ many }) => ({
  UserInvoices: many(userInvoices),
}));

export const UserReportRelations = relations(userReports, ({ one }) => ({
  Report: one(reports, {
    fields: [userReports.reportId],
    references: [reports.id],
  }),
  OrgUser: one(orgUsers, {
    fields: [userReports.userId],
    references: [orgUsers.id],
  }),
}));

export const ReportRelations = relations(reports, ({ many }) => ({
  UserReports: many(userReports),
}));
