import { beforeAll, describe, expect, it } from 'bun:test';

import { app } from '../app';
import { getRequest } from '.';
import ConflictError from '../domain/exceptions/ConflictError';

describe('Elysia', () => {
  it('Auth Module: "/auth/success" throws exception for missing code', async () => {
    const response = await app.handle(getRequest('/auth/success'));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Unable to authenticate: Missing auth code",
      code: 409
    });
  });

  it('Auth Module: "/auth/success" throws exception with invalid code', async () => {
    const response = await app.handle(getRequest('/auth/success?code=123'));
    const json = await response.json();

    expect(json).toMatchObject({
      message: "Unable to resolve tokens.",
      code: 409
    });
  });
});