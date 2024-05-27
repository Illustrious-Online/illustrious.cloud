import { Elysia, t } from "elysia";

import * as authController from "../modules/auth";

export default (app: Elysia) =>
  app.get("/auth/success", async ({ query, redirect }) => {
    if (query.code) {
      const tokens = await authController.create(query.code);
      const { accessToken, idToken, refreshToken } = tokens;

      const url = `${config.app.appUrl}?accessToken=${accessToken}&idToken=${idToken}&refreshToken=${refreshToken}`;
      return redirect(url, 302);
    }
  });
