import { relations } from "drizzle-orm/relations";
import {
  inquiry,
  invoice,
  org,
  orgInquiry,
  orgInvoice,
  orgReport,
  orgUser,
  report,
  user,
  userInvoice,
  userReport,
} from "./schema";

/**
 * Defines the relations for the `userInvoice` entity.
 *
 * @param userInvoice - The `userInvoice` entity.
 * @param one - A function to define a one-to-one relationship.
 *
 * @returns An object containing the relations for `userInvoice`:
 * - `invoice`: A one-to-one relationship with the `invoice` entity,
 *   where `userInvoice.invoiceId` references `invoice.id`.
 * - `user`: A one-to-one relationship with the `user` entity,
 *   where `userInvoice.userId` references `user.id`.
 */
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

/**
 * Defines the relations for the `invoice` entity.
 *
 * @param invoice - The invoice entity.
 * @param many - A function to define many-to-one or one-to-many relationships.
 * @returns An object containing the relations for the invoice entity.
 *
 * Relations:
 * - `userInvoice`: Represents a many-to-one relationship with the `userInvoice` entity.
 * - `orgInvoices`: Represents a many-to-one relationship with the `orgInvoice` entity.
 */
export const invoiceRelations = relations(invoice, ({ many }) => ({
  userInvoice: many(userInvoice),
  orgInvoices: many(orgInvoice),
}));

/**
 * Defines the relations for the `user` entity.
 *
 * @param {Function} user - The user entity.
 * @param {Function} many - A function to define a one-to-many relationship.
 *
 * @returns {Object} An object containing the relations for the user entity:
 * - `userInvoice`: A one-to-many relationship with the `userInvoice` entity.
 * - `userReports`: A one-to-many relationship with the `userReport` entity.
 * - `orgUser`: A one-to-many relationship with the `orgUser` entity.
 */
export const userRelations = relations(user, ({ many }) => ({
  userInvoice: many(userInvoice),
  userReports: many(userReport),
  orgUser: many(orgUser),
}));

/**
 * Defines the relationships for the `orgReport` entity.
 *
 * @param {Function} one - A function to define a one-to-one relationship.
 *
 * @returns {Object} An object containing the relationships for `orgReport`.
 *
 * @property {Object} org - The relationship between `orgReport` and `org`.
 * @property {Array} org.fields - The fields in `orgReport` that reference `org`.
 * @property {Array} org.references - The fields in `org` that are referenced by `orgReport`.
 *
 * @property {Object} report - The relationship between `orgReport` and `report`.
 * @property {Array} report.fields - The fields in `orgReport` that reference `report`.
 * @property {Array} report.references - The fields in `report` that are referenced by `orgReport`.
 */
export const orgReportRelations = relations(orgReport, ({ one }) => ({
  org: one(org, {
    fields: [orgReport.orgId],
    references: [org.id],
  }),
  report: one(report, {
    fields: [orgReport.reportId],
    references: [report.id],
  }),
}));

/**
 * Defines the relationships for the `org` entity.
 *
 * @param {Function} org - The organization entity.
 * @param {Function} many - A function to define a one-to-many relationship.
 *
 * @returns {Object} An object containing the relationships for the `org` entity.
 * @property {Function} orgReports - A one-to-many relationship with the `orgReport` entity.
 * @property {Function} orgInvoices - A one-to-many relationship with the `orgInvoice` entity.
 * @property {Function} orgUser - A one-to-many relationship with the `orgUser` entity.
 */
export const orgRelations = relations(org, ({ many }) => ({
  orgReports: many(orgReport),
  orgInvoices: many(orgInvoice),
  orgInquiries: many(orgInquiry),
  orgUser: many(orgUser),
}));

/**
 * Defines the relationships for the `report` entity.
 *
 * @param report - The report entity.
 * @param many - A function to define a many-to-one or many-to-many relationship.
 * @returns An object containing the relationships for the report entity.
 * @property {Relation} orgReports - A many-to-one or many-to-many relationship with the `orgReport` entity.
 * @property {Relation} userReports - A many-to-one or many-to-many relationship with the `userReport` entity.
 */
export const reportRelations = relations(report, ({ many }) => ({
  orgReports: many(orgReport),
  userReports: many(userReport),
}));

/**
 * Defines the relations for the `userReport` entity.
 *
 * This function establishes two one-to-one relationships:
 *
 * - `report`: Links the `userReport` entity to the `report` entity using the `reportId` field in `userReport` and the `id` field in `report`.
 * - `user`: Links the `userReport` entity to the `user` entity using the `userId` field in `userReport` and the `id` field in `user`.
 *
 * @param userReport - The `userReport` entity.
 * @param one - A function to define a one-to-one relationship.
 * @returns An object containing the defined relationships.
 */
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

/**
 * Defines the relations for the `orgInvoice` entity.
 *
 * @param {Function} one - A function to define a one-to-one relationship.
 * @returns {Object} An object containing the relationships for `orgInvoice`.
 *
 * - `invoice`: A one-to-one relationship with the `invoice` entity.
 *   - `fields`: The fields in `orgInvoice` that reference the `invoice` entity.
 *   - `references`: The fields in the `invoice` entity that are referenced by `orgInvoice`.
 *
 * - `org`: A one-to-one relationship with the `org` entity.
 *   - `fields`: The fields in `orgInvoice` that reference the `org` entity.
 *   - `references`: The fields in the `org` entity that are referenced by `orgInvoice`.
 */
export const orgInvoiceRelations = relations(orgInvoice, ({ one }) => ({
  invoice: one(invoice, {
    fields: [orgInvoice.invoiceId],
    references: [invoice.id],
  }),
  org: one(org, {
    fields: [orgInvoice.orgId],
    references: [org.id],
  }),
}));

/**
 * Defines the relationships for the `orgUser` entity.
 *
 * This function establishes two one-to-one relationships:
 * 1. `org`: Links the `orgUser` entity to the `org` entity using the `orgId` field in `orgUser` and the `id` field in `org`.
 * 2. `user`: Links the `orgUser` entity to the `user` entity using the `userId` field in `orgUser` and the `id` field in `user`.
 *
 * @param orgUser - The `orgUser` entity.
 * @param one - A function to define a one-to-one relationship.
 * @returns An object containing the defined relationships.
 */
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

/**
 * Defines the relations for the `inquiry` entity.
 *
 * @param inquiry - The inquiry entity.
 * @param many - A function to define a many-to-one or one-to-many relationships.
 * @returns An object containing the relations for the inquiry entity.
 *
 * Relations:
 * - `orgInquiries`: Represents a many-to-one relationship with the `orgInquiry` entity.
 */
export const inquiryRelations = relations(inquiry, ({ many }) => ({
  orgInquiries: many(orgInquiry),
}));

/**
 * Defines the relations for the `orgInquiry` entity.
 *
 * @param orgInquiry - The `orgInquiry` entity.
 * @param one - A function to define a one-to-one relationship.
 *
 * @returns An object containing the relations for `orgInquiry`:
 * - `inquiry`: A one-to-one relationship with the `inquiry` entity,
 *   where `orgInquiry.inquiryId` references `inquiry.id`.
 * - `org`: A one-to-one relationship with the `org` entity,
 *   where `orgInquiry.orgId` references `org.id`.
 */
export const orgInquiryRelations = relations(orgInquiry, ({ one }) => ({
  inquiry: one(inquiry, {
    fields: [orgInquiry.inquiryId],
    references: [inquiry.id],
  }),
  org: one(org, {
    fields: [orgInquiry.orgId],
    references: [org.id],
  }),
}));
