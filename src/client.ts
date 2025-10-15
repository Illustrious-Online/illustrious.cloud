import { treaty } from "@elysiajs/eden";
import { Elysia, t } from "elysia";
import config from "./config";

// Create a minimal Elysia instance that matches the real app structure
// This avoids database connections while providing proper type inference
const app = new Elysia()
  .get("/", () => ({ name: "Illustrious Cloud API", version: "1.0.0" }))
  .post(
    "/inquiry",
    ({ body }) => ({
      message: "Inquiry created successfully",
      data: body,
    }),
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        phone: t.Optional(t.String()),
        service: t.String(),
        message: t.String(),
        recaptchaToken: t.String(),
      }),
    },
  )
  .get("/inquiry", () => ({
    message: "Inquiries retrieved successfully",
    data: [],
  }))
  .get("/inquiry/:id", ({ params }) => ({
    message: "Inquiry retrieved successfully",
    data: { id: params.id },
  }))
  .put("/inquiry/:id", ({ body }) => ({
    message: "Inquiry updated successfully",
    data: body,
  }))
  .delete("/inquiry/:id", () => ({
    message: "Inquiry deleted successfully",
    data: null,
  }));

/**
 * Eden Treaty client for type-safe API communication.
 *
 * This client provides end-to-end type safety between frontend and backend.
 * All API calls are fully typed based on the server schema.
 *
 * @example
 * ```typescript
 * import { client } from './client';
 *
 * // Fully typed API call
 * const response = await client.inquiry.post({
 *   name: "John Doe",
 *   email: "john@example.com",
 *   service: "Web Development",
 *   message: "I need help with my project",
 *   recaptchaToken: "token"
 * });
 *
 * if (response.data) {
 *   console.log(response.data.message); // Fully typed!
 * }
 * ```
 */
export const client = treaty(app, config.app.url);

/**
 * Eden Treaty client for production environment.
 *
 * Use this for production builds with the actual API URL.
 */
export const clientProd = treaty(app, config.app.url);

/**
 * Helper function to get the appropriate client based on environment.
 *
 * @param baseURL - Optional base URL for the API
 * @returns Eden Treaty client instance
 */
export function createClient(baseURL?: string) {
  return treaty(app, baseURL || config.app.url);
}

export default client;
