import { Inquiry } from "@/domain/models/inquiry";
import * as inquiryController from "@/modules/inquiry";
import { type Elysia, t } from "elysia";

/**
 * Sets up the inquiry routes for the application.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @route POST /inquiry
 * @description Creates a new inquiry with Service Role Key authentication and reCAPTCHA verification.
 * @body {Object} body - The request body containing inquiry details and reCAPTCHA token.
 * @response {201} - Inquiry created successfully.
 * @response {400} - Bad request (reCAPTCHA verification failed).
 * @response {401} - Unauthorized (invalid or missing Service Role Key).
 * @response {409} - Conflict (organization not found or inquiry creation failed).
 */
export default (app: Elysia) =>
  app
    .post("/inquiry", inquiryController.postInquiry, {
      body: t.Object({
        status: t.Union([
          t.Literal("pending"),
          t.Literal("resolved"),
          t.Literal("closed"),
        ]),
        orgId: t.String({ minLength: 1, maxLength: 256 }),
        name: t.String({ minLength: 1, maxLength: 256 }),
        email: t.String({ format: "email", maxLength: 256 }),
        subject: t.String({ minLength: 1, maxLength: 256 }),
        message: t.String({ minLength: 1, maxLength: 2000 }),
      }),
      response: {
        201: t.Object({
          code: t.Number({ examples: [201] }),
          inquiry: Inquiry,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["reCAPTCHA verification failed."] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({
            examples: [
              "Service Role Key required.",
              "Invalid Service Role Key.",
            ],
          }),
        }),
        409: t.Object({
          code: t.Number({ examples: [409] }),
          message: t.String({
            examples: [
              "Organization not found.",
              "Failed to create the inquiry.",
            ],
          }),
        }),
      },
    })
    .get("/inquiry/:inquiry", inquiryController.getInquiry, {
      params: t.Object({
        inquiry: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          inquiry: Inquiry,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
      },
    })
    .put("/inquiry/:inquiry", inquiryController.putInquiry, {
      params: t.Object({
        inquiry: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal("pending"),
          t.Literal("resolved"),
          t.Literal("closed"),
        ]),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          inquiry: Inquiry,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
        503: t.Object({
          code: t.Number({ examples: [503] }),
          message: t.String({ examples: ["Failed to update the inquiry."] }),
        }),
      },
    })
    .delete("/inquiry/:inquiry", inquiryController.deleteInquiry, {
      params: t.Object({
        inquiry: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
      },
    });
