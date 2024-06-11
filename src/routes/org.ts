import { Elysia, t } from "elysia";
import { Invoice } from "../domain/models/invoice";
import { Org } from "../domain/models/org";
import { Report } from "../domain/models/report";
import { User } from "../domain/models/user";
import * as orgController from "../modules/org";

export default (app: Elysia) =>
  app
    // @ts-expect-error Swagger plugin disagrees with context
    .get("/orgs/:id", orgController.fetchOrg, {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Optional(
        t.Object({
          include: t.Optional(t.String()),
        }),
      ),
      response: {
        200: t.Object({
          message: t.String(),
          data: t.Object(
            {
              org: Org,
              invoices: t.Array(Invoice),
              reports: t.Array(Report),
              users: t.Array(User),
            },
            {
              description: "Successfully found the organization",
            },
          ),
        }),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to find organization with ID"],
            }),
          },
          {
            description: "Failed to find the organization based on ID",
          },
        ),
      },
    })
    // @ts-expect-error Swagger plugin disagrees with context
    .get("/orgs/resource/:type/:id", orgController.fetchResources, {
      params: t.Object({
        type: t.String(),
        id: t.String(),
      }),
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: t.Array(Invoice) || t.Array(Report) || t.Array(User),
          },
          {
            description: "Found resources based on organization ID",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to find organization resources"],
            }),
          },
          {
            description:
              "Failed to find the organization resources based on ID",
          },
        ),
      },
    })
    // @ts-expect-error Swagger plugin disagrees with context
    .post("/orgs", orgController.create, {
      body: Org,
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: Org,
          },
          {
            description: "Successfully created new organziation & relations",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to create new organization"],
            }),
          },
          {
            description: "Unable to process with authorization from request",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["User already exists"],
            }),
          },
          {
            description: "There was a conflict when creating a new user",
          },
        ),
      },
    })
    // @ts-expect-error Swagger plugin disagrees when adding 200 response
    .put("/orgs/:id", orgController.update, {
      body: Org,
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: Org,
          },
          {
            description: "Successfully updated the organization",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to find organization to be updated"],
            }),
          },
          {
            description: "Unable to process with authorization from request",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["Organization already exists"],
            }),
          },
          {
            description: "There was a conflict when updating the organization",
          },
        ),
      },
    })
    // @ts-expect-error Swagger plugin disagrees when adding 200 response
    .delete("/orgs/:id", orgController.deleteOne, {
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: t.Object(
          {
            message: t.String(),
          },
          {
            description: "Successfully deleted the organization & relations",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Failed to delete organization"],
            }),
          },
          {
            description: "Unable to process with authorization from request",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["Unable to find organization to processes delete"],
            }),
          },
          {
            description: "There was a conflict deleting the organization",
          },
        ),
      },
    });
