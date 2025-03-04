import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { supabaseClient } from "@/app";
import config from "@/config";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import { UserRole } from "@/domain/types/UserRole";
import type { User as IllustriousUser, Org } from "@/drizzle/schema";
import authPlugin from "@/plugins/auth"; // Adjust the import path as necessary
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import { AuthError, type Provider, type User } from "@supabase/auth-js";
import axios, { type AxiosError } from "axios";
import { type Context, Elysia } from "elysia";
import { vi } from "vitest";

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

describe("Auth Plugin", () => {
  describe("Basic Scenarios", () => {
    it("should return immediately for auth and / paths", async () => {
      const result = await axios.get(config.app.url);
      expect(result.status).toBe(200);
      expect(result.data.name).toBe(config.app.name);
      expect(result.data.version).toBe(config.app.version);
    });

    it("should throw UnauthorizedError if no bearer is included", async () => {
      try {
        await axios.post(`${config.app.url}/org`);
      } catch (error) {
        const res = (error as AxiosError).response;
        const errData = res?.data as { code: number; message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("Access token is missing.");
      }
    });

    it("should throw UnauthorizedError if bearer is invalid", async () => {
      try {
        await axios.get(`${config.app.url}/org`, {
          headers: {
            Authorization: "Bearer invalid",
          },
        });
      } catch (error) {
        const res = (error as AxiosError).response;
        const errData = res?.data as { code: number; message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toInclude(
          "invalid JWT: unable to parse or verify signature",
        );
      }
    });

    it("should throw UnauthorizedError if bearer does not fetch Illustrious User", async () => {
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue({
        ...defaultContext,
        data: { user: supaUser },
        error: null,
      });

      try {
        await axios.get(`${config.app.url}/org`, {
          headers: {
            Authorization: "Bearer faked",
          },
        });
      } catch (error) {
        const res = (error as AxiosError).response;
        const errData = res?.data as { code: number; message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("User was not found.");
      }
    });

    it("should create a new user on POST ", async () => {
      await userService.updateOrCreate(mockUser);

      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue({
        ...defaultContext,
        data: {
          user: {
            ...supaUser,
            id: mockUser.id,
          },
        },
        error: null,
      });

      const result = await axios.get(`${config.app.url}/me`, {
        headers: {
          Authorization: "Bearer faked",
        },
      });

      expect(result.status).toBe(200);
      expect(result.data).toEqual({
        data: {
          user: mockUser,
        },
        message: "User details fetched successfully!",
      });
    });
  });
});
