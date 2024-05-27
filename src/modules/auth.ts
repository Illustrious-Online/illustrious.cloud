import ConflictError from "../domain/exceptions/ConflictError";
import * as authService from "../services/auth";
import config from "../config";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import { Context } from "elysia";
import LoggedInUser from "../domain/types/LoggedInUser";

export const create = async (code: string) => {
  if (code) {
    const tokens = await authService.getTokens(code);

    return tokens;
  } else {
    throw new ConflictError("Unable to authenticate: Missing auth code");
  }
};

export const getUserInfo = async (
  context: Context,
): Promise<SuccessResponse<LoggedInUser>> => {
  if (context.headers.authorization) {
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("Authorization", context.headers.authorization?.toString());

    const requestOptions = {
      method: "GET",
      headers: headers,
    };

    const res = await fetch(`${config.auth.url}/userinfo`, requestOptions);

    return {
      message: "User details fetched successfully!",
      data: await res.json(),
    };
  } else {
    throw new ConflictError("Bearer token could not be retrieved");
  }
};
