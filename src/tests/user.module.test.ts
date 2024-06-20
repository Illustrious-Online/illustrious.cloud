import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import { faker } from "@faker-js/faker";

import moment from "moment";
import { deleteRequest, getRequest, postRequest, putRequest } from ".";
import { app } from "../app";
import AuthUserInfo from "../domain/interfaces/authUserInfo";
import Tokens from "../domain/interfaces/tokens";
import * as authService from "../services/auth";
import * as invoiceService from "../services/invoice";
import * as orgService from "../services/org";
import * as reportService from "../services/report";
import { MockResult, mockModule } from "./mock.util";
import { generateData } from "./model.util";

let mocks: MockResult[] = [];
const data = generateData([
  "user", "tokens", "invoice", "report", "org"
]);

const suiteMocks = async () => {
  mocks.push(
    await mockModule("../plugins/auth.ts", () => jest.fn(() => Promise.resolve(true))),
    await mockModule("../services/auth.ts", () => ({
      getTokens: jest.fn(() => Promise.resolve(data.tokens as Tokens)),
    })),
    await mockModule("jsonwebtoken", () => ({
      verify: jest.fn(() => Promise.resolve(true)),
    })),
    await mockModule("jwt-decode", () => ({
      jwtDecode: jest.fn(() => Promise.resolve(data.userData as AuthUserInfo)),
    })),
  );
};

describe("User Module", async () => {
  beforeEach(async () => {
    await suiteMocks();
  });

  afterEach(() => {
      mocks.forEach((mockResult) => mockResult.clear());
      mocks = [];
  });

  it("POST /users creates a new User successfully", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    const response = await app.handle(postRequest("/users", data.user!));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User created successfully.",
      data: data.user,
    });
  });

  it("GET /users throws bad request error", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(undefined)),
      }))
    );

    const response = await app.handle(getRequest(`/users`, true));
    expect(response.ok).toBeFalse();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Failed to fetch user with provided details",
      code: 400,
    });
  });

  it("GET /me fetches user information based on token", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    await authService.create({
      userId: data.user!.id,
      authId: faker.string.uuid(),
      sub: data.userData!.sub,
    });

    const response = await app.handle(getRequest("/me", true));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User details fetched successfully!",
      data: data.user,
    });
  });

  it("GET /users?include=orgs returns User data including list of Orgs", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    await orgService.create({
      user: data.user!.id,
      org: data.org!,
    });

    const response = await app.handle(getRequest(`/users?include=orgs`, true));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User & details fetched successfully",
      data: {
        user: data.user,
        orgs: [data.org!],
      },
    });
  });

  it("GET /users?include=reports returns User data including list of reports", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    await reportService.create({
      user: data.user!.id,
      org: data.org!.id,
      report: data.report!,
    });

    const response = await app.handle(
      getRequest(`/users?include=reports`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User & details fetched successfully",
      data: {
        user: data.user,
        reports: [data.report!],
      },
    });
  });

  it("GET /users?include=invoices returns User data including list of invoices", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    await invoiceService.create({
      user: data.user!.id,
      org: data.org!.id,
      invoice: data.invoice!,
    });

    const response = await app.handle(
      getRequest(`/users?include=invoices`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    const newInvoice = json.data.invoices[0];

    newInvoice.start = moment(json.start).toDate();
    newInvoice.end = moment(json.end).toDate();
    newInvoice.due = moment(json.due).toDate();

    expect(json).toMatchObject({
      message: "User & details fetched successfully",
      data: {
        user: data.user,
        invoices: [newInvoice],
      },
    });
  });

  it("GET /users/reports returns all Reports associated with User", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    const response = await app.handle(getRequest(`/users/reports`, true));
    expect(response.ok).toBeTrue();
    const json = await response.json();

    expect(json).toMatchObject({
      message: "User resources fetched successfully.",
      data: {
        reports: [data.report!],
      },
    });
  });

  it("GET /users/invoices returns all Invoices associated with User", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    const response = await app.handle(getRequest(`/users/invoices`, true));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    const newInvoice = json.data.invoices[0];

    newInvoice.start = moment(json.start).toDate();
    newInvoice.end = moment(json.end).toDate();
    newInvoice.due = moment(json.due).toDate();

    expect(json).toMatchObject({
      message: "User resources fetched successfully.",
      data: {
        invoices: [newInvoice],
      },
    });
  });

  it("GET /users/orgs returns all Orgs associated with User", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    const response = await app.handle(getRequest(`/users/orgs`, true));
    expect(response.ok).toBeTrue();
    const json = await response.json();

    expect(json).toMatchObject({
      message: "User resources fetched successfully.",
      data: {
        orgs: [data.org!],
      },
    });
  });

  it("PUT /users/:id updates the current User", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    data.user!.firstName = faker.person.firstName();
    data.user!.lastName = faker.person.lastName();

    const response = await app.handle(
      putRequest(`/users/${data.user!.id}`, data.user!),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      data: data.user,
      message: "User updated successfully.",
    });
  });

  it("DELETE /users/:id removes the User data", async () => {
    mocks.push(
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
      }))
    );

    const response = await app.handle(
      deleteRequest(`/users/${data.user!.id}`, true),
    );
    const json = await response.json();

    expect(response.ok).toBeTrue;
    expect(json).toMatchObject({
      message: "User deleted successfully.",
    });
  });
});
