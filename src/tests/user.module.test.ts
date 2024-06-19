import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

import moment from "moment";
import { deleteRequest, getRequest, postRequest, putRequest } from ".";
import { app } from "../app";
import AuthUserInfo from "../domain/interfaces/authUserInfo";
import Tokens from "../domain/interfaces/tokens";
import * as authService from "../services/auth";
import * as invoiceService from "../services/invoice";
import * as orgService from "../services/org";
import * as reportService from "../services/report";
import * as userService from "../services/user";

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
        return userData as AuthUserInfo;
      },
    };
  });
};

describe("User Module", async () => {
  it("POST /users creates a new User successfully", async () => {
    await suiteMocks();

    const response = await app.handle(postRequest("/users", testUser));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User created successfully.",
      data: testUser,
    });
  });

  it("GET /users throws bad request error", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return undefined;
        },
      };
    });

    const response = await app.handle(getRequest(`/users`, true));
    expect(response.ok).toBeFalse();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "Failed to fetch user with provided details",
      code: 400,
    });
  });

  it("GET /me fetches user information based on token", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    await authService.create({
      userId: testUser.id,
      authId: uuids.auth,
      sub: userData.sub,
    });

    const response = await app.handle(getRequest("/me", true));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User details fetched successfully!",
      data: testUser,
    });
  });

  it("GET /users?include=orgs returns User data including list of Orgs", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    await orgService.create({
      user: testUser.id,
      org,
    });

    const response = await app.handle(getRequest(`/users?include=orgs`, true));
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User & details fetched successfully",
      data: {
        user: testUser,
        orgs: [org],
      },
    });
  });

  it("GET /users?include=reports returns User data including list of reports", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
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
      getRequest(`/users?include=reports`, true),
    );
    expect(response.ok).toBeTrue();
    const json = await response.json();
    expect(json).toMatchObject({
      message: "User & details fetched successfully",
      data: {
        user: testUser,
        reports: [report],
      },
    });
  });

  it("GET /users?include=invoices returns User data including list of invoices", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
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
        user: testUser,
        invoices: [newInvoice],
      },
    });
  });

  it("GET /users/reports returns all Reports associated with User", async () => {
    const response = await app.handle(getRequest(`/users/reports`, true));
    expect(response.ok).toBeTrue();
    const json = await response.json();

    expect(json).toMatchObject({
      message: "User resources fetched successfully.",
      data: {
        reports: [report],
      },
    });
  });

  it("GET /users/invoices returns all Invoices associated with User", async () => {
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
    const response = await app.handle(getRequest(`/users/orgs`, true));
    expect(response.ok).toBeTrue();
    const json = await response.json();

    expect(json).toMatchObject({
      message: "User resources fetched successfully.",
      data: {
        orgs: [org],
      },
    });
  });

  it("PUT /users/:id updates the current User", async () => {
    await suiteMocks();

    testUser.firstName = faker.person.firstName();
    testUser.lastName = faker.person.lastName();

    const response = await app.handle(
      putRequest(`/users/${testUser.id}`, testUser),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      data: testUser,
      message: "User updated successfully.",
    });
  });

  it("DELETE /users/:id removes the User data", async () => {
    await suiteMocks();
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return userData.sub;
        },
      };
    });

    const response = await app.handle(
      deleteRequest(`/users/${testUser.id}`, true),
    );
    const json = await response.json();

    expect(response.ok).toBeTrue;
    expect(json).toMatchObject({
      message: "User deleted successfully.",
    });
  });
});
