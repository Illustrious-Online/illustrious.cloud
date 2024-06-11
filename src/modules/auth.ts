import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";

import { User } from "../../drizzle/schema";
import ConflictError from "../domain/exceptions/ConflictError";
import SuccessResponse from "../domain/types/generic/SuccessResponse";

import AuthUserInfo from "../domain/interfaces/authUserInfo";
import Tokens from "../domain/interfaces/tokens";
import * as authService from "../services/auth";
import * as userService from "../services/user";

export const create = async (
  code: string | undefined,
): Promise<SuccessResponse<Tokens>> => {
  if (!code) {
    throw new ConflictError("Authorization code is required.");
  }

  const tokens = await authService.getTokens(code);
  const { access_token, id_token, refresh_token } = tokens as Tokens;

  if (!access_token || !id_token || !refresh_token) {
    throw new ConflictError("Failed to obtain all required tokens");
  }

  const userinfo: AuthUserInfo = jwtDecode(id_token);
  let user: User;

  try {
    user = await userService.fetchOne({ sub: userinfo.sub });
  } catch {
    let authId = uuidv4();
    let userId;

    try {
      user = await userService.fetchOne({ email: userinfo.email });
      userId = user.id;
    } catch {
      userId = uuidv4();

      await userService.create({
        id: userId,
        email: userinfo.email,
        firstName: userinfo.given_name ?? null,
        lastName: userinfo.family_name ?? null,
        picture: userinfo.picture ?? null,
        phone: userinfo.phone_number ?? null,
      });
    }

    await authService.create({
      authId,
      userId,
      sub: userinfo.sub,
    });
  }

  return {
    data: tokens,
    message: "Obtained tokens successfully!",
  };
};

export const logout = async (): Promise<void> => {
  await authService.logout();
};

export const deleteOne = async (
  id: string,
): Promise<SuccessResponse<String>> => {
  await authService.deleteOne(id);

  return {
    message: "Successfully deleted requested authentaction",
  };
};
