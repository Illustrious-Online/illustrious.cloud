import { Elysia, t } from "elysia";

export const inquiryModel = new Elysia().model({
  createInquiryBody: t.Object({
    orgId: t.String(),
    name: t.String({ minLength: 1 }),
    email: t.String({ format: "email" }),
    phone: t.Optional(t.String()),
    comment: t.String({ minLength: 1 }),
    recaptchaToken: t.String(),
  }),
  inquiryResponse: t.Object({
    id: t.String(),
    orgId: t.String(),
    userId: t.Nullable(t.String()),
    name: t.String(),
    email: t.String(),
    phone: t.Nullable(t.String()),
    comment: t.String(),
    createdAt: t.Date(),
  }),
  inquiryListResponse: t.Array(
    t.Object({
      id: t.String(),
      orgId: t.String(),
      userId: t.Nullable(t.String()),
      name: t.String(),
      email: t.String(),
      phone: t.Nullable(t.String()),
      comment: t.String(),
      createdAt: t.Date(),
    }),
  ),
});
