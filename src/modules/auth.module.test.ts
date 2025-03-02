import { beforeEach, describe, expect, it } from "bun:test";
import ConflictError from "@/domain/exceptions/ConflictError";
import ServerError from "@/domain/exceptions/ServerError";
import * as authService from "@/services/auth";
import type { Context } from "elysia";
import { vi } from "vitest";
import { oauthCallback, signInWithOAuth, signOut } from "./auth";

const defaultContext: Context = {} as Context;

describe("auth module", () => {
  describe("signInWithOAuth", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should throw ConflictError if provider is not provided", async () => {
      const context = { ...defaultContext, params: {} };
      await expect(signInWithOAuth(context)).rejects.toThrow(ConflictError);
    });

    it("should redirect to the authentication URL if provider is provided", async () => {
      const context = {
        ...defaultContext,
        params: { provider: "google" },
        redirect: vi.fn(),
      };

      vi.spyOn(authService, "signInWithOAuth").mockResolvedValue({
        provider: "google",
        url: "http://auth.url",
      });
      await signInWithOAuth(context);
      expect(context.redirect).toHaveBeenCalledWith("http://auth.url");
    });

    it("should throw ServerError if authentication URL is not found", async () => {
      const context = { ...defaultContext, params: { provider: "" } };
      await expect(signInWithOAuth(context)).rejects.toThrow(ConflictError);
    });
  });

  describe("oauthCallback", () => {
    it("should throw ServerError if code is not provided", async () => {
      const context = { ...defaultContext, query: {} };

      await expect(oauthCallback(context)).rejects.toThrow(ServerError);
    });

    it("should return success response if code is provided", async () => {
      const context = { ...defaultContext, query: { code: "auth_code" } };
      const user = {
        id: "1",
        identifier: "identifier",
        email: null,
        firstName: null,
        lastName: null,
        picture: null,
        phone: null,
        managed: false,
        superAdmin: false,
      };
      vi.spyOn(authService, "oauthCallback").mockResolvedValue(user);

      const response = await oauthCallback(context);

      expect(response).toEqual({
        data: user,
        message: "User authenticated successfully.",
      });
    });
  });

  describe("signOut", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });
    it("should sign out and redirect to home", async () => {
      const context = { ...defaultContext, redirect: vi.fn() };

      await signOut(context);

      expect(context.redirect).toHaveBeenCalledWith("/");
    });
  });
});
