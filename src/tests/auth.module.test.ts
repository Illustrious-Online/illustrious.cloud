import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import { faker } from "@faker-js/faker";

import { deleteRequest, getRequest } from ".";
import { app } from "../app";
import config from "../config";
import AuthUserInfo from "../domain/interfaces/authUserInfo";
import Tokens from "../domain/interfaces/tokens";
import * as authService from "../services/auth";
import { MockResult, mockModule } from "./mock.util";
import { generateData } from "./model.util";

let mocks: MockResult[] = [];
const data = generateData(["user", "tokens"]);

const suiteMocks = async () => {
  mocks.push(
    await mockModule("../plugins/auth.ts", () =>
      jest.fn(() => Promise.resolve(true)),
    ),
    await mockModule("../services/auth.ts", () => ({
      getTokens: jest.fn(() => Promise.resolve(data.tokens as Tokens)),
    })),
    await mockModule("jsonwebtoken", () => ({
      verify: jest.fn(() => Promise.resolve(true)),
    })),
    await mockModule("jwt-decode", () => ({
      jwtDecode: jest.fn(() => {
        return data.userData as AuthUserInfo;
      }),
    })),
  );
};

describe("Auth Module", () => {
  afterEach(() => {
    mocks.forEach((mockResult) => mockResult.clear());
    mocks = [];
  });

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
    mocks.push(
      await mockModule("../plugins/auth.ts", () =>
        jest.fn(() => Promise.resolve(true)),
      ),
      await mockModule("../services/auth.ts", () => ({
        getTokens: jest.fn(() =>
          Promise.resolve({
            access_token: "access_token",
            refresh_token: "refresh_token",
            id_token: "",
          } as Tokens),
        ),
      })),
    );
    const response = await app.handle(getRequest("/auth/success?code=123"));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Failed to obtain all required tokens",
      code: 409,
    });
  });

  it("GET /auth/success throws jwt decode error", async () => {
    mocks.push(
      await mockModule("../plugins/auth.ts", () =>
        jest.fn(() => Promise.resolve(true)),
      ),
      await mockModule("../services/auth.ts", () => ({
        getTokens: jest.fn(() => Promise.resolve(data.tokens as Tokens)),
      })),
      await mockModule("jsonwebtoken", () => ({
        verify: jest.fn(() => Promise.resolve(true)),
      })),
    );

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
    await suiteMocks();

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

  it("GET /auth/success sucxcessfully redirect with existing email", async () => {
    data.userData!.sub = newSub;
    await suiteMocks();

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
    data.userData!.email = newEmail;
    await suiteMocks();

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
    mocks.push(
      await mockModule("../plugins/auth.ts", () => ({
        getTokens: jest.fn(() => Promise.resolve(true)),
      })),
      await mockModule("jsonwebtoken", () => ({
        verify: jest.fn(() => Promise.resolve(true)),
      })),
      await mockModule("jwt-decode", () => ({
        jwtDecode: jest.fn(() => Promise.resolve({ sub: undefined })),
      })),
    );

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
    mocks.push(
      await mockModule("../plugins/auth.ts", () => ({
        getTokens: jest.fn(() => Promise.resolve(true)),
      })),
      await mockModule("jsonwebtoken", () => ({
        verify: jest.fn(() => Promise.resolve(true)),
      })),
      await mockModule("jwt-decode", () => ({
        jwtDecode: jest.fn(() => Promise.resolve({ sub: undefined })),
      })),
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(newSub)),
      })),
    );

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
