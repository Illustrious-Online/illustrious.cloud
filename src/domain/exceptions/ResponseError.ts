/**
 * Represents an error response with a specific HTTP status code and message.
 *
 * @extends {Error}
 */
export default class ResponseError extends Error {
  constructor(
    public status: number,
    public message: string,
  ) {
    super(message);

    this.status = status;
  }
}
