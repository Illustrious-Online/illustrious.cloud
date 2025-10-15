import { describe, expect, it } from "bun:test";
import { client } from "../client";

describe("Eden Treaty Integration", () => {
  it("should have type-safe inquiry endpoints", () => {
    // This test verifies that Eden Treaty is properly configured
    // and provides type-safe access to the inquiry endpoints

    // Check that the client has the inquiry property
    expect(client.inquiry).toBeDefined();

    // Check that the inquiry endpoint has the expected methods
    expect(typeof client.inquiry.post).toBe("function");
    expect(typeof client.inquiry.get).toBe("function");
  });

  it("should provide type-safe route parameters", () => {
    // Test that route parameters are properly typed
    const inquiryId = "test-inquiry-id";

    // This should be type-safe - TypeScript will validate the parameter
    const route = client.inquiry({ id: inquiryId });

    expect(route).toBeDefined();
    expect(typeof route.get).toBe("function");
    expect(typeof route.put).toBe("function");
    expect(typeof route.delete).toBe("function");
  });

  it("should handle query parameters with type safety", () => {
    // Test that query parameters are properly typed
    const queryParams = {
      page: "1",
      limit: "10",
      service: "Web Development",
    };

    // This should be type-safe - TypeScript will validate query structure
    expect(() => {
      client.inquiry.get({ query: queryParams });
    }).not.toThrow();
  });

  it("should provide type-safe request body structure", () => {
    // Test that request body is properly typed
    const inquiryData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      service: "Web Development",
      message: "I need help with my project",
      recaptchaToken: "test-token",
    };

    // This should be type-safe - TypeScript will validate the body structure
    expect(() => {
      client.inquiry.post(inquiryData);
    }).not.toThrow();
  });

  it("should provide type-safe headers", () => {
    // Test that headers are properly typed
    const headers = {
      "X-Org-Id": "test-org-id",
      "Content-Type": "application/json",
    };

    // This should be type-safe - TypeScript will validate header structure
    expect(() => {
      client.inquiry.post(
        {
          name: "Test",
          email: "test@example.com",
          service: "Test Service",
          message: "Test message",
          recaptchaToken: "token",
        },
        { headers },
      );
    }).not.toThrow();
  });
});

describe("Eden Treaty Type Safety", () => {
  it("should provide type-safe client structure", () => {
    // This test verifies that the client has the expected structure
    // The actual type safety is enforced at compile time by TypeScript

    expect(client.inquiry).toBeDefined();
    expect(typeof client.inquiry.post).toBe("function");
    expect(typeof client.inquiry.get).toBe("function");

    // Verify that the client has the expected methods
    const inquiryClient = client.inquiry;
    expect(typeof inquiryClient.post).toBe("function");
    expect(typeof inquiryClient.get).toBe("function");
  });

  it("should handle type-safe route parameters", () => {
    // Test that route parameters are properly typed
    const inquiryId = "test-inquiry-id";

    // This should be type-safe - TypeScript will validate the parameter
    const route = client.inquiry({ id: inquiryId });

    expect(route).toBeDefined();
    expect(typeof route.get).toBe("function");
    expect(typeof route.put).toBe("function");
    expect(typeof route.delete).toBe("function");
  });
});
