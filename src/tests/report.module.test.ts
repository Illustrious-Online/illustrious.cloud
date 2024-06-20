import { afterEach, describe, expect, it, jest, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

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
  "user", "report", "org"
]);

const suiteMocks = async () => {
  mocks.push(
    await mockModule("../plugins/auth.ts", () => jest.fn(() => Promise.resolve(true))),
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

describe("Report Module", () => {
  afterEach(() => {
    mocks.forEach((mockResult) => mockResult.clear());
    mocks = [];
  });

  it("POST /reports successfully creates a new Report", async () => {
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
      postRequest("/reports", {
        org: data.org!.id,
        report: data.report!,
      }),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report created successfully.",
      data: data.report!,
    });
  });

  it("POST /reports throws exception when Report ID already exists", async () => {
    await suiteMocks();

    const response = await app.handle(
      postRequest("/reports", {
        org: data.org!.id,
        report: data.report!,
      }),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report already exists!",
      code: 409,
    });
  });

  it("GET /reports/:id throws unauthorized", async () => {
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
      getRequest(`/reports/${data.report!.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "User does not have and Org assocation this Report.",
      code: 401,
    });
  });

  it("GET /reports/:id fetches the report successfully", async () => {
    await suiteMocks();

    const response = await app.handle(
      getRequest(`/reports/${data.report!.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report fetched successfully.",
      data: data.report!,
    });
  });

  it("PUT /reports/:id updates the specified Report", async () => {
    await suiteMocks();

    const body = {
      report: data.report!,
      org: data.org!.id,
    };
    body.report.rating = faker.number.int({ min: 0, max: 9 });

    const response = await app.handle(
      putRequest(`/reports/${data.report!.id}`, body),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      data: data.report!,
      message: "Report updated successfully.",
    });
  });

  it("DELETE /reports removes the specified Report", async () => {
    await suiteMocks();

    const response = await app.handle(
      deleteRequest(`/reports/${data.org!.id}/${data.report!.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report deleted successfully.",
    });
  });
});
