import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";

import { deleteRequest, getRequest } from ".";
import { app } from "../app";
import AuthUserInfo from "../domain/interfaces/authUserInfo";
import Tokens from "../domain/interfaces/tokens";
import * as authService from "../services/auth";
import config from "../config";

let userSub = faker.string.uuid();
const testUser = {
  sub: userSub,
  email: faker.internet.email(),
  given_name: faker.person.firstName(),
  family_name: faker.person.lastName(),
  phone_number: faker.phone.number(),
  picture: faker.internet.url(),
};
const fakeTokens = {
  access_token: "access_token",
  refresh_token: "refresh_token",
  id_token: "id_token",
};

const suiteMocks = async () => {
  await mock.module("../plugins/auth.ts", async () => true);
  await mock.module("jsonwebtoken", () => {
    return {
      verify: () => {
        return true;
      },
    };
  });
  await mock.module("../services/auth.ts", () => {
    return {
      getTokens: () => {
        return fakeTokens as Tokens;
      },
    };
  });
  await mock.module("jwt-decode", () => {
    return {
      jwtDecode: () => {
        return testUser as AuthUserInfo;
      },
    };
  });
};

describe("Auth Module", () => {
  it("GET /auth/success throws exception for invalid code", async () => {
    const response = await app.handle(getRequest("/auth/success?code=123"));
    expect(response.ok).toBeFalse;

    const json = await response.json();
    expect(json).toMatchObject({
      message: "invalid_grant: Invalid authorization code",
      code: 403,
    });
  });

  it("GET /auth/success throws exception for missing token", async () => {
    await mock.module("../services/auth.ts", () => {
      return {
        getTokens: () => {
          return {
            access_token: "access_token",
            refresh_token: "refresh_token",
            id_token: null,
          };
        },
      };
    });

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Failed to obtain all required tokens",
      code: 409,
    });
  });

  it("GET /auth/success throws jwt decode error", async () => {
    await mock.module("../services/auth.ts", () => {
      return {
        getTokens: () => {
          return fakeTokens as Tokens;
        },
      };
    });

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const json = await response.json();

    expect(response.ok).toBeFalse;
    expect(json).toMatchObject({
      message: "Invalid token specified: missing part #2",
      code: 503,
    });
  });

  it("GET /auth/success successfully redirect brand new user", async () => {
    await suiteMocks();

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const location = response.headers.get("location");
    const { url } = config.app;

    expect(response.ok).toBeTrue;
    expect(location).toContain(
      `${url}?accessToken=access_token&refreshToken=refresh_token`,
    );
    expect(response.status).toBe(302);
  });

  it("GET /auth/success successfully redirect with existing sub", async () => {
    const response = await app.handle(getRequest("/auth/success?code=123"));
    const location = response.headers.get("location");
    const { url } = config.app;

    expect(response.ok).toBeTrue;
    expect(location).toBe(
      `${url}?accessToken=access_token&refreshToken=refresh_token`,
    );
    expect(response.status).toBe(302);
  });

  const newSub = faker.string.uuid();

  it("GET /auth/success successfully redirect with existing email", async () => {
    testUser.sub = newSub;

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const location = response.headers.get("location");
    const { url } = config.app;

    expect(response.ok).toBeTrue;
    expect(location).toBe(
      `${url}?accessToken=access_token&refreshToken=refresh_token`,
    );
    expect(response.status).toBe(302);
  });

  const newEmail = faker.internet.email();

  it("GET /auth/success successfully redirect with new email", async () => {
    testUser.email = newEmail;

    const response = await app.handle(getRequest("/auth/success?code=123"));
    const location = response.headers.get("location");
    const { url } = config.app;

    expect(response.ok).toBeTrue;
    expect(location).toBe(
      `${url}?accessToken=access_token&refreshToken=refresh_token`,
    );
    expect(response.status).toBe(302);
  });

  it("LOGOUT /auth/logout successfully logs user out", async () => {
    const response = await app.handle(getRequest("/auth/logout"));
    const location = response.headers.get("location");
    const { dashboardUrl } = config.app;

    expect(response.ok).toBeTrue;
    expect(location).toContain(dashboardUrl);
    expect(response.status).toBe(301);
  });

  it("DELETE /auth/delete throws error for failed sub extract", async () => {
    await mock.module("../plugins/auth.ts", async () => true);
    await mock.module("jwt-decode", () => {
      return {
        jwtDecode: () => {
          return { sub: undefined };
        },
      };
    });

    const auth = await authService.fetchOne({ sub: newSub });
    const response = await app.handle(
      deleteRequest(`/auth/delete/${auth.id}`, true),
    );
    const json = await response.json();

    expect(response.ok).toBeFalse;
    expect(json).toMatchObject({
      code: 401,
      message: "Unable to continue: Failed to obtain user sub from token",
    });
  });

  it("DELETE /auth/delete successfully deletes User", async () => {
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return newSub;
        },
      };
    });

    const auth = await authService.fetchOne({ sub: newSub });
    const response = await app.handle(
      deleteRequest(`/auth/delete/${auth.id}`, true),
    );
    const json = await response.json();

    expect(response.ok).toBeTrue;
    expect(json).toMatchObject({
      message: "Successfully deleted requested authentaction",
    });
  });
});
