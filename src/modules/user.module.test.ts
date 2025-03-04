import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import ServerError from "@/domain/exceptions/ServerError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import { UserRole } from "@/domain/types/UserRole";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Invoice, Org, Report, User } from "@/drizzle/schema";
import * as invoiceService from "@/services/invoice";
import * as orgService from "@/services/org";
import * as reportService from "@/services/report";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import axios from "axios";
import type { Context } from "elysia";
import { vi } from "vitest";
import {
  type UserDetails,
  deleteUser,
  getUser,
  linkSteam,
  me,
  putUser,
} from "./user";

const defaultContext: Context = {} as Context;
const mockUser: User = {
  id: faker.string.uuid(),
  identifier: faker.string.uuid(),
  email: null,
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  managed: false,
  superAdmin: true,
};
const secondUser: User = {
  id: faker.string.uuid(),
  identifier: faker.string.uuid(),
  email: null,
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  managed: false,
  superAdmin: false,
};

const date = new Date();
const endDate = new Date();
endDate.setDate(endDate.getDate() + 30);

const mockInvoice: Invoice = {
  id: faker.string.uuid(),
  price: "100.23",
  paid: false,
  start: date,
  end: endDate,
  due: endDate,
  createdAt: date,
  updatedAt: null,
  deletedAt: null,
};
const mockReport: Report = {
  id: faker.string.uuid(),
  createdAt: date,
  rating: 5,
  notes: "Report 1 notes",
};
const mockOrg: Org = {
  id: faker.string.uuid(),
  name: faker.company.name(),
  contact: faker.internet.email(),
};

// Mock Axios post method
const mockRequest = vi.fn();

// Replace axios.post with the mock
axios.request = mockRequest;

describe("User Module", () => {
  beforeAll(async () => {
    await userService.updateOrCreate(mockUser);
    await userService.updateOrCreate(secondUser);
    await orgService.createOrg({ user: mockUser.id, org: mockOrg });
    await reportService.createReport({
      client: secondUser.id,
      creator: mockUser.id,
      org: mockOrg.id,
      report: mockReport,
    });
    await invoiceService.createInvoice({
      client: secondUser.id,
      creator: mockUser.id,
      org: mockOrg.id,
      invoice: mockInvoice,
    });
  });

  afterAll(async () => {
    await reportService.removeReport(mockReport.id);
    await userService.removeUser(secondUser.id, secondUser.identifier);
  });

  describe("me", () => {
    it("should fetch my user & details successfully", async () => {
      const response: SuccessResponse<UserDetails> = await me({
        ...defaultContext,
        user: mockUser,
        permissions: {
          superAdmin: true,
        },
        query: { include: "invoices,reports,orgs" },
      } as AuthenticatedContext);

      expect(response.data?.user).toEqual(mockUser);
      expect(response.data?.invoices).toEqual([mockInvoice]);
      expect(response.data?.reports).toEqual([mockReport]);
      expect(response.data?.orgs).toEqual([mockOrg]);
      expect(response.message).toBe("User details fetched successfully!");
    });

    it("should handle errors when fetching resources", async () => {
      expect(
        me({
          ...defaultContext,
          user: {} as User,
          permissions: {
            superAdmin: false,
          },
        } as AuthenticatedContext),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("getUser", () => {
    it("should fetch user details with included resources for super admin", async () => {
      expect(
        getUser({
          ...defaultContext,
          user: mockUser,
          permissions: {
            superAdmin: true,
          },
          params: {
            by: "id",
          },
        } as AuthenticatedContext),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("update", () => {
    it("should update User details successfully", async () => {
      const response = await putUser({
        ...defaultContext,
        user: mockUser,
        permissions: {
          superAdmin: true,
        },
        body: {
          ...mockUser,
          firstName: "Updated",
          lastName: "User",
        },
        params: { id: mockUser.id },
      } as AuthenticatedContext);

      expect(response).toEqual({
        data: {
          ...mockUser,
          firstName: "Updated",
          lastName: "User",
        },
        message: "User updated successfully.",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      await expect(
        putUser({
          ...defaultContext,
          user: secondUser,
          permissions: {
            superAdmin: false,
            org: {
              id: mockOrg.id,
              role: UserRole.CLIENT,
              allowed: false,
            },
          },
          body: {
            ...mockUser,
            firstName: "Updated",
            lastName: "User",
          },
          params: { user: mockUser.id },
        } as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("deleteOne", () => {
    beforeEach(async () => {
      try {
        await invoiceService.removeInvoice(mockInvoice.id);
        await orgService.removeOrg(mockOrg.id);
      } catch (error) {
        // Do nothing
      }
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      await expect(
        deleteUser({
          ...defaultContext,
          user: secondUser,
          permissions: {
            superAdmin: false,
          },
          params: { id: mockUser.id },
        } as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should delete User successfully", async () => {
      const response = await deleteUser({
        ...defaultContext,
        user: mockUser,
        permissions: {
          superAdmin: true,
        },
        params: { id: mockUser.id },
      } as AuthenticatedContext);

      expect(response).toEqual({
        message: "User deleted successfully.",
      });
    });
  });

  describe("linkSteam", () => {
    it("should link Steam account", async () => {
      const response = { data: { url: "http://steam.com" } };
      mockRequest.mockResolvedValueOnce(response);

      const context = {
        ...defaultContext,
        user: mockUser,
        permissions: {
          superAdmin: true,
        },
        redirect: vi.fn(),
      } as AuthenticatedContext;

      await linkSteam(context);
      expect(context.redirect).toHaveBeenCalledWith("http://steam.com");
    });

    it("should throw ServerError if linking fails", async () => {
      mockRequest.mockResolvedValueOnce({ status: 500 });

      await expect(
        linkSteam({
          ...defaultContext,
          user: mockUser,
          permissions: {
            superAdmin: true,
          },
          redirect: vi.fn(),
        } as AuthenticatedContext),
      ).rejects.toThrow(ServerError);
    });
  });
});
