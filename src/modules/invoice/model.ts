import { Elysia, t } from "elysia";

export const invoiceModel = new Elysia().model({
  createInvoiceBody: t.Object({
    orgId: t.String(),
    amount: t.Number({ minimum: 0 }),
    status: t.Optional(
      t.Union([t.Literal("draft"), t.Literal("unpaid"), t.Literal("paid")]),
    ),
    dueDate: t.String({ format: "date-time" }),
    periodStart: t.String({ format: "date-time" }),
    periodEnd: t.String({ format: "date-time" }),
    description: t.Optional(t.String()),
    userIds: t.Optional(t.Array(t.String())),
  }),
  updateInvoiceBody: t.Object({
    amount: t.Optional(t.Number({ minimum: 0 })),
    status: t.Optional(
      t.Union([t.Literal("draft"), t.Literal("unpaid"), t.Literal("paid")]),
    ),
    dueDate: t.Optional(t.String({ format: "date-time" })),
    periodStart: t.Optional(t.String({ format: "date-time" })),
    periodEnd: t.Optional(t.String({ format: "date-time" })),
    description: t.Optional(t.String()),
    userIds: t.Optional(t.Array(t.String())),
  }),
  invoiceResponse: t.Object({
    id: t.String(),
    orgId: t.String(),
    amount: t.String(),
    status: t.String(),
    dueDate: t.Date(),
    periodStart: t.Date(),
    periodEnd: t.Date(),
    description: t.Nullable(t.String()),
    createdBy: t.Nullable(t.String()),
    modifiedBy: t.Nullable(t.String()),
    createdAt: t.Date(),
    updatedAt: t.Nullable(t.Date()),
  }),
  invoiceListResponse: t.Array(
    t.Object({
      id: t.String(),
      orgId: t.String(),
      amount: t.String(),
      status: t.String(),
      dueDate: t.Date(),
      periodStart: t.Date(),
      periodEnd: t.Date(),
      description: t.Nullable(t.String()),
      createdBy: t.Nullable(t.String()),
      modifiedBy: t.Nullable(t.String()),
      createdAt: t.Date(),
      updatedAt: t.Nullable(t.Date()),
    }),
  ),
});
