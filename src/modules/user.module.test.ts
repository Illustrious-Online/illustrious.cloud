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
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import * as invoiceService from "@/services/invoice";
import * as orgService from "@/services/org";
import * as reportService from "@/services/report";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import axios from "axios";
import type { Context } from "elysia";
import { vi } from "vitest";
import type { Invoice, Org, Report, User } from "../drizzle/schema";
import type { AuthenticatedContext } from "../plugins/auth";
import {
  type UserDetails,
  deleteOne,
  fetchUser,
  linkSteam,
  me,
  update,
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
    await orgService.create({ user: mockUser.id, org: mockOrg });
    await reportService.create({
      client: secondUser.id,
      creator: mockUser.id,
      org: mockOrg.id,
      report: mockReport,
    });
    await invoiceService.create({
      client: secondUser.id,
      creator: mockUser.id,
      org: mockOrg.id,
      invoice: mockInvoice,
    });
  });

  afterAll(async () => {
    await reportService.deleteOne(mockReport.id);
    await userService.deleteOne(secondUser.id, secondUser.identifier);
  });

  describe("me", () => {
    it("should fetch my user details successfully", async () => {
      const response: SuccessResponse<UserDetails> = await me({
        ...defaultContext,
        user: mockUser,
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
        } as AuthenticatedContext),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("fetchUser", () => {
    it("should fetch user details with included resources for super admin", async () => {
      const response: SuccessResponse<UserDetails> = await fetchUser({
        ...defaultContext,
        user: mockUser,
        permissions: {
          superAdmin: true,
        },
        query: { include: "invoices=true, reports=true, orgs=true" },
      } as AuthenticatedContext);

      expect(response.data?.user).toEqual(mockUser);
      expect(response.data?.invoices).toEqual([mockInvoice]);
      expect(response.data?.reports).toEqual([mockReport]);
      expect(response.data?.orgs).toEqual([mockOrg]);
      expect(response.message).toBe("User details fetched successfully");
    });

    it("should fetch user details without included resources for non-super admin", async () => {
      const nonSuperAdminUser = { ...mockUser, superAdmin: false };
      const response: SuccessResponse<UserDetails> = await fetchUser({
        ...defaultContext,
        user: nonSuperAdminUser,
        permissions: {
          superAdmin: false,
        },
        query: { include: "invoices=true, reports=true, orgs=true" },
      } as AuthenticatedContext);

      expect(response.data?.user).toEqual(nonSuperAdminUser);
      expect(response.data?.invoices).toBeUndefined();
      expect(response.data?.reports).toBeUndefined();
      expect(response.data?.orgs).toBeUndefined();
      expect(response.message).toBe(
        "User details fetched successfully ('include' details restricted)",
      );
    });
  });

  describe("update", () => {
    it("should update User details successfully", async () => {
      const response = await update({
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
        update({
          ...defaultContext,
          user: secondUser,
          permissions: {
            superAdmin: false,
          },
          body: {
            ...mockUser,
            firstName: "Updated",
            lastName: "User",
          },
          params: { id: mockUser.id },
        } as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("deleteOne", () => {
    beforeEach(async () => {
      try {
        await invoiceService.deleteOne(mockInvoice.id);
        await orgService.deleteOne(mockOrg.id);
      } catch (error) {
        // Do nothing
      }
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      await expect(
        deleteOne({
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
      const response = await deleteOne({
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
