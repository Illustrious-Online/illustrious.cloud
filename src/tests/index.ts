import path from "path";

import config from "../config";

export const baseUrl = `http://${config.app.host}:${config.app.port}`;

/**
 * Represents a request.
 *
 * @param {string} route The route.
 * @returns {Request}
 */
export function getRequest(route: string, auth?: boolean): Request {
  const fullPath = path.join(baseUrl, route);

  if (auth) {
    return new Request(fullPath, {
      headers: {
        Authorization: "Bearer abcFaker123",
      },
    });
  }

  return new Request(fullPath);
}

/**
 * Represents a POST request.
 *
 * @param {string} route The route.
 * @param {Payload} payload The payload.
 * @returns
 */
export function postRequest<Payload extends Record<string, unknown>>(
  route: string,
  payload: Payload,
) {
  const fullPath = path.join(baseUrl, route);

  return new Request(fullPath, {
    method: "POST",
    headers: {
      Authorization: "Bearer abcFaker123",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Represents a PUT request.
 *
 * @param {string} route The route.
 * @param {Payload} payload The payload.
 * @returns
 */
export function putRequest<Payload extends Record<string, unknown>>(
  route: string,
  payload: Payload,
) {
  const fullPath = path.join(baseUrl, route);

  return new Request(fullPath, {
    method: "PUT",
    headers: {
      Authorization: "Bearer abcFaker123",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Represents a DEL request.
 *
 * @param {string} route The route.
 * @param {boolean} token If the request should include an authorization token.
 * @returns
 */
export function deleteRequest<Payload extends Record<string, unknown>>(
  route: string,
  token: boolean,
) {
  const fullPath = path.join(baseUrl, route);

  return new Request(fullPath, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? "Bearer abcFaker123" : "",
    },
  });
}
