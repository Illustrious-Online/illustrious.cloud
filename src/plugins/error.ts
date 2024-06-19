import { Elysia } from "elysia";
import { StatusCodes } from "http-status-codes";

import config from "../config";
import BadRequestError from "../domain/exceptions/BadRequestError";
import ConflictError from "../domain/exceptions/ConflictError";
import ResponseError from "../domain/exceptions/ResponseError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import ErrorResponse from "../domain/types/generic/ErrorResponse";

export default (app: Elysia) =>
  app
    .error({ BadRequestError, ConflictError, ResponseError, UnauthorizedError })
    .onError((handler): ErrorResponse<number> => {
      if (config.app.env !== "test") {
        console.error(handler.error?.stack);
      }

      if (
        handler.error instanceof BadRequestError ||
        handler.error instanceof ConflictError ||
        handler.error instanceof UnauthorizedError ||
        handler.error instanceof ResponseError
      ) {
        handler.set.status = handler.error.status;

        return {
          message: handler.error.message,
          code: handler.error.status,
        };
      }

      if (handler.code === "NOT_FOUND") {
        handler.set.status = StatusCodes.NOT_FOUND;
        return {
          message: "Not Found!",
          code: handler.set.status,
        };
      }

      if (handler.code === "VALIDATION") {
        handler.set.status = StatusCodes.BAD_REQUEST;
        return {
          message: "Bad Request!",
          code: handler.set.status,
        };
      }

      handler.set.status = StatusCodes.SERVICE_UNAVAILABLE;

      return {
        message: handler.error.message,
        code: handler.set.status,
      };
    });
