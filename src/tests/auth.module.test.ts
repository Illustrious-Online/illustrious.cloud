import { describe, expect, it } from 'bun:test';
import { faker } from '@faker-js/faker';

import { app } from '../app';
import { getRequest } from '.';
import { NotFoundError } from 'elysia';
import { User } from '../../drizzle/schema';
import { mockModule } from '../utils/mock';
import { mocks } from './setup';

let testUser = {
  sub: faker.string.uuid(),
  email: faker.internet.email(),
  given_name: faker.person.firstName(),
  family_name: faker.person.lastName(),
  phone_number: faker.phone.number(),
  picture: faker.internet.url()
}

const fakeTokens = {
  access_token: 'access_token',
  refresh_token: 'refresh_token',
  id_token: 'id_token',
};

const pushTestMocks = async () => {
  mocks.push(
    await mockModule("../services/auth.ts", () => {
      return {
        getTokens: () => {
          return fakeTokens
        }
      };
    }),
    await mockModule("jwt-decode", () => {
      return {
        jwtDecode: () => {
          return testUser
        }
      }
    })
  );
}

describe('Auth Module', () => {
  it('/auth/success throws exception for missing code', async () => {
    const response = await app.handle(getRequest('/auth/success'));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Authorization code is required.",
      code: 409
    });
  });

  it('/auth/success throws exception for invalid code', async () => {
    const response = await app.handle(getRequest('/auth/success?code=123'));
    expect(response.ok).toBeFalse;

    const json = await response.json();
    expect(json).toMatchObject({
      message: "invalid_grant: Invalid authorization code",
      code: 403
    });
  });

  it('/auth/success throws exception for missing token', async () => {
    mocks.push(
      await mockModule("../services/auth.ts", () => {
        return {
          getTokens: () => {
            return {
              access_token: 'access_token',
              refresh_token: 'refresh_token',
              id_token: null
            };
          }
        };
      })
    );

    const response = await app.handle(getRequest('/auth/success?code=123'));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Failed to obtain all required tokens",
      code: 409
    });
  });

  it('/auth/success throws jwt decode error', async () => {
    mocks.push(
      await mockModule("../services/auth.ts", () => {
        return {
          getTokens: () => {
            return fakeTokens
          }
        }
      })
    );

    const response = await app.handle(getRequest('/auth/success?code=123'));
    const json = await response.json();

    expect(response.ok).toBeFalse;
    expect(json).toMatchObject({
      message: "Invalid token specified: missing part #2",
      code: 503
    });
  });

  it('/auth/success successfully redirect brand new user', async () => {
    await pushTestMocks();

    const response = await app.handle(getRequest('/auth/success?code=123'));
    const location = response.headers.get('location');

    expect(response.ok).toBeTrue;
    expect(location).toBe('http://localhost:8000?accessToken=access_token&refreshToken=refresh_token')
    expect(response.status).toBe(302);
  });

  it('Auth Module: "/auth/success" successfully redirect with existing sub', async () => {
    await pushTestMocks();

    const response = await app.handle(getRequest('/auth/success?code=123'));
    const location = response.headers.get('location');

    expect(response.ok).toBeTrue;
    expect(location).toBe('http://localhost:8000?accessToken=access_token&refreshToken=refresh_token')
    expect(response.status).toBe(302);
  });

  it('Auth Module: "/auth/success" successfully redirect brand with new sub', async () => {
    testUser.sub = faker.string.uuid();
    await pushTestMocks();

    const response = await app.handle(getRequest('/auth/success?code=123'));
    const location = response.headers.get('location');

    expect(response.ok).toBeTrue;
    expect(location).toBe('http://localhost:8000?accessToken=access_token&refreshToken=refresh_token')
    expect(response.status).toBe(302);
  });
});
