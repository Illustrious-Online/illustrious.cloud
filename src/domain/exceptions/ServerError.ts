/**
 * Represents a server error with a specific error code.
 *
 * @extends {Error}
 */
export default class ServerError extends Error {
  public code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "ServerError";
    this.code = code;
  }
}
