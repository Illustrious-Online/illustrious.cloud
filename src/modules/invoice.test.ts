import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import { UserRole } from "@/domain/types/UserRole";
import type { Invoice, Org, User } from "@/drizzle/schema";
import * as orgService from "@/services/org";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import type { Context } from "elysia";
import { deleteInvoice, getInvoice, postInvoice, putInvoice } from "./invoice";

const defaultContext: Context = {} as Context;
const mockUser: User = {
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
const secondUser: User = {
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

describe("Invoice Module", () => {
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
    it("should create an invoice if user has permission", async () => {
      const context = mockContext({
        body: { client: secondUser.id, org: mockOrg.id, invoice: mockInvoice },
      });
      const result = await postInvoice(context as AuthenticatedContext);

      expect(result).toEqual({
        data: mockInvoice,
        message: "Invoice created successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
        user: secondUser,
        body: { client: mockUser.id, org: mockOrg.id, invoice: mockInvoice },
      });

      await expect(
        postInvoice(context as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("fetchOne", () => {
    it("should fetch an invoice if user has permission", async () => {
      const context = mockContext({
        user: mockUser,
        params: { invoice: mockInvoice.id },
      });

      const result = await getInvoice(context as AuthenticatedContext);

      expect(result).toEqual({
        data: mockInvoice,
        message: "Invoice fetched successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
        user: secondUser,
        params: { invoice: mockInvoice.id },
      });

      await expect(getInvoice(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("update", () => {
    it("should update an invoice if user has permission", async () => {
      const updatedAt = new Date();
      const context = mockContext({
        body: {
          client: secondUser.id,
          org: mockOrg.id,
          invoice: {
            ...mockInvoice,
            paid: true,
            updatedAt,
          },
        },
      });

      const result = await putInvoice(context as AuthenticatedContext);

      expect(result).toEqual({
        data: {
          ...mockInvoice,
          paid: true,
          updatedAt,
        },
        message: "Invoice updated successfully!",
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
          invoice: {
            paid: true,
          },
        },
      });

      await expect(putInvoice(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("deleteOne", () => {
    it("should delete an invoice if user has permission", async () => {
      const context = mockContext({
        params: { invoice: mockInvoice.id },
      });
      const result = await deleteInvoice(context as AuthenticatedContext);

      expect(result).toEqual({
        message: "Invoice deleted successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
        user: secondUser,
        params: { invoice: mockInvoice.id },
      });

      await expect(
        deleteInvoice(context as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
