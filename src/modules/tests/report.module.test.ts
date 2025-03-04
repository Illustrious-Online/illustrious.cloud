import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import { UserRole } from "@/domain/types/UserRole";
import type { User as IllustriousUser, Org, Report } from "@/drizzle/schema";
import * as orgService from "@/services/org";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import type { Context } from "elysia";
import { deleteReport, getReport, postReport, putReport } from "../report";

const defaultContext: Context = {} as Context;
const mockUser: IllustriousUser = {
  id: faker.string.uuid(),
  identifier: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  managed: false,
  superAdmin: true,
};
const secondUser: IllustriousUser = {
  id: faker.string.uuid(),
  identifier: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  managed: false,
  superAdmin: false,
};
const mockOrg: Org = {
  id: faker.string.uuid(),
  name: faker.company.name(),
  contact: faker.internet.email(),
};
const mockReport: Report = {
  id: faker.string.uuid(),
  createdAt: new Date(),
  rating: 5,
  notes: "Report 1 notes",
};
const mockContext = (overrides = {}) => ({
  body: {},
  user: mockUser,
  params: {},
  query: {},
  permissions: {
    superAdmin: true,
    org: { id: mockOrg.id, role: UserRole.OWNER },
  },
  ...overrides,
});

describe("Report Module", () => {
  beforeAll(async () => {
    await userService.updateOrCreate(mockUser);
    await userService.updateOrCreate(secondUser);
    await orgService.createOrg({ user: mockUser.id, org: mockOrg });
  });

  afterAll(async () => {
    await orgService.removeOrg(mockOrg.id);
    await userService.removeUser(mockUser.id, mockUser.identifier);
  });

  describe("create", () => {
    it("should create a report if user has permission", async () => {
      const context = mockContext({
        body: { client: secondUser.id, org: mockOrg.id, report: mockReport },
      });
      const result = await postReport(context as AuthenticatedContext);

      expect(result).toEqual({
        data: mockReport,
        message: "Report created successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
        user: secondUser,
        body: { client: mockUser.id, org: mockOrg.id, report: mockReport },
      });

      await expect(postReport(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("fetchOne", () => {
    it("should fetch a report if user has permission", async () => {
      const context = mockContext({
        user: mockUser,
        params: { report: mockReport.id },
      });

      const result = await getReport(context as AuthenticatedContext);

      expect(result).toEqual({
        data: mockReport,
        message: "Report fetched successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
        user: secondUser,
        params: { report: mockReport.id },
      });

      await expect(getReport(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("update", () => {
    it("should update a report if user has permission", async () => {
      const updatedAt = new Date();
      const context = mockContext({
        body: {
          client: secondUser.id,
          org: mockOrg.id,
          report: {
            ...mockReport,
            rating: 4,
          },
        },
      });

      const result = await putReport(context as AuthenticatedContext);

      expect(result).toEqual({
        data: {
          ...mockReport,
          rating: 4,
        },
        message: "Report updated successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
        user: secondUser,
        body: {
          client: mockUser.id,
          org: mockOrg.id,
          report: {
            ...mockReport,
            rating: 4,
          },
        },
      });

      await expect(putReport(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("deleteOne", () => {
    it("should delete a report if user has permission", async () => {
      const context = mockContext({
        params: { report: mockReport.id },
      });
      const result = await deleteReport(context as AuthenticatedContext);

      expect(result).toEqual({
        message: "Report deleted successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
        user: secondUser,
        params: { report: mockReport.id },
      });

      await expect(
        deleteReport(context as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
