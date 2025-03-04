import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import { supabaseClient } from "@/app";
import type { Org, User as IllustriousUser } from "@/drizzle/schema";
import { vi } from "vitest";
import { UserRole } from "@/domain/types/UserRole";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import axios, { AxiosError } from "axios";
import {
  AuthError,
  type Provider,
  type User,
} from "@supabase/auth-js";
import { Elysia, type Context } from "elysia";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import authPlugin from "@/plugins/auth"; // Adjust the import path as necessary

const defaultContext: Context = {} as Context;

describe("Auth Plugin", () => {
  describe("Basic Scenarios", () => {
    it("should return immediately for auth and / paths", async () => {
      const result = await axios.get('http://localhost:8000/');
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("illustrious.cloud");
      expect(result.data.version).toBe("1.0.10");
    });

    it("should throw UnauthorizedError if no bearer is included", async () => {
      try {
        const response = await axios.post('http://localhost:8000/org');
      } catch (error) {
        const { data } = (error as AxiosError).response!;
        const errData = data as { code: number, message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("Access token is missing.");
      }
    });

    it ("should throw UnauthorizedError if bearer is invalid", async () => {
      try {
        const response = await axios.get('http://localhost:8000/org', {
          headers: {
            Authorization: "Bearer invalid",
          }
        });
      } catch (error) {
        const { data } = (error as AxiosError).response!;
        const errData = data as { code: number, message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("Invalid API key");
      }
    });

    it ("should throw UnauthorizedError if bearer is invalid", async () => {
      const mockUser: User = {
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

      vi.spyOn(supabaseClient.auth, 'getUser').mockResolvedValue({
        ...defaultContext,
        data: { user: mockUser },
        error: null,
      });

      try {
        const response = await axios.get('http://localhost:8000/org', {
          headers: {
            Authorization: "Bearer faked",
          }
        });
      } catch (error) {
        const { data } = (error as AxiosError).response!;
        const errData = data as { code: number, message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("User was not found.");
      }
    });
  });
});
