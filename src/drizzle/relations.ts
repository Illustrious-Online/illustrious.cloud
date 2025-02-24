import { relations } from "drizzle-orm/relations";
import { invoice, userInvoice, user, org, orgReport, report, userReport, orgInvoice, orgUser } from "./schema";

export const userInvoiceRelations = relations(userInvoice, ({one}) => ({
	invoice: one(invoice, {
		fields: [userInvoice.invoiceId],
		references: [invoice.id]
	}),
	user: one(user, {
		fields: [userInvoice.userId],
		references: [user.id]
	}),
}));

export const invoiceRelations = relations(invoice, ({many}) => ({
	userInvoice: many(userInvoice),
	orgInvoices: many(orgInvoice),
}));

export const userRelations = relations(user, ({many}) => ({
	userInvoice: many(userInvoice),
	userReports: many(userReport),
	orgUser: many(orgUser),
}));

export const orgReportRelations = relations(orgReport, ({one}) => ({
	org: one(org, {
		fields: [orgReport.orgId],
		references: [org.id]
	}),
	report: one(report, {
		fields: [orgReport.reportId],
		references: [report.id]
	}),
}));

export const orgRelations = relations(org, ({many}) => ({
	orgReports: many(orgReport),
	orgInvoices: many(orgInvoice),
	orgUser: many(orgUser),
}));

export const reportRelations = relations(report, ({many}) => ({
	orgReports: many(orgReport),
	userReports: many(userReport),
}));

export const userReportRelations = relations(userReport, ({one}) => ({
	report: one(report, {
		fields: [userReport.reportId],
		references: [report.id]
	}),
	user: one(user, {
		fields: [userReport.userId],
		references: [user.id]
	}),
}));

export const orgInvoiceRelations = relations(orgInvoice, ({one}) => ({
	invoice: one(invoice, {
		fields: [orgInvoice.invoiceId],
		references: [invoice.id]
	}),
	org: one(org, {
		fields: [orgInvoice.orgId],
		references: [org.id]
	}),
}));

export const orgUserRelations = relations(orgUser, ({one}) => ({
	org: one(org, {
		fields: [orgUser.orgId],
		references: [org.id]
	}),
	user: one(user, {
		fields: [orgUser.userId],
		references: [user.id]
	}),
}));
