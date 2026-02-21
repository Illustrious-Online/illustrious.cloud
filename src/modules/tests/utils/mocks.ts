import { setTransporter } from "@/modules/mailer/service";
import { setAxiosInstance } from "@/modules/recaptcha/service";
import type {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import type { Transporter } from "nodemailer";

/**
 * Mock axios instance for reCAPTCHA testing
 */
export function createMockAxiosInstance(): AxiosInstance {
  return {
    post: async (url: string, data?: unknown) => {
      // Mock successful reCAPTCHA verification
      if (url.includes("recaptcha")) {
        return {
          data: {
            success: true,
            score: 0.9,
            action: "submit",
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        };
      }
      throw new Error("Unexpected URL");
    },
    get: async () => {
      throw new Error("GET not implemented in mock");
    },
    put: async () => {
      throw new Error("PUT not implemented in mock");
    },
    delete: async () => {
      throw new Error("DELETE not implemented in mock");
    },
    patch: async () => {
      throw new Error("PATCH not implemented in mock");
    },
    request: async () => {
      throw new Error("REQUEST not implemented in mock");
    },
    defaults: {} as AxiosRequestConfig,
    interceptors: {
      request: { use: () => {}, eject: () => {} },
      response: { use: () => {}, eject: () => {} },
    },
  } as AxiosInstance;
}

/**
 * Mock axios instance that fails reCAPTCHA
 */
export function createMockAxiosInstanceFail(): AxiosInstance {
  return {
    post: async (url: string) => {
      if (url.includes("recaptcha")) {
        return {
          data: {
            success: false,
            "error-codes": ["invalid-input-response"],
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        };
      }
      throw new Error("Unexpected URL");
    },
    get: async () => {
      throw new Error("GET not implemented in mock");
    },
    put: async () => {
      throw new Error("PUT not implemented in mock");
    },
    delete: async () => {
      throw new Error("DELETE not implemented in mock");
    },
    patch: async () => {
      throw new Error("PATCH not implemented in mock");
    },
    request: async () => {
      throw new Error("REQUEST not implemented in mock");
    },
    defaults: {} as AxiosRequestConfig,
    interceptors: {
      request: { use: () => {}, eject: () => {} },
      response: { use: () => {}, eject: () => {} },
    },
  } as AxiosInstance;
}

/**
 * Mock nodemailer transporter
 */
export function createMockTransporter(): Transporter {
  return {
    sendMail: async (options) => {
      // Mock successful email send
      return {
        messageId: "mock-message-id",
        accepted: [options.to as string],
        rejected: [],
        pending: [],
        response: "250 OK",
      };
    },
    verify: async () => true,
    close: async () => {},
  } as Transporter;
}

/**
 * Setup mocks for external services
 */
export function setupMocks() {
  setAxiosInstance(createMockAxiosInstance());
  setTransporter(createMockTransporter());
}

/**
 * Teardown mocks
 */
export function teardownMocks() {
  setAxiosInstance(null);
  setTransporter(null);
}
