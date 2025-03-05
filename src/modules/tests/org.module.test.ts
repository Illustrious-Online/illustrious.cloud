import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import { UserRole } from "@/domain/types/UserRole";
import type { User } from "@/drizzle/schema";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import type { Context } from "elysia";
import {
  deleteOrg,
  getOrg,
  postOrg,
  postOrgUser,
  putOrg,
  putOrgUser,
} from "../org";

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
  managed: false,
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
  managed: false,
  superAdmin: false,
};
const managedUser: User = {
  id: faker.string.uuid(),
  email: faker.internet.email(),
  identifier: faker.string.uuid(),
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  managed: true,
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
    await userService.removeUser(mockUser.id, mockUser.identifier);
  });

  describe("create", () => {
    it("should create an organization successfully", async () => {
      const context = mockContext({
        body: mockOrg,
      });
      const response = await postOrg(context as AuthenticatedContext);

      expect(response).toEqual({
        data: mockOrg,
        message: "Organization created successfully!",
      });
    });
  });

  describe("postOrgUser", () => {
    it("should create an organization user successfully", async () => {
      const context = mockContext({
        body: managedUser,
      });
      const response = await postOrgUser(context as AuthenticatedContext);

      expect(response).toEqual({
        data: managedUser,
        message: "Organization user created successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        body: managedUser,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.EMPLOYEE },
        },
      });

      await expect(
        postOrgUser(context as AuthenticatedContext),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("fetchOne", () => {
    it("should fetch organization details successfully", async () => {
      const context = mockContext({
        params: { org: mockOrg.id },
        query: { include: "invoices,reports,users" },
      });
      const response = await getOrg(context as AuthenticatedContext);

      expect(response).toEqual({
        data: {
          org: mockOrg,
          details: {
            invoices: [],
            reports: [],
            users: [
              {
                orgUser: mockUser,
                role: UserRole.OWNER,
              },
            ],
          },
        },
        message: "Organization & details fetched successfully!",
      });
    });

    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        user: mockClient,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: null },
        },
      });

      await expect(getOrg(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("putOrg", () => {
    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        body: { id: mockOrg.id, name: "Updated Org" },
        user: mockClient,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT },
        },
      });

      await expect(putOrg(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("should update organization details successfully", async () => {
      const context = mockContext({
        body: { id: mockOrg.id, name: "Updated Org" },
      });

      const response = await putOrg(context as AuthenticatedContext);
      mockOrg = {
        ...mockOrg,
        name: "Updated Org",
      };

      expect(response).toEqual({
        data: mockOrg,
        message: "Organization updated successfully!",
      });
    });
  });

  describe("putOrgUser", () => {
    it("should throw UnauthorizedError if user does not have permission", async () => {
      const context = mockContext({
        user: mockClient,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.CLIENT, managed: false },
        },
        body: {
          ...managedUser,
          firstName: "Managed",
          lastName: "User",
        },
      });

      await expect(putOrgUser(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("should update organization users successfully", async () => {
      const context = mockContext({
        user: mockUser,
        permissions: {
          superAdmin: false,
          org: { id: mockOrg.id, role: UserRole.OWNER, managed: true },
        },
        body: {
          ...mockUser,
          firstName: "Updated",
          lastName: "User",
        },
      });

      const response = await putOrgUser(context as AuthenticatedContext);

      expect(response).toEqual({
        data: {
          ...mockUser,
          firstName: "Updated",
          lastName: "User",
        },
        message: "Organization user updated successfully!",
      });
    });
  });

  describe("deleteOne", () => {
    it("should delete organization successfully", async () => {
      const context = mockContext({ params: { org: mockOrg.id } });

      const response = await deleteOrg(context as AuthenticatedContext);

      expect(response).toEqual({
        message: "Organization deleted successfully!",
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

      await expect(deleteOrg(context as AuthenticatedContext)).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });
});
