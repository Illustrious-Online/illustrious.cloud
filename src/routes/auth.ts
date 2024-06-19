import { Elysia, t } from "elysia";
import config from "../config";
import * as authController from "../modules/auth";
import authPlugin from "../plugins/auth";

export default (app: Elysia) =>
  app
    .get(
      "/auth/success",
      async ({ redirect, query }) => {
        const tokens = await authController.create(query.code);
        const { access_token, refresh_token } = tokens;
        return redirect(
          `${config.app.url}?accessToken=${access_token}&refreshToken=${refresh_token}`,
          302,
        );
      },
      {
        query: t.Object({
          code: t.String(),
        }),
        response: {
          301: t.Any({
            description:
              "Redirects browser/request to redirect URL with tokens",
          }),
        },
      },
    )
    .get(
      "/auth/logout",
      ({ redirect }) => {
        const { clientId } = config.auth;
        const { dashboardUrl } = config.app;

        return redirect(
          `${config.auth.url}/v2/logout?client_id=${clientId}&returnTo=${dashboardUrl}`,
        );
      },
      {
        response: {
          302: t.Any({
            description: "Redirects browser/request to redirect URL",
          }),
        },
      },
    )
    .use(authPlugin)
    // @ts-expect-error Swagger plugin disagrees when adding 200 response
    .delete("/auth/delete/:id", authController.deleteOne, {
      params: t.Object({
        id: t.String(),
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
