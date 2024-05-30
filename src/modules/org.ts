import { Context } from "elysia";

import { Org } from "../../drizzle/schema";
import { ContextWithJWT } from "../domain/types/extends/ContextWithJWT";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import * as orgService from "../services/org";

export const create = async (
  context: ContextWithJWT,
): Promise<SuccessResponse<Org>> => {
  const body = context.body as Org;

  const data = await orgService.create(body);

  return {
    data,
    message: "Invoice created successfully.",
  };
};

export const fetchAll = async () => {
  const users = await orgService.fetchAll();

  return {
    message: "Invoice fetched successfully.",
    data: users,
  };
};

export const fetchOne = async (context: Context) => {
  const { id } = context.params;
  const user = await orgService.fetchById(id);

  return {
    message: "Invoice fetched successfully.",
    data: user,
  };
};
