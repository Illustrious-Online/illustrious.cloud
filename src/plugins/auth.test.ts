import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { supabaseClient } from "@/app";
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

describe("Auth Plugin", () => {
  describe("Basic Scenarios", () => {
    it("should return immediately for auth and / paths", async () => {
      const result = await axios.get("http://localhost:8000/");
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("illustrious.cloud");
      expect(result.data.version).toBe("1.0.10");
    });

    it("should throw UnauthorizedError if no bearer is included", async () => {
      try {
        const response = await axios.post("http://localhost:8000/org");
      } catch (error) {
        const response = (error as AxiosError).response;
        const errData = response?.data as { code: number; message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("Access token is missing.");
      }
    });

    it("should throw UnauthorizedError if bearer is invalid", async () => {
      try {
        const response = await axios.get("http://localhost:8000/org", {
          headers: {
            Authorization: "Bearer invalid",
          },
        });
      } catch (error) {
        const response = (error as AxiosError).response;
        const errData = response?.data as { code: number; message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("Invalid API key");
      }
    });

    it("should throw UnauthorizedError if bearer does not fetch Illustrious User", async () => {
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

      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue({
        ...defaultContext,
        data: { user: mockUser },
        error: null,
      });

      try {
        const response = await axios.get("http://localhost:8000/org", {
          headers: {
            Authorization: "Bearer faked",
          },
        });
      } catch (error) {
        const response = (error as AxiosError).response;
        const errData = response?.data as { code: number; message: string };
        expect(errData?.code).toBe(401);
        expect(errData?.message).toBe("User was not found.");
      }
    });

    // it("should create a new user on POST ", async () => {
    //   const mockUser: User = {
    //     id: "user_id",
    //     email: ""
    //   };
    // });
  });
});
