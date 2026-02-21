import config from "@/config";
import { BadRequestError } from "@/plugins/error";
import axios, { type AxiosInstance } from "axios";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// Allow injection of mock axios instance for testing
let axiosInstance: AxiosInstance = axios;

export function setAxiosInstance(instance: AxiosInstance | null) {
  axiosInstance = instance || axios;
}

export function getAxiosInstance(): AxiosInstance {
  return axiosInstance;
}

export interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

/**
 * Verifies a reCAPTCHA token with Google's API
 * @param token - The reCAPTCHA token from the client
 * @param remoteip - Optional client IP address for additional verification
 * @returns RecaptchaResponse with verification result
 * @throws BadRequestError if verification fails
 */
export async function verifyRecaptcha(
  token: string,
  remoteip?: string,
): Promise<RecaptchaResponse> {
  const secretKey = config.recaptcha.secretKey;

  if (!secretKey) {
    // In development, skip verification if secret key is not configured
    if (config.app.env === "development") {
      console.warn(
        "reCAPTCHA secret key not configured, skipping verification",
      );
      return { success: true };
    }
    throw new BadRequestError("reCAPTCHA is not properly configured");
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    if (remoteip) {
      params.append("remoteip", remoteip);
    }

    const response = await axiosInstance.post<RecaptchaResponse>(
      RECAPTCHA_VERIFY_URL,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const data = response.data;

    if (!data.success) {
      const errorCodes = data["error-codes"] || [];
      console.error("reCAPTCHA verification failed:", errorCodes);
      throw new BadRequestError("reCAPTCHA verification failed");
    }

    // For reCAPTCHA v3, check the score
    if (data.score !== undefined) {
      const threshold = config.recaptcha.scoreThreshold;
      if (data.score < threshold) {
        console.warn(`reCAPTCHA score too low: ${data.score}`);
        throw new BadRequestError(
          `reCAPTCHA score ${data.score} is below threshold ${threshold}`,
        );
      }
    }

    return data;
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      console.error("reCAPTCHA API error:", error.message);
      throw new BadRequestError("reCAPTCHA API error");
    }
    throw error;
  }
}
