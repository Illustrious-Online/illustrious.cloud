import { beforeEach, describe, expect, it, mock } from "bun:test";
import config from "@/config"; // Adjust the import path as necessary
import { supabaseClient } from "@/app";
import ServerError from "@/domain/exceptions/ServerError";
import type { User as IllustriousUser } from "@/drizzle/schema";
import * as userService from "@/services/user";
import { faker } from "@faker-js/faker";
import {
  AuthError,
  type Provider,
  type User,
} from "@supabase/auth-js";
import type { Context } from "elysia";
import { vi } from "vitest";
import { oauthCallback, signInWithOAuth, signOut } from "./auth";

const defaultContext: Context = {} as Context;

describe("auth service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  describe("signInWithOAuth", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should sign in with OAuth and return the URL", async () => {
      const provider: Provider = "discord";
      const mockUrl = "https://example.com/oauth";
      vi.spyOn(supabaseClient.auth, "signInWithOAuth").mockResolvedValue({
        ...defaultContext,
        data: { provider, url: mockUrl },
        error: null,
      });

      const result = await signInWithOAuth(provider);

      expect(result).toEqual({
        provider,
        url: mockUrl
      });
      expect(supabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider,
        options: {
          redirectTo: `${config.app.url}/auth/callback`,
        },
      });
    });

    it("should throw ServerError if sign-in fails", async () => {
      const provider: Provider = "discord";
      const mockError = new AuthError("Sign-in failed");
      vi.spyOn(supabaseClient.auth, "signInWithOAuth").mockResolvedValue({
        ...defaultContext,
        data: { provider, url: null },
        error: mockError,
      });

      await expect(signInWithOAuth(provider)).rejects.toThrow(ServerError);
      expect(supabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider,
        options: {
          redirectTo: `${config.app.url}/auth/callback`,
        },
      });
    });
  });

  describe("oauthCallback", () => {
    it("should handle OAuth callback and return the user", async () => {
      const code = "auth_code";
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
      const mockFetchedUser = {
        id: "user_id",
        identifier: "identifier",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "1234567890",
        picture: "avatar_url",
        managed: false,
        superAdmin: false,
      };
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue(
        {
          ...defaultContext,
          data: {
            user: mockUser,
          },
          error: null,
        },
      );
      vi.spyOn(userService, "fetchUser").mockResolvedValue(mockFetchedUser);

      const result = await oauthCallback(code);

      expect(result).toBe(mockFetchedUser);
      expect(supabaseClient.auth.getUser).toHaveBeenCalledWith(
        code,
      );
      expect(userService.fetchUser).toHaveBeenCalledWith({ id: mockUser.id });
    });

    it("should create a new user if fetching fails", async () => {
      const code = "auth_code";
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
      const newUserId = faker.string.uuid();
      const mockNewUser: IllustriousUser = {
        id: newUserId,
        phone: null,
        identifier: "",
        email: null,
        firstName: null,
        lastName: null,
        picture: null,
        managed: false,
        superAdmin: false,
      };
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue(
        {
          ...defaultContext,
          data: { user: mockUser },
          error: null,
        },
      );
      vi.spyOn(userService, "fetchUser").mockRejectedValue(
        new Error("User not found"),
      );
      vi.spyOn(userService, "updateOrCreate").mockResolvedValue(mockNewUser);

      const result = await oauthCallback(code);

      expect(result).toBe(mockNewUser);
      expect(supabaseClient.auth.getUser).toHaveBeenCalledWith(
        code,
      );
      expect(userService.fetchUser).toHaveBeenCalledWith({ id: mockUser.id });
      expect(userService.updateOrCreate).toHaveBeenCalled();
    });

    it("should throw ServerError if code exchange fails", async () => {
      const code = "auth_code";
      const mockError = new AuthError("Code exchange failed");
      vi.spyOn(supabaseClient.auth, "getUser").mockResolvedValue(
        {
          ...defaultContext,
          data: {
            user: null,
          },
          error: mockError,
        },
      );

      await expect(oauthCallback(code)).rejects.toThrow(ServerError);
      expect(supabaseClient.auth.getUser).toHaveBeenCalledWith(
        code,
      );
    });
  });

  describe("signOut", () => {
    it("should sign out the user", async () => {
      vi.spyOn(supabaseClient.auth, "signOut").mockResolvedValue({
        ...defaultContext,
        error: null,
      });

      await signOut();

      expect(supabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it("should throw ServerError if sign-out fails", async () => {
      const mockError = new AuthError("Sign-out failed");
      vi.spyOn(supabaseClient.auth, "signOut").mockResolvedValue({
        ...defaultContext,
        error: mockError,
      });

      await expect(signOut()).rejects.toThrow(ServerError);
      expect(supabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });
});
