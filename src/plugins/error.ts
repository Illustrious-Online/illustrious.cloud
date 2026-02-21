import { captureException } from "@/utils/sentry";
import { Elysia } from "elysia";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

/**
 * Base class for application errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    public code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 400 Bad Request - Invalid request data
 */
export class BadRequestError extends AppError {
  constructor(message: string = ReasonPhrases.BAD_REQUEST) {
    super(message, StatusCodes.BAD_REQUEST, "BAD_REQUEST");
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = ReasonPhrases.UNAUTHORIZED) {
    super(message, StatusCodes.UNAUTHORIZED, "UNAUTHORIZED");
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
  constructor(message: string = ReasonPhrases.FORBIDDEN) {
    super(message, StatusCodes.FORBIDDEN, "FORBIDDEN");
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = ReasonPhrases.NOT_FOUND) {
    super(message, StatusCodes.NOT_FOUND, "NOT_FOUND");
  }
}

/**
 * 409 Conflict - Resource already exists
 */
export class ConflictError extends AppError {
  constructor(message: string = ReasonPhrases.CONFLICT) {
    super(message, StatusCodes.CONFLICT, "CONFLICT");
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 */
export class ValidationError extends AppError {
  constructor(message: string = ReasonPhrases.UNPROCESSABLE_ENTITY) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR");
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class ServerError extends AppError {
  constructor(message: string = ReasonPhrases.INTERNAL_SERVER_ERROR) {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR, "SERVER_ERROR");
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
  };
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(
  message: string,
  statusCode: number,
  code: string,
): ErrorResponse {
  return {
    success: false,
    error: {
      message,
      code,
      statusCode,
    },
  };
}

/**
 * Maps error names to HTTP status codes
 * Used as fallback when instanceof checks fail (e.g., across module boundaries)
 */
const ERROR_NAME_STATUS_MAP: Record<string, number> = {
  ForbiddenError: StatusCodes.FORBIDDEN,
  UnauthorizedError: StatusCodes.UNAUTHORIZED,
  NotFoundError: StatusCodes.NOT_FOUND,
  BadRequestError: StatusCodes.BAD_REQUEST,
  ConflictError: StatusCodes.CONFLICT,
  ValidationError: StatusCodes.UNPROCESSABLE_ENTITY,
} as const;

/**
 * Determines HTTP status code from error message patterns
 * Used as a last resort fallback for unknown error types
 */
function inferStatusFromMessage(message: string): number | null {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("not an admin") ||
    lowerMessage.includes("not authorized") ||
    lowerMessage.includes("forbidden")
  ) {
    return StatusCodes.FORBIDDEN;
  }

  if (
    lowerMessage.includes("not found") ||
    lowerMessage.includes("does not exist")
  ) {
    return StatusCodes.NOT_FOUND;
  }

  return null;
}

/**
 * Elysia error handling plugin
 * Provides consistent error responses across the application
 */
const errorPlugin = new Elysia({ name: "error-plugin" }).onError(
  ({ error, set }): ErrorResponse => {
    // Handle known application errors (primary path - most common)
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return createErrorResponse(
        error.message,
        error.statusCode,
        error.code || error.name.toUpperCase(),
      );
    }

    // Extract error properties safely
    const err = error as Error;
    const errName = err?.name || "UnknownError";
    const errMessage = err?.message || "Unknown error";

    // Check if error has statusCode property (fallback for serialized errors)
    const errorWithStatusCode = error as { statusCode?: number; code?: string };
    if (errorWithStatusCode.statusCode) {
      set.status = errorWithStatusCode.statusCode;
      return createErrorResponse(
        errMessage,
        errorWithStatusCode.statusCode,
        errorWithStatusCode.code || errName.toUpperCase(),
      );
    }

    // Map error names to status codes (for cases where instanceof fails)
    if (errName in ERROR_NAME_STATUS_MAP) {
      const statusCode = ERROR_NAME_STATUS_MAP[errName];
      set.status = statusCode;
      return createErrorResponse(errMessage, statusCode, errName.toUpperCase());
    }

    // Handle Elysia validation errors
    if (errName === "ValidationError" || errName === "TypeError") {
      set.status = StatusCodes.BAD_REQUEST;
      return createErrorResponse(
        errMessage || "Validation failed",
        StatusCodes.BAD_REQUEST,
        "VALIDATION_ERROR",
      );
    }

    // Try to infer status from error message (last resort fallback)
    const inferredStatus = inferStatusFromMessage(errMessage);
    if (inferredStatus) {
      set.status = inferredStatus;
      return createErrorResponse(
        errMessage,
        inferredStatus,
        inferredStatus === StatusCodes.FORBIDDEN ? "FORBIDDEN" : "NOT_FOUND",
      );
    }

    // Handle unknown errors - log to Sentry and return generic error
    const isProduction = process.env.NODE_ENV === "production";

    // Log unexpected errors for debugging
    if (!isProduction) {
      console.error("Unhandled error:", {
        name: errName,
        message: errMessage,
        stack: err?.stack,
      });
    }

    // Capture in Sentry for production monitoring
    if (err instanceof Error) {
      captureException(err, {
        errorName: errName,
        isHandled: false,
      });
    }

    set.status = StatusCodes.INTERNAL_SERVER_ERROR;
    return createErrorResponse(
      isProduction ? "Internal server error" : errMessage,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "SERVER_ERROR",
    );
  },
);

export default errorPlugin;
