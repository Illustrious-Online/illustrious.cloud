import { Elysia, t } from "elysia";

import config from "../config";
import * as authController from "../modules/auth";

export default (app: Elysia) =>
  app.get("/auth/success", async ({ query, redirect }) => {
    const tokens = await authController.create(query.code);

    if (tokens.data) {
      const { access_token, refresh_token } = tokens.data;

      const url = `${config.app.url}?accessToken=${access_token}&refreshToken=${refresh_token}`;
      return redirect(url, 302);
    }
  });
