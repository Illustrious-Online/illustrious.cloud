import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import config from "@/config";
import type {
  User as IllustriousUser,
  Invoice,
  Org,
  Report,
} from "@/drizzle/schema";
import { supabaseAdmin } from "@/libs/supabase";
import * as invoiceService from "@/services/invoice";
import * as orgService from "@/services/org";
import * as reportService from "@/services/report";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import type { User } from "@supabase/auth-js";
import type { Context } from "elysia";
import { vi } from "vitest";

const defaultContext: Context = {} as Context;
const headers = {
  "Content-Type": "application/json",
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
const clientUser: IllustriousUser = {
  id: faker.string.uuid(),
  identifier: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: null,
  lastName: null,
  picture: null,
  phone: null,
  managed: true,
  superAdmin: false,
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
const secondOrg: Org = {
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

const date = new Date();
const endDate = new Date();
endDate.setDate(endDate.getDate() + 30);

const authInvoice: Invoice = {
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

const spyOnSupabase = (overrides = {}) =>
  vi.spyOn(supabaseAdmin.auth, "getUser").mockResolvedValue({
    ...defaultContext,
    data: {
      user: {
        ...supaUser,
        id: authUser.id,
      },
    },
    error: null,
    ...overrides,
  });

describe("Auth Plugin", () => {
  beforeAll(async () => {
    await userService.updateOrCreate(authUser);
  });

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
      vi.spyOn(supabaseAdmin.auth, "getUser").mockResolvedValue({
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

  describe("POST Scenarios", () => {
    it("should create an organization successfully", async () => {
      spyOnSupabase();

      const response = await fetch(`${config.app.url}/org`, {
        method: "POST",
        headers,
        body: JSON.stringify(authOrg),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(authOrg);
      expect(data.message).toBe("Organization created successfully!");
    });

    it("should create an organization user successfully", async () => {
      spyOnSupabase();

      const response = await fetch(`${config.app.url}/org/${authOrg.id}/user`, {
        method: "POST",
        headers,
        body: JSON.stringify(clientUser),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(clientUser);
      expect(data.message).toBe("Organization user created successfully!");
    });

    it("should create a report successfully", async () => {
      spyOnSupabase();

      const response = await fetch(`${config.app.url}/report`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          org: authOrg.id,
          client: clientUser.id,
          report: authReport,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        ...authReport,
        createdAt: authReport.createdAt.toISOString(),
      });
      expect(data.message).toBe("Report created successfully!");
    });

    it("should create an invoice successfully", async () => {
      spyOnSupabase();

      const response = await fetch(`${config.app.url}/invoice`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          org: authOrg.id,
          client: clientUser.id,
          invoice: authInvoice,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        ...authInvoice,
        createdAt: authInvoice.createdAt.toISOString(),
        start: authInvoice.start.toISOString(),
        end: authInvoice.end.toISOString(),
        due: authInvoice.due.toISOString(),
      });
      expect(data.message).toBe("Invoice created successfully!");
    });
  });

  describe("/me GET Scenarios", () => {
    it("should return immediately for base paths", async () => {
      const response = await fetch(config.app.url);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe(config.app.name);
      expect(data.version).toBe(config.app.version);
    });

    it("should retrieve the user using /me", async () => {
      spyOnSupabase();

      const response = await fetch(`${config.app.url}/me`, { headers });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ user: authUser });
      expect(data.message).toBe("User details fetched successfully!");
    });
  });

  describe("Org (/org) Scenarios", () => {
    it("should fetch organization details successfully", async () => {
      spyOnSupabase();

      const response = await fetch(`${config.app.url}/org/${authOrg.id}`, {
        headers,
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ org: authOrg });
      expect(data.message).toBe("Organization & details fetched successfully!");
    });

    it("should fetch organization user successfully", async () => {
      spyOnSupabase();

      const response = await fetch(
        `${config.app.url}/org/${authOrg.id}?user=${clientUser.id}`,
        {
          headers,
        },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ org: authOrg });
      expect(data.message).toBe("Organization & details fetched successfully!");
    });
  });

  describe("Invoice (/invoice) Scenarios", () => {
    it("should fetch invoice details successfully", async () => {
      spyOnSupabase();

      const response = await fetch(
        `${config.app.url}/invoice/${authInvoice.id}`,
        {
          headers,
        },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        ...authInvoice,
        createdAt: authInvoice.createdAt.toISOString(),
        start: authInvoice.start.toISOString(),
        end: authInvoice.end.toISOString(),
        due: authInvoice.due.toISOString(),
      });
      expect(data.message).toBe("Invoice fetched successfully!");
    });
  });

  describe("Report (/report) Scenarios", () => {
    it("should fetch report details successfully", async () => {
      spyOnSupabase();

      const response = await fetch(
        `${config.app.url}/report/${authReport.id}`,
        {
          headers,
        },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        ...authReport,
        createdAt: authReport.createdAt.toISOString(),
      });
      expect(data.message).toBe("Report fetched successfully!");
    });
  });

  afterAll(async () => {
    await reportService.removeReport(authReport.id);
    await invoiceService.removeInvoice(authInvoice.id);
    await userService.removeUser(clientUser.id, clientUser.identifier);
    await orgService.removeOrg(authOrg.id);
    await userService.removeUser(authUser.id, authUser.identifier);
  });
});
