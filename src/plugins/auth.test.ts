import { afterAll, describe, expect, it } from "bun:test";
import { supabaseClient } from "@/app";
import config from "@/config";
import type { User as IllustriousUser, Org, Report } from "@/drizzle/schema";
import * as orgService from "@/services/org";
import * as reportService from "@/services/report";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import type { User } from "@supabase/auth-js";
import type { Context } from "elysia";
import { vi } from "vitest";

const defaultContext: Context = {} as Context;
const headers = {
  Authorization: `Bearer ${faker.internet.jwt()}`,
};
const authUser: IllustriousUser = {
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
const supaUser: User = {
  id: "user_id",
  email: "user@example.com",
  user_metadata: {
    phone: "1234567890",
    full_name: "John Doe",
    avatar_url: "avatar_url",
  },
  app_metadata: {},
  aud: "",
  created_at: "",
};
const authOrg: Org = {
  id: faker.string.uuid(),
  name: faker.company.name(),
  contact: faker.internet.email(),
};
const authReport: Report = {
  id: faker.string.uuid(),
  createdAt: new Date(),
  rating: 5,
  notes: "Report 1 notes",
};

describe("Auth Plugin", () => {
  describe("Error Scenarios", () => {
    it("should throw UnauthorizedError if no bearer is included", async () => {
      const response = await fetch(`${config.app.url}/me`);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe(401);
      expect(data.message).toBe("Access token is missing.");
    });

    it("should throw UnauthorizedError if bearer is invalid", async () => {
      const response = await fetch(`${config.app.url}/me`, { headers });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe(401);
    });

    it("should throw UnauthorizedError if bearer does not fetch Illustrious User", async () => {
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue({
        ...defaultContext,
        data: { user: supaUser },
        error: null,
      });

      const response = await fetch(`${config.app.url}/me`, { headers });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe(401);
      expect(data.message).toBe("User was not found.");
    });
  });

  describe("GET (/me) Scenarios", () => {
    it("should return immediately for base paths", async () => {
      const response = await fetch(config.app.url);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe(config.app.name);
      expect(data.version).toBe(config.app.version);
    });

    it("should retrieve the user using /me", async () => {
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue({
        ...defaultContext,
        data: {
          user: {
            ...supaUser,
            id: authUser.id,
          },
        },
        error: null,
      });

      await userService.updateOrCreate(authUser);

      const response = await fetch(`${config.app.url}/me`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ user: authUser });
      expect(data.message).toBe("User details fetched successfully!");
    });

    it("should retrieve the user & resources using /me", async () => {
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue({
        ...defaultContext,
        data: {
          user: {
            ...supaUser,
            id: authUser.id,
          },
        },
        error: null,
      });

      await reportService.createReport({
        report: authReport,
        // TODOD: FINISHI THIS
        user: authUser.id,
        org: authOrg.id,
      });

      const response = await fetch(`${config.app.url}/me?include=reports&org=${authOrg.id}`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ user: authUser });
      expect(data.message).toBe("User details fetched successfully!");
    });
  });

  describe("POST Scenarios", () => {
    it("should create an organization successfully", async () => {
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue({
        ...defaultContext,
        data: {
          user: {
            ...supaUser,
            id: authUser.id,
          },
        },
        error: null,
      });

      const response = await fetch(`${config.app.url}/org`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${faker.internet.jwt()}`,
        },
        body: JSON.stringify(authOrg),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(authOrg);
      expect(data.message).toBe("Organization created successfully!");
    });
  });

  afterAll(async () => {
    await orgService.removeOrg(authOrg.id);
    await userService.removeUser(authUser.id, authUser.identifier);
  });
});
