import path from 'path';

import config from '../config';

export const baseUrl = `http://${config.app.host}:${config.app.port}`;

/**
 * Represents a request.
 *
 * @param {string} route The route.
 * @returns {Request}
 */
export function getRequest(route: string): Request {
  const fullPath = path.join(baseUrl, route);

  return new Request(fullPath);
}

/**
 * Represents a POST request.
 *
 * @param {string} route The route.
 * @param {Payload} payload The payload.
 * @returns
 */
export function postRequest<Payload extends Record<string, unknown>>(route: string, payload: Payload) {
  const fullPath = path.join(baseUrl, route);

  return new Request(fullPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}