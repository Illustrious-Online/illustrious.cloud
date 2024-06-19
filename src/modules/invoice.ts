import { Context } from "elysia";

import { Invoice } from "../../drizzle/schema";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { SubmitInvoice } from "../domain/interfaces/invoices";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import * as invoiceService from "../services/invoice";
import * as userService from "../services/user";
import { getSub } from "../utils/extract-sub";

export const create = async (
  context: Context,
): Promise<SuccessResponse<Invoice>> => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const body = context.body as SubmitInvoice;
  const sub = await getSub(context.headers.authorization);
  const user = await userService.validatePermissions(sub, body.org);
  const data = await invoiceService.create({
    user: user.id,
    org: body.org,
    invoice: body.invoice,
  });

  return {
    data,
    message: "Invoice created successfully.",
  };
};

export const fetchOne = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const { id } = context.params;
  const sub = await getSub(context.headers.authorization);
  const user = await userService.fetchOne({ sub });
  const data = await invoiceService.fetchById({
    id,
    userId: user.id,
  });

  return {
    message: "Invoice fetched successfully.",
    data,
  };
};

export const update = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const body = context.body as SubmitInvoice;
  const sub = await getSub(context.headers.authorization);

  await userService.validatePermissions(sub, body.org);
  const data = await invoiceService.update(body.invoice);

  return {
    data,
    message: "Invoice updated successfully.",
  };
};

export const deleteOne = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const sub = await getSub(context.headers.authorization);
  const { id, org } = context.params;

  await userService.validatePermissions(sub, org);
  await invoiceService.deleteOne(id);

  return {
    message: "Invoice deleted successfully.",
  };
};
