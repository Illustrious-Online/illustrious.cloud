import { StatusCodes } from "http-status-codes";

/**
 * Represents a conflict error that occurs when a request conflicts with the current state of the server.
 * This error is typically used to indicate that the request could not be completed due to a conflict with the current state of the resource.
 *
 * @extends {Error}
 */
export default class ConflictError extends Error {
  public status: number;

  constructor(public message: string) {
    super(message);

    this.status = StatusCodes.CONFLICT;
  }
}
