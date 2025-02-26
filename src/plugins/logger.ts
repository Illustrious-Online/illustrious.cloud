import process from "node:process";
import type Elysia from "elysia";
import * as yc from "yoctocolors";
import { durationString, methodString } from "../utils/logger";

/**
 * A plugin for the Elysia framework that logs request details and errors.
 *
 * @param {Elysia} app - The Elysia application instance.
 * @returns {Elysia} The Elysia application instance with logging functionality.
 *
 * @example
 * import logger from './plugins/logger';
 * const app = new Elysia();
 * app.use(logger);
 *
 * This plugin adds the following functionalities:
 * - Sets an initial state with the current high-resolution time.
 * - Logs the request method, URL path, and duration for each request.
 * - Logs errors with the request method, URL path, error status, and message.
 *
 * The log format includes:
 * - Request method (e.g., GET, POST)
 * - URL path (e.g., /api/v1/resource)
 * - Duration of the request handling in nanoseconds
 * - Error status and message (if an error occurs)
 *
 * The plugin uses the following hooks:
 * - `onRequest`: Sets the start time before handling the request.
 * - `onBeforeHandle`: Updates the start time before handling the request.
 * - `onAfterHandle`: Logs the request details after handling the request.
 * - `onError`: Logs the error details if an error occurs during request handling.
 */
export default (app: Elysia) =>
  app
    .state({ beforeTime: process.hrtime.bigint(), as: "global" })
    .onRequest((ctx) => {
      ctx.store.beforeTime = process.hrtime.bigint();
    })
    .onBeforeHandle({ as: "global" }, (ctx) => {
      ctx.store.beforeTime = process.hrtime.bigint();
    })
    .onAfterHandle({ as: "global" }, ({ request, store }) => {
      const logStr: string[] = [];

      logStr.push(methodString(request.method));
      logStr.push(new URL(request.url).pathname);

      const beforeTime: bigint = store.beforeTime;

      logStr.push(durationString(beforeTime));

      console.log(logStr.join(" "));
    })
    .onError({ as: "global" }, ({ request, error, store }) => {
      const logStr: string[] = [];

      logStr.push(yc.red(methodString(request.method)));
      logStr.push(new URL(request.url).pathname);
      logStr.push(yc.red("Error"));

      if ("status" in error) {
        logStr.push(String(error.status));
      }

      if ("message" in error) {
        logStr.push(error.message);
      }

      const beforeTime: bigint = store.beforeTime;
      logStr.push(durationString(beforeTime));

      console.log(logStr.join(" "));
    });
