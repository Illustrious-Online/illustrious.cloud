# Eden Treaty Integration

Eden Treaty provides end-to-end type safety between your Elysia backend and TypeScript frontend without code generation.

## Backend Setup

The backend already exports the `App` type:

```typescript
// src/app.ts
export type App = typeof app;
```

## Frontend Setup

### 1. Install Eden Treaty

```bash
npm install @elysiajs/eden
# or
bun add @elysiajs/eden
```

### 2. Create API Client

```typescript
// frontend/src/lib/api.ts
import { treaty } from "@elysiajs/eden";
import type { App } from "../../backend/src/app";

export const api = treaty<App>("http://localhost:3000", {
  fetch: {
    credentials: "include", // For cookies if needed
  },
});
```

### 3. Use Typed API Calls

```typescript
// Sign up
const response = await api.auth["sign-up"].post({
  email: "user@example.com",
  password: "SecurePassword123!",
  name: "John Doe",
});

// TypeScript knows the response type!
console.log(response.data?.token); // ✅ Typed
console.log(response.data?.user.email); // ✅ Typed

// Get current user (requires authentication)
const userResponse = await api.users.me.get({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Create organization
const orgResponse = await api.orgs.post(
  { name: "My Organization" },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);

// Create inquiry (public, requires reCAPTCHA)
const inquiryResponse = await api.inquiries.post({
  orgId: "org-id",
  name: "John Doe",
  email: "john@example.com",
  comment: "I'm interested in your services",
  recaptchaToken: "recaptcha-token-from-frontend",
});
```

## Type Safety Benefits

- ✅ **Autocomplete**: IDE suggests available endpoints and parameters
- ✅ **Type Checking**: Compile-time validation of request/response types
- ✅ **Refactoring**: Changes to backend automatically update frontend types
- ✅ **No Code Generation**: Types are inferred at compile time

## Authentication with Eden Treaty

### Storing and Using Tokens

```typescript
// Store token after sign-in
const signInResponse = await api.auth["sign-in"].post({
  email: "user@example.com",
  password: "password",
});

const token = signInResponse.data?.token;

// Use token in subsequent requests
const userResponse = await api.users.me.get({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Creating a Token Manager

```typescript
// frontend/src/lib/token-manager.ts
class TokenManager {
  private static readonly TOKEN_KEY = "auth_token";

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}

// Use in API client
export const api = treaty<App>("http://localhost:3000", {
  fetch: {
    credentials: "include",
    headers: {
      Authorization: `Bearer ${TokenManager.getToken() || ""}`,
    },
  },
});
```

## Error Handling

```typescript
try {
  const response = await api.users.me.get({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.error) {
    // Handle error (typed!)
    console.error(response.error.message);
    console.error(response.error.code);
  } else {
    // Handle success (typed!)
    console.log(response.data);
  }
} catch (error) {
  // Network errors, etc.
  console.error(error);
}
```

## Advanced Usage

### Custom Headers

```typescript
const response = await api.invoices.get({
  headers: {
    Authorization: `Bearer ${token}`,
    "X-Custom-Header": "value",
  },
});
```

### Query Parameters

```typescript
// If your route supports query params
const response = await api.orgs.get({
  query: {
    include: "invoices,reports",
  },
});
```

### Type-Safe Error Handling

```typescript
type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
    code: number;
  };
};

async function safeApiCall<T>(
  apiCall: Promise<ApiResponse<T>>,
): Promise<T> {
  const response = await apiCall;
  
  if (response.error) {
    throw new Error(`API Error: ${response.error.message}`);
  }
  
  if (!response.data) {
    throw new Error("No data returned");
  }
  
  return response.data;
}

// Usage
const user = await safeApiCall(
  api.users.me.get({
    headers: { Authorization: `Bearer ${token}` },
  }),
);
```

## React Example

```typescript
// frontend/src/hooks/useApi.ts
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { TokenManager } from "../lib/token-manager";

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = TokenManager.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api.users.me
      .get({
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (response.error) {
          setError(response.error);
        } else {
          setUser(response.data);
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, error };
}
```

## Best Practices

1. **Centralize API Client**: Create one API client instance and reuse it
2. **Token Management**: Use a token manager for consistent token handling
3. **Error Handling**: Create wrapper functions for consistent error handling
4. **Type Safety**: Let TypeScript guide you - if it compiles, types are correct
5. **Environment Variables**: Use different API URLs for dev/prod



