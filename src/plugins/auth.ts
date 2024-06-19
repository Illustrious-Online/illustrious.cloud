import * as fs from "fs";
import { Readable } from "stream";
import { Elysia } from "elysia";
import { JsonWebTokenError, verify } from "jsonwebtoken";

import config from "../config";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";

export default (app: Elysia) =>
  // @ts-expect-error This remains valid after JWT is implemented.
  app.derive(async ({ bearer }) => {
    if (!bearer) {
      throw new UnauthorizedError("Access token is missing!");
    }

    await fetch(`${config.auth.url}/pem`).then((response) => {
      if (response.body) {
        let writer = fs.createWriteStream("public.pem");
        // @ts-expect-error
        Readable.fromWeb(response.body).pipe(writer);
      }
    });

    const secret = fs.readFileSync("public.pem");
    fs.unlinkSync("public.pem");

    try {
      verify(bearer, secret, { algorithms: ["RS256"] });
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedError(error.message);
      }
    }

    return true;
  });
