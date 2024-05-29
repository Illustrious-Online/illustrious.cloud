import { Elysia, t } from "elysia";

import * as authController from "../modules/auth";
import config from "../config";

export default (app: Elysia) =>
  app.get("/auth/success", async ({ query, redirect }) => {
    const tokens = await authController.create(query.code);
    const { accessToken, idToken, refreshToken } = tokens;

    const url = `${config.app.url}?accessToken=${accessToken}&idToken=${idToken}&refreshToken=${refreshToken}`;
    return redirect(url, 302);
  });
