import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { AxiosError } from "axios";
import config from "@/config";
import { BadRequestError } from "@/plugins/error";
import {
  getAxiosInstance,
  setAxiosInstance,
  verifyRecaptcha,
} from "../recaptcha/service";
import {
  createMockAxiosInstance,
  createMockAxiosInstanceFail,
  setupMocks,
  teardownMocks,
} from "./utils/mocks";

describe("Recaptcha Service", () => {
  const originalSecretKey = config.recaptcha.secretKey;
  const originalEnv = config.app.env;

  beforeAll(() => {
    setupMocks();
  });

  afterAll(() => {
    teardownMocks();
    setAxiosInstance(null);
    // Restore original config values
    config.recaptcha.secretKey = originalSecretKey;
    config.app.env = originalEnv;
  });

  describe("verifyRecaptcha", () => {
    it("should verify valid reCAPTCHA token", async () => {
      setAxiosInstance(createMockAxiosInstance());

      const result = await verifyRecaptcha("valid-token");
      expect(result.success).toBe(true);
      expect(result.score).toBe(0.9);
    });

    it("should throw BadRequestError for invalid token", async () => {
      setAxiosInstance(createMockAxiosInstanceFail());

      await expect(verifyRecaptcha("invalid-token")).rejects.toThrow(
        BadRequestError,
      );
    });

    it("should handle API errors", async () => {
      const mockAxios = createMockAxiosInstanceFail();
      setAxiosInstance(mockAxios);

      await expect(verifyRecaptcha("token")).rejects.toThrow(BadRequestError);
    });

    it("should skip verification in development mode when secretKey is not configured", async () => {
      // Temporarily set secretKey to empty and env to development
      config.recaptcha.secretKey = "";
      config.app.env = "development";

      const result = await verifyRecaptcha("any-token");
      expect(result.success).toBe(true);

      // Restore
      config.recaptcha.secretKey = originalSecretKey;
      config.app.env = originalEnv;
    });

    it("should throw BadRequestError when secretKey is missing in non-development", async () => {
      // Temporarily set secretKey to empty and env to production
      config.recaptcha.secretKey = "";
      config.app.env = "production";

      await expect(verifyRecaptcha("any-token")).rejects.toThrow(
        BadRequestError,
      );

      // Restore
      config.recaptcha.secretKey = originalSecretKey;
      config.app.env = originalEnv;
    });

    it("should include remoteip parameter when provided", async () => {
      config.recaptcha.secretKey = "test-secret";
      let capturedParams: string | undefined;

      const mockAxios = {
        ...createMockAxiosInstance(),
        post: async (_url: string, data?: unknown) => {
          capturedParams = data as string;
          return {
            data: { success: true, score: 0.9 },
            status: 200,
            statusText: "OK",
            headers: {},
            config: {} as unknown,
          };
        },
      };
      setAxiosInstance(mockAxios);

      await verifyRecaptcha("token", "192.168.1.1");
      expect(typeof capturedParams).toBe("string");
      expect((capturedParams as string).includes("remoteip=192.168.1.1")).toBe(
        true,
      );

      config.recaptcha.secretKey = originalSecretKey;
    });

    it("should throw BadRequestError when score is below threshold", async () => {
      config.recaptcha.secretKey = "test-secret";
      const mockAxios = {
        ...createMockAxiosInstance(),
        post: async () => ({
          data: { success: true, score: 0.3 },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as unknown,
        }),
      };
      setAxiosInstance(mockAxios);

      await expect(verifyRecaptcha("token")).rejects.toThrow(BadRequestError);
      await expect(verifyRecaptcha("token")).rejects.toThrow("reCAPTCHA score");

      config.recaptcha.secretKey = originalSecretKey;
    });

    it("should handle axios errors and convert to BadRequestError", async () => {
      config.recaptcha.secretKey = "test-secret";
      const mockAxios = {
        ...createMockAxiosInstance(),
        post: async () => {
          const error = new Error("Network error") as AxiosError;
          error.isAxiosError = true;
          error.message = "Network error";
          throw error;
        },
      };
      setAxiosInstance(mockAxios);

      await expect(verifyRecaptcha("token")).rejects.toThrow(BadRequestError);
      await expect(verifyRecaptcha("token")).rejects.toThrow(
        "reCAPTCHA API error",
      );

      config.recaptcha.secretKey = originalSecretKey;
    });

    it("should re-throw non-axios errors", async () => {
      config.recaptcha.secretKey = "test-secret";
      const mockAxios = {
        ...createMockAxiosInstance(),
        post: async () => {
          throw new Error("Unexpected error");
        },
      };
      setAxiosInstance(mockAxios);

      await expect(verifyRecaptcha("token")).rejects.toThrow(
        "Unexpected error",
      );

      config.recaptcha.secretKey = originalSecretKey;
    });
  });

  describe("getAxiosInstance", () => {
    it("should return the current axios instance", () => {
      const instance = getAxiosInstance();
      expect(instance).toBeDefined();
    });
  });
});
