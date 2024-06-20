import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

import moment from "moment";
import { deleteRequest, getRequest, postRequest, putRequest } from "../";
import { app } from "../../app";
import AuthUserInfo from "../../domain/interfaces/authUserInfo";
import Tokens from "../../domain/interfaces/tokens";
import * as authService from "../../services/auth";
import * as invoiceService from "../../services/invoice";
import * as reportService from "../../services/report";
import * as userService from "../../services/user";

let userSub = faker.string.uuid();
const testUser = {
  id: uuidv4(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: faker.phone.number(),
  picture: faker.internet.url(),
};
const userData = {
  sub: userSub,
  email: testUser.email,
  given_name: testUser.firstName,
  family_name: testUser.lastName,
  phone_number: testUser.phone,
  picture: testUser.picture,
};
const fakeTokens = {
  access_token: "access_token",
  refresh_token: "refresh_token",
  id_token: "id_token",
};
const uuids = {
  auth: uuidv4(),
  report: uuidv4(),
  invoice: uuidv4(),
  org: uuidv4(),
};
const invoice = {
  id: uuids.invoice,
  owner: testUser.id,
  value: faker.finance.amount(),
  paid: false,
  start: faker.date.recent({ days: 15 }),
  end: faker.date.soon({ days: 15 }),
  due: faker.date.soon({ days: 20 }),
};
const org = {
  id: uuids.org,
  name: faker.company.name(),
  contact: testUser.email,
};
const report = {
  id: uuids.report,
  owner: testUser.id,
  rating: faker.number.int({ min: 0, max: 10 }),
  notes: faker.lorem.lines(3),
};

const suiteMocks = async () => {
  await mock.module("../../plugins/auth.ts", async () => true);
  await mock.module("jsonwebtoken", () => {
    return {
      verify: () => {
        return true;
      },
    };
  });
  await mock.module("../../services/auth.ts", () => {
    return {
      getTokens: () => {
        return fakeTokens as Tokens;
      },
    };
  });
  await mock.module("jwt-decode", () => {
    return {
      jwtDecode: () => {
        return userData as AuthUserInfo;
      },
    };
  });
};

describe("Org Module", async () => {
  it("POST /orgs creates a new Org successfully", async () => {
    await suiteMocks();
    await mock.module("../../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    await userService.create(testUser);
    await authService.create({
      userId: testUser.id,
      authId: uuids.auth,
      sub: userData.sub,
    });

    const response = await app.handle(postRequest("/orgs", org));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Organization created successfully.",
      data: org,
    });
  });

  it("GET /orgs/res throws bad request error", async () => {
    await suiteMocks();
    await mock.module("../../utils/extract-sub.ts", async () => {
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
    await mock.module("../../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    const response = await app.handle(
      getRequest(`/orgs/${org.id}?include=users`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Organization & details fetched successfully",
      data: {
        org,
        users: [testUser],
      },
    });
  });

  it("GET /orgs/:id?include=reports returns Org data including list of reports", async () => {
    await suiteMocks();
    await mock.module("../../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    await reportService.create({
      user: testUser.id,
      org: uuids.org,
      report,
    });

    const response = await app.handle(
      getRequest(`/orgs/${org.id}?include=reports`, true),
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
    await mock.module("../../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    await invoiceService.create({
      user: testUser.id,
      org: uuids.org,
      invoice,
    });

    const response = await app.handle(
      getRequest(`/orgs/${org.id}?include=invoices`, true),
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
      getRequest(`/orgs/res/reports/${org.id}`, true),
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
      getRequest(`/orgs/res/invoices/${org.id}`, true),
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
      getRequest(`/orgs/res/users/${org.id}`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Organization resources fetched successfully.",
      data: {
        users: [testUser],
      },
    });
  });

  it("PUT /orgs/:id updates the current Org", async () => {
    await suiteMocks();

    org.contact = faker.internet.email();
    org.name = faker.company.name();

    const response = await app.handle(putRequest(`/orgs/${org.id}`, org));
    const json = await response.json();

    expect(json).toMatchObject({
      data: org,
      message: "Organization updated successfully.",
    });
  });

  it("DELETE /orgs/:id removes the Org data", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    const response = await app.handle(deleteRequest(`/orgs/${org.id}`, true));
    const json = await response.json();

    expect(response.ok).toBeTrue;
    expect(json).toMatchObject({
      message: "Organization deleted successfully.",
    });
  });
});
