import { describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

import { deleteRequest, getRequest, postRequest, putRequest } from ".";
import { app } from "../app";
import * as authService from "../services/auth";
import * as orgService from "../services/org";
import * as reportService from "../services/report";
import * as userService from "../services/user";

const reportUser = {
  sub: faker.string.uuid(),
  email: faker.internet.email(),
  given_name: faker.person.firstName(),
  family_name: faker.person.lastName(),
  phone_number: faker.phone.number(),
  picture: faker.internet.url(),
};

const tempReportUser = {
  id: faker.string.uuid(),
  email: reportUser.email,
  firstName: reportUser.given_name,
  lastName: reportUser.family_name,
  phone: reportUser.phone_number,
  picture: reportUser.picture,
};

const reportOrg = {
  id: faker.string.uuid(),
  name: faker.company.name(),
  contact: tempReportUser.email,
};

const tempReport = {
  id: faker.string.uuid(),
  owner: tempReportUser.id,
  rating: faker.number.int({ min: 1, max: 9 }),
  notes: faker.lorem.lines(2),
};

const suiteMocks = async () => {
  await mock.module("../plugins/auth.ts", async () => true);
  await mock.module("../utils/extract-sub.ts", async () => {
    return {
      getSub: () => {
        return reportUser.sub;
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
        return reportUser;
      },
    };
  });
};

describe("Report Module", () => {
  it("GET /reports/:id throws bad request exception if information is missing", async () => {
    const response = await app.handle(postRequest(`/reports`, {}));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Bad Request!",
      code: 400,
    });
  });

  it("POST /reports successfully creates a new Report", async () => {
    await suiteMocks();

    await userService.create(tempReportUser);
    await authService.create({
      userId: tempReportUser.id,
      authId: uuidv4(),
      sub: reportUser.sub,
    });
    await orgService.create({
      user: tempReportUser.id,
      org: reportOrg,
    });

    const response = await app.handle(
      postRequest("/reports", {
        org: reportOrg.id,
        report: tempReport,
      }),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report created successfully.",
      data: tempReport,
    });
  });

  it("POST /reports throws exception when Report ID already exists", async () => {
    await suiteMocks();

    const response = await app.handle(
      postRequest("/reports", {
        org: reportOrg.id,
        report: tempReport,
      }),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report already exists!",
      code: 409,
    });
  });

  it("GET /reports/:id throws unauthorized", async () => {
    const secondUser = {
      sub: uuidv4(),
      email: faker.internet.email(),
      given_name: faker.person.firstName(),
      family_name: faker.person.lastName(),
      phone_number: faker.phone.number(),
      picture: faker.internet.url(),
    };

    const secondTempUser = {
      id: uuidv4(),
      email: secondUser.email,
      firstName: secondUser.given_name,
      lastName: secondUser.family_name,
      phone: secondUser.phone_number,
      picture: secondUser.picture,
    };

    const secondOrg = {
      id: uuidv4(),
      name: faker.company.name(),
      contact: tempReportUser.email,
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
      getRequest(`/reports/${tempReport.id}`, true),
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
      getRequest(`/reports/${tempReport.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report fetched successfully.",
      data: tempReport,
    });
  });

  it("PUT /reports/:id updates the specified Report", async () => {
    await suiteMocks();

    const body = {
      report: tempReport,
      org: reportOrg.id,
    };
    body.report.rating = faker.number.int({ min: 0, max: 9 });

    const response = await app.handle(
      putRequest(`/reports/${tempReport.id}`, body),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      data: tempReport,
      message: "Report updated successfully.",
    });
  });

  it("DELETE /reports removes the specified Report", async () => {
    await suiteMocks();

    const response = await app.handle(
      deleteRequest(`/reports/${reportOrg.id}/${tempReport.id}`, true),
    );
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Report deleted successfully.",
    });
  });
});
