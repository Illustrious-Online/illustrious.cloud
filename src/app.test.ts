import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import config from "./config";

const url = `http://${config.app.host}:${config.app.port}`;

beforeAll(async () => {
  await import("./app");
  await new Promise((resolve) => setTimeout(resolve, 1500));
});

afterAll(async () => {
  console.log("Shutting down the server after tests...");
});

describe("GET /", () => {
  it("should return a 200 status and a message", async () => {
    const response = await fetch(url);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe(config.app.name);
    expect(data.version).toBe(config.app.version);
  });
});

describe("GET /missing", () => {
  it("should return 401 for unauthorized requests", async () => {
    const response = await fetch(`${url}/missing`);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe("Not Found!");
  });
});
