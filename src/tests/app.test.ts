import { describe, expect, it } from "bun:test";

import { getRequest } from ".";
import { app } from "../app";
import config from "../config";

describe("Elysia", () => {
  it('"/" returns config details ', async () => {
    const response = await app.handle(getRequest("/"));
    const json = await response.json();

    expect(json).toMatchObject({
      name: config.app.name,
      version: config.app.version,
    });
  });
});
