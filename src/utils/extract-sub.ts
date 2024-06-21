import { jwtDecode } from "jwt-decode";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";

export const getSub = async (authorization: string): Promise<string> => {
  const token = jwtDecode(authorization);
  const { sub } = token;

  if (!sub) {
    throw new UnauthorizedError(
      "Unable to continue: Failed to obtain user sub from token",
    );
  }

  return sub;
};
