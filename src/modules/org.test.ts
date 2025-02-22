import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import { UserRole } from "@/domain/types/UserRole";
import type { User } from "@/drizzle/schema";
import type { AuthenticatedContext } from "@/plugins/auth";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import type { Context } from "elysia";
import { create, deleteOne, fetchOne, fetchResources, update } from "./org";

let mockOrg = {
  id: faker.string.uuid(),
  name: faker.company.name(),
  contact: faker.internet.email(),
};
const defaultContext: Context = {} as Context;
const mockUser: User = {
  id: faker.string.uuid(),
  email: faker.internet.email(),
  identifier: faker.string.uuid(),
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  superAdmin: true,
};
const mockClient: User = {
  id: faker.string.uuid(),
  email: faker.internet.email(),
  identifier: faker.string.uuid(),
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  superAdmin: false,
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

describe("Org Module", () => {
  beforeAll(async () => {
    await userService.updateOrCreate(mockUser);
  });

  afterAll(async () => {
    await userService.deleteOne(mockUser.id, mockUser.identifier);
  });

  describe("create", () => {
    it("should create an organization successfully", async () => {
      const context = mockContext({
        body: mockOrg,
      });
      const response = await create(context as AuthenticatedContext);

      expect(response).toEqual({
        data: mockOrg,
        message: "Organization created successfully.",
      });
    });
  });

  describe("fetchOne", () => {
    it("should fetch organization details successfully", async () => {
      const context = mockContext({
        params: { org: mockOrg.id },
        query: { include: "invoices=true, reports=true, users=true" },
      });
      const response = await fetchOne(context as AuthenticatedContext);

      expect(response).toEqual({
        data: {
          org: mockOrg,
          invoices: [],
          reports: [],
          users: [mockUser],
        },
        message: "Organization & details fetched successfully",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        user: mockClient,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
      });

      await expect(fetchOne(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("fetchResources", () => {
    it("should fetch organization resources successfully", async () => {
      const context = mockContext({
        params: { id: mockOrg.id, resource: "invoices" },
      });

      const response = await fetchResources(context as AuthenticatedContext);

      expect(response).toEqual({
        data: { invoices: [] },
        message: "Organization resources fetched successfully.",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        user: mockClient,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
      });

      await expect(
        fetchResources(context as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("update", () => {
    it("should update organization details successfully", async () => {
      const context = mockContext({
        body: { id: mockOrg.id, name: "Updated Org" },
      });

      const response = await update(context as AuthenticatedContext);
      mockOrg = {
        ...mockOrg,
        name: "Updated Org",
      };

      expect(response).toEqual({
        data: mockOrg,
        message: "Organization updated successfully.",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        user: mockClient,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
      });

      await expect(update(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("deleteOne", () => {
    it("should delete organization successfully", async () => {
      const context = mockContext({ params: { org: mockOrg.id } });

      const response = await deleteOne(context as AuthenticatedContext);

      expect(response).toEqual({
        message: "Organization deleted successfully.",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        user: mockClient,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
      });

      await expect(deleteOne(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });
});
