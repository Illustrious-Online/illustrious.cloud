import type { Elysia } from "elysia";
import { StatusCodes } from "http-status-codes";

import config from "@/config";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import ConflictError from "@/domain/exceptions/ConflictError";
import ResponseError from "@/domain/exceptions/ResponseError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type ErrorResponse from "@/domain/types/generic/ErrorResponse";

/**
 * A plugin for handling errors in the Elysia application.
 *
 * @param {Elysia} app - The Elysia application instance.
 * @returns {Elysia} The Elysia application instance with error handling configured.
 *
 * @example
 * ```typescript
 * import errorPlugin from './plugins/error';
 * import { Elysia } from 'elysia';
 *
 * const app = new Elysia();
 * app.use(errorPlugin);
 * ```
 *
 * This plugin configures the application to handle various types of errors:
 * - `BadRequestError`
 * - `ConflictError`
 * - `ResponseError`
 * - `UnauthorizedError`
 *
 * It also handles specific error codes:
 * - `NOT_FOUND`: Sets the status to 404 and returns a "Not Found!" message.
 * - `VALIDATION`: Sets the status to 400 and returns a "Bad Request!" message.
 *
 * For other errors, it sets the status to 503 (Service Unavailable) and returns the error message.
 *
 * If the application environment is not "test", the error stack trace is logged to the console.
 *
 * @param {Object} handler - The error handler object.
 * @param {Error} handler.error - The error object.
 * @param {string} handler.code - The error code.
 * @param {Object} handler.set - The response settings object.
 * @param {number} handler.set.status - The HTTP status code to be set.
 *
 * @returns {ErrorResponse<number>} The error response object containing the message and status code.
 */
export default (app: Elysia) =>
  app
    .error({ BadRequestError, ConflictError, ResponseError, UnauthorizedError })
    .onError((handler): ErrorResponse<number> => {
      // if (config.app.env !== "test") {
      //   console.error((handler.error as Error)?.stack);
      // }

      if (
        handler.error instanceof BadRequestError ||
        handler.error instanceof ConflictError ||
        handler.error instanceof UnauthorizedError ||
        handler.error instanceof ResponseError
      ) {
        handler.set.status = handler.error.status;

        return {
          message: (handler.error as Error).message,
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
        message: (handler.error as Error).message,
        code: handler.set.status,
      };
    });
