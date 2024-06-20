import { faker } from "@faker-js/faker"
import { Invoice, Org, User, Report } from "../../drizzle/schema"
import AuthUserInfo from "../domain/interfaces/authUserInfo"
import Tokens from "../domain/interfaces/tokens"
import config from "../config"

export const generateData = (
  set: string[],
  user?: {
    id: string,
    email: string
  }
): {
  user?: User,
  userData?: AuthUserInfo,
  tokens?: Tokens,
  invoice?: Invoice,
  org?: Org,
  report?: Report
} => {
  let userId = user?.id;
  let userEmail = user?.email

  const result: {
    user?: User,
    userData?: AuthUserInfo,
    tokens?: Tokens,
    invoice?: Invoice,
    org?: Org,
    report?: Report
  } = {};

  if (set.includes('user')) {
    result.user = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      picture: faker.internet.url(),
    }

    result.userData = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
      given_name: faker.person.firstName(),
      family_name: faker.person.lastName(),
      phone_number: faker.phone.number(),
      picture: faker.internet.url(),
      aud: config.auth.audience,
      iss: config.auth.url,
      sid: faker.string.uuid()
    }

    userId = result.user.id;
    userEmail = result.user.email;
  }

  if (!userId) {
    userId = faker.string.uuid();
  }

  if (!userEmail) {
    userEmail = faker.internet.email();
  }

  if (set.includes('tokens')) {
    result.tokens = {
      access_token: "access_token",
      refresh_token: "refresh_token",
      id_token: "id_token"
    }
  }

  if (set.includes('invoice')) {
    result.invoice = {
      id: faker.string.uuid(),
      owner: userId,
      value: faker.finance.amount(),
      paid: false,
      start: faker.date.recent({ days: 15 }),
      end: faker.date.soon({ days: 15 }),
      due: faker.date.soon({ days: 20 }),
    }
  }

  if (set.includes('report')) {
    result.report = {
      id: faker.string.uuid(),
      owner: userId,
      rating: faker.number.int({ min: 0, max: 10 }),
      notes: faker.lorem.lines(3),
    }
  }

  if (set.includes('org')) {
    result.org = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      contact: userEmail
    }
  }

  return result;
}
