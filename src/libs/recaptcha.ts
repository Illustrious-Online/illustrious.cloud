import config from "@/config";

/**
 * Verifies a reCAPTCHA token with Google's verification API.
 *
 * @param token - The reCAPTCHA token to verify.
 * @returns A promise that resolves to true if the token is valid, false otherwise.
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!config.recaptcha?.secretKey) {
    console.warn("reCAPTCHA secret key not configured, skipping verification");
    return true; // Skip verification if not configured
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: config.recaptcha.secretKey,
          response: token,
        }),
      },
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}
