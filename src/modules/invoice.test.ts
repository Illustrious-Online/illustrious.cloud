import type { User as IllustriousUser, Invoice, Org } from "@/drizzle/schema";
import type { AuthenticatedContext } from "@/plugins/auth";
import { faker } from "@faker-js/faker";
import type { Context } from "elysia";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import { UserRole } from "@/domain/types/UserRole";
import * as orgService from "@/services/org";
import * as userService from "@/services/user";
import { create, deleteOne, fetchOne, update } from "./invoice";

const defaultContext: Context = {} as Context;
const mockUser: IllustriousUser = {
  id: faker.string.uuid(),
  identifier: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
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
  superAdmin: false,
};
const mockOrg: Org = {
  id: faker.string.uuid(),
  name: faker.company.name(),
  contact: faker.internet.email(),
};
const mockInvoice: Invoice = {
  id: faker.string.uuid(),
  value: "100.23",
  paid: false,
  start: new Date(),
  end: new Date(),
  due: new Date(),
  createdAt: new Date(),
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
    await orgService.create({ user: mockUser.id, org: mockOrg });
  });

  afterAll(async () => {
    await orgService.deleteOne(mockOrg.id);
    await userService.deleteOne(mockUser.id, mockUser.identifier);
  });

  describe("create", () => {
    it("should create an invoice if user has permission", async () => {
      const context = mockContext({
        body: { client: secondUser.id, org: mockOrg.id, invoice: mockInvoice },
      });
      const result = await create(context as AuthenticatedContext);

      expect(result).toEqual({
        data: mockInvoice,
        message: "Invoice created successfully.",
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

      await expect(create(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("fetchOne", () => {
    it("should fetch an invoice if user has permission", async () => {
      const context = mockContext({
        user: mockUser,
        params: { invoice: mockInvoice.id },
      });

      const result = await fetchOne(context as AuthenticatedContext);

      expect(result).toEqual({
        data: mockInvoice,
        message: "Invoice fetched successfully.",
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

      await expect(fetchOne(context as AuthenticatedContext)).rejects.toThrow(
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

      const result = await update(context as AuthenticatedContext);

      expect(result).toEqual({
        data: {
          ...mockInvoice,
          paid: true,
          updatedAt,
        },
        message: "Invoice updated successfully.",
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

      await expect(update(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("deleteOne", () => {
    it("should delete an invoice if user has permission", async () => {
      const context = mockContext({
        params: { invoice: mockInvoice.id },
      });
      const result = await deleteOne(context as AuthenticatedContext);

      expect(result).toEqual({
        message: "Invoice deleted successfully.",
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

      await expect(deleteOne(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });
});
