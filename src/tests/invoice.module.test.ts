import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

import moment from "moment";
import { deleteRequest, getRequest, postRequest, putRequest } from ".";
import { Invoice } from "../../drizzle/schema";
import { app } from "../app";
import * as authService from "../services/auth";
import * as orgService from "../services/org";
import * as userService from "../services/user";

const invoiceUser = {
  sub: faker.string.uuid(),
  email: faker.internet.email(),
  given_name: faker.person.firstName(),
  family_name: faker.person.lastName(),
  phone_number: faker.phone.number(),
  picture: faker.internet.url(),
};

const tempInvoiceUser = {
  id: faker.string.uuid(),
  email: invoiceUser.email,
  firstName: invoiceUser.given_name,
  lastName: invoiceUser.family_name,
  phone: invoiceUser.phone_number,
  picture: invoiceUser.picture,
};

const invoiceOrg = {
  id: faker.string.uuid(),
  name: faker.company.name(),
  contact: tempInvoiceUser.email,
};

const tempInvoice: Invoice = {
  id: faker.string.uuid(),
  owner: tempInvoiceUser.id,
  paid: false,
  value: faker.finance.amount(),
  start: faker.date.recent({ days: 15 }),
  end: faker.date.soon({ days: 15 }),
  due: faker.date.soon({ days: 20 }),
};

const suiteMocks = async () => {
  await mock.module("../plugins/auth.ts", async () => true);
  await mock.module("../utils/extract-sub.ts", async () => {
    return {
      getSub: () => {
        return invoiceUser.sub;
      },
    };
  });
  await mock.module("jsonwebtoken", () => {
    return {
      verify: () => {
        return true;
      },
    };
  });
  await mock.module("jwt-decode", () => {
    return {
      jwtDecode: () => {
        return invoiceUser;
      },
    };
  });
};

describe("Invoice Module", () => {
  it("GET /invoices/:id throws bad request exception if information is missing", async () => {
    const response = await app.handle(postRequest(`/invoices`, {}));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Bad Request!",
      code: 400,
    });
  });

  it("POST /invoices successfully creates a new Invoice", async () => {
    await suiteMocks();

    await userService.create(tempInvoiceUser);
    await authService.create({
      userId: tempInvoiceUser.id,
      authId: uuidv4(),
      sub: invoiceUser.sub,
    });
    await orgService.create({
      user: tempInvoiceUser.id,
      org: invoiceOrg,
    });

    const response = await app.handle(
      postRequest("/invoices", {
        org: invoiceOrg.id,
        invoice: tempInvoice,
      }),
    );
    const json = await response.json();
    const newInvoice = json.data;

    newInvoice.start = moment(json.start).toDate();
    newInvoice.end = moment(json.end).toDate();
    newInvoice.due = moment(json.due).toDate();

    expect(json).toMatchObject({
      message: "Invoice created successfully.",
      data: newInvoice,
    });
  });

  it("POST /invoices throws exception when Invoice ID already exists", async () => {
    await suiteMocks();

    const response = await app.handle(
      postRequest("/invoices", {
        org: invoiceOrg.id,
        invoice: tempInvoice,
      }),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Invoice already exists!",
      code: 409,
    });
  });

  it("GET /invoices/:id throws unauthorized", async () => {
    const secondUser = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
      given_name: faker.person.firstName(),
      family_name: faker.person.lastName(),
      phone_number: faker.phone.number(),
      picture: faker.internet.url(),
    };

    const secondTempUser = {
      id: faker.string.uuid(),
      email: secondUser.email,
      firstName: secondUser.given_name,
      lastName: secondUser.family_name,
      phone: secondUser.phone_number,
      picture: secondUser.picture,
    };

    const secondOrg = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      contact: tempInvoiceUser.email,
    };

    await mock.module("../plugins/auth.ts", async () => false);
    await mock.module("../utils/extract-sub.ts", async () => {
      return {
        getSub: () => {
          return secondUser.sub;
        },
      };
    });
    await mock.module("jsonwebtoken", () => {
      return {
        verify: () => {
          return false;
        },
      };
    });
    await mock.module("jwt-decode", () => {
      return {
        jwtDecode: () => {
          return secondUser;
        },
      };
    });

    await userService.create(secondTempUser);
    await authService.create({
      userId: secondTempUser.id,
      authId: uuidv4(),
      sub: secondUser.sub,
    });
    await orgService.create({
      user: secondTempUser.id,
      org: secondOrg,
    });

    const response = await app.handle(
      getRequest(`/invoices/${tempInvoice.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "User does not have and Org assocation this Invoice.",
      code: 401,
    });
  });

  it("GET /invoices/:id fetches the Invoice successfully", async () => {
    await suiteMocks();

    const response = await app.handle(
      getRequest(`/invoices/${tempInvoice.id}`, true),
    );
    const json = await response.json();
    const newInvoice = json.data;

    newInvoice.start = moment(json.start).toDate();
    newInvoice.end = moment(json.end).toDate();
    newInvoice.due = moment(json.due).toDate();

    expect(json).toMatchObject({
      message: "Invoice fetched successfully.",
      data: newInvoice,
    });
  });

  it("PUT /invoices/:id updates the specified Invoice", async () => {
    await suiteMocks();

    const body = {
      invoice: tempInvoice,
      org: invoiceOrg.id,
    };
    body.invoice.paid = true;

    const response = await app.handle(
      putRequest(`/invoices/${tempInvoice.id}`, body),
    );
    const json = await response.json();
    const newInvoice = json.data;

    newInvoice.start = moment(json.start).toDate();
    newInvoice.end = moment(json.end).toDate();
    newInvoice.due = moment(json.due).toDate();

    expect(json).toMatchObject({
      data: newInvoice,
      message: "Invoice updated successfully.",
    });
  });

  it("DELETE /invoices removes the specified Invoice", async () => {
    await suiteMocks();

    const response = await app.handle(
      deleteRequest(`/invoices/${invoiceOrg.id}/${tempInvoice.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Invoice deleted successfully.",
    });
  });
});
