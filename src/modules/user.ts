import { Context } from "elysia";

import config from "../config";
import ConflictError from "../domain/exceptions/ConflictError";
import LoggedInUser from "../domain/types/LoggedInUser";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import { User } from "../drizzle/schema";
import * as userService from "../services/user";

export const me = async (
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

export const create = async (
  context: Context,
): Promise<SuccessResponse<User>> => {
  const body = context.body as User;

  const data = await userService.create(body);

  return {
    data,
    message: "User created successfully.",
  };
};

export const fetchAll = async () => {
  const users = await userService.fetchAll();

  return {
    message: "User fetched successfully.",
    data: users,
  };
};

export const fetchOne = async (context: Context) => {
  const { id } = context.params;
  const user = await userService.fetchById(id);

  return {
    message: "User fetched successfully.",
    data: user,
  };
};
