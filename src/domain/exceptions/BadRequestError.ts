import { StatusCodes } from "http-status-codes";

/**
 * Represents a Bad Request error.
 * This error should be thrown when the client sends a request that the server cannot or will not process.
 *
 * @extends {Error}
 */
export default class BadRequestError extends Error {
  public status: number;

  constructor(public message: string) {
    super(message);

    this.status = StatusCodes.BAD_REQUEST;
  }
}
