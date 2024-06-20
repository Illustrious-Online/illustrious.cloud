import { afterEach, beforeEach, describe, expect, it, jest, mock } from "bun:test";
import { faker } from "@faker-js/faker";

import moment from "moment";
import { deleteRequest, getRequest, postRequest, putRequest } from ".";
import { app } from "../app";
import AuthUserInfo from "../domain/interfaces/authUserInfo";
import Tokens from "../domain/interfaces/tokens";
import * as authService from "../services/auth";
import * as invoiceService from "../services/invoice";
import * as reportService from "../services/report";
import * as userService from "../services/user";
import { generateData } from "./model.util";
import { MockResult, mockModule } from "./mock.util";
import invoice from "../routes/invoice";
import org from "../routes/org";
import report from "../routes/report";

let mocks: MockResult[] = [];
const data = generateData([
  "user", "tokens", "invoice", "org", "report"
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
      jwtDecode: jest.fn(() => Promise.resolve(data.userData! as AuthUserInfo)),
    })),
  );
};

describe("Org Module", async () => {
  beforeEach(async () => {
    await suiteMocks();
  });

  afterEach(() => {
      mocks.forEach((mockResult) => mockResult.clear());
      mocks = [];
  });

  it("POST /orgs creates a new Org successfully", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return data.userData!.sub;
        },
      };
    });

    await userService.create(data.user!);
    await authService.create({
      userId: data.user!.id,
      authId: faker.string.uuid(),
      sub: data.userData!.sub,
    });

    const response = await app.handle(postRequest("/orgs", data.org!));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Organization created successfully.",
      data: data.org!,
    });
  });

  it("GET /orgs/res throws bad request error", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return undefined;
        },
      };
    });

    const response = await app.handle(getRequest(`/orgs/res`, true));
    expect(response.ok).toBeFalse();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Bad Request!",
      code: 400,
    });
  });

  it("GET /orgs/:id?include=users returns Org data including list of Users", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return data.userData!.sub;
        },
      };
    });

    const response = await app.handle(
      getRequest(`/orgs/${data.org!.id}?include=users`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Organization & details fetched successfully",
      data: {
        org,
        users: [data.user!],
      },
    });
  });

  it("GET /orgs/:id?include=reports returns Org data including list of reports", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return data.userData!.sub;
        },
      };
    });

    await reportService.create({
      user: data.user!.id,
      org: data.org!.id,
      report: data.report!,
    });

    const response = await app.handle(
      getRequest(`/orgs/${data.org!.id}?include=reports`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Organization & details fetched successfully",
      data: {
        org,
        reports: [report],
      },
    });
  });

  it("GET /orgs/:id?include=invoices returns Org data including list of invoices", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return data.userData!.sub;
        },
      };
    });

    await invoiceService.create({
      user: data.user!.id,
      org: data.org!.id,
      invoice: data.invoice!,
    });

    const response = await app.handle(
      getRequest(`/orgs/${data.org!.id}?include=invoices`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    const newInvoice = json.data.invoices[0];

    newInvoice.start = moment(json.start).toDate();
    newInvoice.end = moment(json.end).toDate();
    newInvoice.due = moment(json.due).toDate();

    expect(json).toMatchObject({
      message: "Organization & details fetched successfully",
      data: {
        org,
        invoices: [newInvoice],
      },
    });
  });

  it("GET /orgs/res/reports/:id returns all Reports associated with Org", async () => {
    const response = await app.handle(
      getRequest(`/orgs/res/reports/${data.org!.id}`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Organization resources fetched successfully.",
      data: {
        reports: [report],
      },
    });
  });

  it("GET /orgs/res/invoices/:id returns all Invoices associated with Org", async () => {
    const response = await app.handle(
      getRequest(`/orgs/res/invoices/${data.org!.id}`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    const newInvoice = json.data.invoices[0];

    newInvoice.start = moment(json.start).toDate();
    newInvoice.end = moment(json.end).toDate();
    newInvoice.due = moment(json.due).toDate();

    expect(json).toMatchObject({
      message: "Organization resources fetched successfully.",
      data: {
        invoices: [newInvoice],
      },
    });
  });

  it("GET /orgs/res/users/:id returns all Users associated with Org", async () => {
    const response = await app.handle(
      getRequest(`/orgs/res/users/${data.org!.id}`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Organization resources fetched successfully.",
      data: {
        users: [data.user!],
      },
    });
  });

  it("PUT /orgs/:id updates the current Org", async () => {
    await suiteMocks();

    data.org!.contact = faker.internet.email();
    data.org!.name = faker.company.name();

    const response = await app.handle(putRequest(`/orgs/${data.org!.id}`, data.org!));
    const json = await response.json();

    expect(json).toMatchObject({
      data: data.org!,
      message: "Organization updated successfully.",
    });
  });

  it("DELETE /orgs/:id removes the Org data", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return data.userData!.sub;
        },
      };
    });

    const response = await app.handle(deleteRequest(`/orgs/${data.org!.id}`, true));
    const json = await response.json();

    expect(response.ok).toBeTrue;
    expect(json).toMatchObject({
      message: "Organization deleted successfully.",
    });
  });
});
