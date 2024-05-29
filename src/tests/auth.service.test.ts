import { describe, expect, it } from 'bun:test';
import { faker } from '@faker-js/faker';

import * as authService from "../services/auth";

describe('SERVICES', () => {
  it('Auth Service: TESTING', async () => {
    const userAuth = {
      userId: faker.string.uuid(), 
      authId: faker.string.uuid(), 
      sub: faker.string.uuid()
    }
    
    const response = await authService.create(userAuth);

    expect(response).toMatchObject(userAuth);
  });
});