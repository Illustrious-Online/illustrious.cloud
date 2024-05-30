import { describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";

import { NotFoundError } from "elysia";
import { getRequest } from ".";
import { User } from "../../drizzle/schema";
import { app } from "../app";
import { mockModule } from "../utils/mock";
import { mocks } from "./setup";

describe("Elysia", () => {
  it('Auth Module: "/auth/success" throws exception for missing code', async () => {
    const response = await app.handle(getRequest("/auth/success"));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Authorization code is required.",
      code: 409,
    });
  });

  it('Auth Module: "/auth/success" throws exception with invalid code', async () => {
    const response = await app.handle(getRequest("/auth/success?code=123"));
    expect(response.ok).toBeFalse;

    const json = await response.json();
    expect(json).toMatchObject({
      message: "invalid_grant: Invalid authorization code",
      code: 403,
    });
  });

  it('Auth Module: "/auth/success" throws exception with invalid token', async () => {
    mocks.push(
      await mockModule("../services/auth.ts", () => {
        return {
          getTokens: () => {
            return {
              access_token: "access_token",
              refresh_token: "refresh_token",
              id_token: null,
            };
          },
        };
      }),
    );

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Failed to obtain all required tokens",
      code: 409,
    });
  });

  it('Auth Module: "/auth/success" successfully redirect brand new user', async () => {
    mocks.push(
      await mockModule("../services/auth.ts", () => {
        return {
          getTokens: () => {
            return {
              access_token: "access_token",
              refresh_token: "refresh_token",
              id_token: "id_token",
            };
          },
        };
      }),
    );

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const json = await response.json();

    expect(response.ok).toBeFalse;
    expect(json).toMatchObject({
      message: "Invalid token specified: missing part #2",
      code: 503,
    });
  });

  it('Auth Module: "/auth/success" successfully redirect brand new user', async () => {
    mocks.push(
      await mockModule("../services/auth.ts", () => {
        return {
          getTokens: () => {
            return {
              access_token: "access_token",
              refresh_token: "refresh_token",
              id_token: "id_token",
            };
          },
        };
      }),
      await mockModule("jwt-decode", () => {
        return {
          jwtDecode: () => {
            return {
              sub: faker.string.uuid(),
              email: faker.internet.email(),
              given_name: faker.person.firstName(),
              family_name: faker.person.lastName(),
              phone_number: faker.phone.number(),
              picture: faker.internet.url(),
            };
          },
        };
      }),
    );

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const location = response.headers.get("location");

    expect(response.ok).toBeTrue;
    expect(location).toBe(
      "http://localhost:8000?accessToken=access_token&refreshToken=refresh_token",
    );
    expect(response.status).toBe(302);
  });

  it('Auth Module: "/auth/success" successfully redirect brand new user', async () => {
    mocks.push(
      await mockModule("../services/auth.ts", () => {
        return {
          getTokens: () => {
            return {
              access_token: "access_token",
              refresh_token: "refresh_token",
              id_token: "id_token",
            };
          },
        };
      }),
      await mockModule("jwt-decode", () => {
        return {
          jwtDecode: () => {
            return {
              sub: faker.string.uuid(),
              email: faker.internet.email(),
              given_name: faker.person.firstName(),
              family_name: faker.person.lastName(),
              phone_number: faker.phone.number(),
              picture: faker.internet.url(),
            };
          },
        };
      }),
    );

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const location = response.headers.get("location");

    expect(response.ok).toBeTrue;
    expect(location).toBe(
      "http://localhost:8000?accessToken=access_token&refreshToken=refresh_token",
    );
    expect(response.status).toBe(302);
  });

  it('Auth Module: "/auth/success" successfully redirect brand new user', async () => {
    mocks.push(
      await mockModule("../services/auth.ts", () => {
        return {
          getTokens: () => {
            return {
              access_token: "access_token",
              refresh_token: "refresh_token",
              id_token: "id_token",
            };
          },
        };
      }),
      await mockModule("jwt-decode", () => {
        return {
          jwtDecode: () => {
            return {
              sub: faker.string.uuid(),
              email: faker.internet.email(),
              given_name: faker.person.firstName(),
              family_name: faker.person.lastName(),
              phone_number: faker.phone.number(),
              picture: faker.internet.url(),
            };
          },
        };
      }),
    );

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const location = response.headers.get("location");

    expect(response.ok).toBeTrue;
    expect(location).toBe(
      "http://localhost:8000?accessToken=access_token&refreshToken=refresh_token",
    );
    expect(response.status).toBe(302);
  });
});
