import { Elysia, t } from "elysia";
import config from "../config";
import * as authController from "../modules/auth";

export default (app: Elysia) =>
  app
    .get(
      "/auth/success",
      async ({ query, redirect }) => {
        const tokens = await authController.create(query.code);

        if (tokens.data) {
          const { access_token, refresh_token } = tokens.data;

          const url = `${config.app.url}?accessToken=${access_token}&refreshToken=${refresh_token}`;
          return redirect(url, 302);
        }
      },
      {
        query: t.Object({
          code: t.String(),
        }),
        response: {
          302: t.Any({
            description:
              "Redirects browser/request to redirect URL with tokens",
          }),
        },
      },
    )
    .get("/auth/logout", authController.logout, {
      response: {
        302: t.Any({
          description: "Redirects browser/request to redirect URL",
        }),
      },
    })
    // @ts-expect-error Swagger plugin disagrees when adding 200 response
    .delete("/auth/delete/:id", authController.deleteOne, {
      params: t.Object({
        code: t.String(),
      }),
      response: {
        200: t.Object(
          {
            message: t.String(),
          },
          {
            description: "Successfully deleted authorization & relationship",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Failed to delete authorization"],
            }),
          },
          {
            description: "Unable to process authorization delete",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["Unable to find user to processes delete"],
            }),
          },
          {
            description: "There was a conflict deleting the authentications",
          },
        ),
      },
    });
