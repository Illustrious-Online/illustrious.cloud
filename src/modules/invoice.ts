import { Context } from "elysia";

import { ContextWithJWT } from "../domain/types/extends/ContextWithJWT";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import { Invoice } from "../drizzle/schema";
import * as invoiceService from "../services/invoice";

export const create = async (
  context: ContextWithJWT,
): Promise<SuccessResponse<Invoice>> => {
  const body = context.body as Invoice;

  const data = await invoiceService.create(body);

  return {
    data,
    message: "Invoice created successfully.",
  };
};

export const fetchAll = async () => {
  const users = await invoiceService.fetchAll();

  return {
    message: "Invoice fetched successfully.",
    data: users,
  };
};

export const fetchOne = async (context: Context) => {
  const { id } = context.params;
  const user = await invoiceService.fetchById(id);

  return {
    message: "Invoice fetched successfully.",
    data: user,
  };
};
