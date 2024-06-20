import { afterEach, describe, expect, it, jest, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

import moment from "moment";
import { deleteRequest, getRequest, postRequest, putRequest } from ".";
import { app } from "../app";
import * as authService from "../services/auth";
import * as orgService from "../services/org";
import * as userService from "../services/user";
import { MockResult, mockModule } from "./mock.util";
import { generateData } from "./model.util";
import AuthUserInfo from "../domain/interfaces/authUserInfo";
import Tokens from "../domain/interfaces/tokens";

let mocks: MockResult[] = [];
const data = generateData([
  "user", "invoice", "org"
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
      jwtDecode: jest.fn(() => { return data.userData as AuthUserInfo }),
    })),
    await mockModule("../utils/extract-sub.ts", () => ({
      getSub: jest.fn(() => Promise.resolve(data.userData!.sub)),
    }))
  )
};

describe("Invoice Module", () => {
  afterEach(() => {
    mocks.forEach((mockResult) => mockResult.clear());
    mocks = [];
  });

  it("POST /invoices successfully creates a new Invoice", async () => {
    await suiteMocks();

    await userService.create(data.user!);
    await authService.create({
      userId: data.user!.id,
      authId: uuidv4(),
      sub: data.userData!.sub,
    });
    await orgService.create({
      user: data.user!.id,
      org: data.org!,
    });

    const response = await app.handle(
      postRequest("/invoices", {
        org: data.org!.id,
        invoice: data.invoice!,
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
        org: data.org!.id,
        invoice: data.invoice!,
      }),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Invoice already exists!",
      code: 409,
    });
  });

  it("GET /invoices/:id throws unauthorized", async () => {
    const secondData = generateData([
      "user", "org"
    ]);

    mocks.push(
      await mockModule("../plugins/auth.ts", () => jest.fn(() => Promise.resolve(true))),
      await mockModule("../utils/extract-sub.ts", () => ({
        getSub: jest.fn(() => Promise.resolve(secondData.userData!.sub)),
      })),
      await mockModule("jsonwebtoken", () => ({
        verify: jest.fn(() => Promise.resolve(true)),
      })),
      await mockModule("jwt-decode", () => ({
        jwtDecode: jest.fn(() => { return secondData.userData as AuthUserInfo }),
      })),
    )

    await userService.create(secondData.user!);
    await authService.create({
      userId: secondData.user!.id,
      authId: uuidv4(),
      sub: secondData.userData!.sub,
    });
    await orgService.create({
      user: secondData.user!.id,
      org: secondData.org!,
    });

    const response = await app.handle(
      getRequest(`/invoices/${data.invoice!.id}`, true),
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
      getRequest(`/invoices/${data.invoice!.id}`, true),
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
      invoice: data.invoice!,
      org: data.org!.id,
    };
    body.invoice.paid = true;

    const response = await app.handle(
      putRequest(`/invoices/${data.invoice!.id}`, body),
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
      deleteRequest(`/invoices/${data.org!.id}/${data.invoice!.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Invoice deleted successfully.",
    });
  });
});
