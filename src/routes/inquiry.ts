import { type Elysia, t } from "elysia";
import {
  CreateInquiry,
  Inquiry,
  InquiryQuery,
  UpdateInquiry,
} from "@/domain/models/inquiry";
import * as inquiryController from "@/modules/inquiry";

/**
 * Defines the routes for inquiry-related operations.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @route POST /inquiry
 * @header {string} X-Org-Id - The organization ID.
 * @body {CreateInquiry} - The inquiry data to create.
 * @response 201 - Successful response containing the created inquiry.
 * @response 400 - Bad request.
 * @response 500 - Internal server error.
 *
 * @route GET /inquiry/:id
 * @param {string} id - The inquiry ID.
 * @response 201 - Successful response containing the inquiry.
 * @response 404 - Inquiry not found.
 * @response 500 - Internal server error.
 *
 * @route GET /inquiry
 * @query {InquiryQuery} - Query parameters for filtering and pagination.
 * @response 201 - Successful response containing the inquiries.
 * @response 500 - Internal server error.
 *
 * @route PUT /inquiry/:id
 * @param {string} id - The inquiry ID.
 * @body {UpdateInquiry} - The data to update.
 * @response 201 - Successful response containing the updated inquiry.
 * @response 404 - Inquiry not found.
 * @response 500 - Internal server error.
 *
 * @route DELETE /inquiry/:id
 * @param {string} id - The inquiry ID.
 * @response 201 - Successful response indicating deletion.
 * @response 404 - Inquiry not found.
 * @response 500 - Internal server error.
 */
export default (app: Elysia) =>
  app
    .post("/inquiry", inquiryController.createInquiry, {
      body: CreateInquiry,
      response: {
        201: t.Object({
          message: t.String(),
          data: Inquiry,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        500: t.Object({
          code: t.Number({ examples: [500] }),
          message: t.String({ examples: ["Internal Server Error!"] }),
        }),
      },
    })
    .get("/inquiry/:id", inquiryController.getInquiryById, {
      params: t.Object({
        id: t.String({ minLength: 1, maxLength: 256 }),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          data: Inquiry,
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
        500: t.Object({
          code: t.Number({ examples: [500] }),
          message: t.String({ examples: ["Internal Server Error!"] }),
        }),
      },
    })
    .get("/inquiry", inquiryController.getInquiries, {
      query: InquiryQuery,
      response: {
        201: t.Object({
          message: t.String(),
          data: t.Array(Inquiry),
        }),
        500: t.Object({
          code: t.Number({ examples: [500] }),
          message: t.String({ examples: ["Internal Server Error!"] }),
        }),
      },
    })
    .put("/inquiry/:id", inquiryController.updateInquiry, {
      params: t.Object({
        id: t.String({ minLength: 1, maxLength: 256 }),
      }),
      body: UpdateInquiry,
      response: {
        201: t.Object({
          message: t.String(),
          data: Inquiry,
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
        500: t.Object({
          code: t.Number({ examples: [500] }),
          message: t.String({ examples: ["Internal Server Error!"] }),
        }),
      },
    })
    .delete("/inquiry/:id", inquiryController.deleteInquiry, {
      params: t.Object({
        id: t.String({ minLength: 1, maxLength: 256 }),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          data: t.Null(),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
        500: t.Object({
          code: t.Number({ examples: [500] }),
          message: t.String({ examples: ["Internal Server Error!"] }),
        }),
      },
    });
