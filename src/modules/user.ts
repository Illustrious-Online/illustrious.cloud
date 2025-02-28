import BadRequestError from "@/domain/exceptions/BadRequestError";
import ServerError from "@/domain/exceptions/ServerError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import { UserRole } from "@/domain/types/UserRole";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Invoice, Org, Report, User } from "@/drizzle/schema";
import * as userService from "@/services/user";

export interface UserDetails {
  user: User;
  reports?: Report[];
  invoices?: Invoice[];
  orgs?: Org[];
}

/**
 * Fetches the details of the authenticated user.
 *
 * @param context - The authenticated context containing user and query information.
 * @returns A promise that resolves to a success response containing user details.
 * @throws {BadRequestError} If the required user information is missing.
 */
export const me = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<UserDetails>> => {
  const { query, user } = context;
  const { include } = query;

  if (!user || !user.id) {
    throw new BadRequestError("Required user information is missing.");
  }

  let result = { user };

  if (include) {
    const resources = include.split(",");
    const foundResources = await userService.fetchResources(user.id, resources);
    result = { ...result, ...foundResources };
  }

  return {
    data: result,
    message: "User details fetched successfully!",
  };
};

/**
 * Fetches user details based on the provided context.
 *
 * @param context - The authenticated context containing parameters for fetching the user.
 * @returns A promise that resolves to a success response containing the user details.
 *
 * The fetched user details will have the phone, lastName, and superAdmin fields set to null or false.
 *
 * @example
 * ```typescript
 * const context = {
 *   params: {
 *     user: '12345',
 *     by: 'email'
 *   }
 * };
 * const response = await getUser(context);
 * console.log(response.data); // User details with phone, lastName, and superAdmin modified.
 * ```
 */
export const getUser = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<User>> => {
  const { params } = context;
  const { user: id, by } = params;

  const fetchedUser = await userService.fetchUser({ [by ?? "id"]: id });

  fetchedUser.phone = null;
  fetchedUser.lastName = null;
  fetchedUser.superAdmin = false;

  return {
    data: fetchedUser,
    message: "User details fetched successfully!",
  };
};

/**
 * Updates a user in the system.
 *
 * @param context - The authenticated context containing user information, permissions, and request parameters.
 * @returns A promise that resolves to a success response containing the updated user.
 * @throws UnauthorizedError - If the user does not have permission to update the specified user.
 */
export const putUser = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<User>> => {
  const {
    params: { user: id },
    permissions: { org, superAdmin },
    user,
  } = context;
  const body = context.body as User;
  let allowed: boolean | undefined;

  if (!superAdmin && id !== user.id && !allowed) {
    throw new UnauthorizedError(
      "You do not have permission to update this user.",
    );
  }

  if (
    superAdmin ||
    id === user.id ||
    (org?.role && org?.role > UserRole.CLIENT && allowed)
  ) {
    return {
      data: await userService.updateUser(body),
      message: "User updated successfully.",
    };
  }

  const data = await userService.updateUser(body);

  return {
    data,
    message: "User updated successfully.",
  };
};

/**
 * Deletes a user based on the provided context.
 *
 * @param context - The authenticated context containing user and parameters.
 * @returns A promise that resolves to a success response with a message.
 * @throws {UnauthorizedError} If the user is not a super admin and is trying to delete another user's account.
 * @throws {ServerError} If the user identifier is missing.
 */
export const deleteUser = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<string>> => {
  const { user } = context;
  const { id } = context.params;

  if (!user.superAdmin && user.id !== id) {
    throw new UnauthorizedError(
      "You do not have permission to delete this account.",
    );
  }

  if (!user.identifier) {
    throw new ServerError("User identifier is missing.", 500);
  }

  await userService.removeUser(id, user.identifier);

  return {
    message: "User deleted successfully.",
  };
};

/**
 * Links a Steam account to the authenticated user's account.
 *
 * @param {AuthenticatedContext} context - The authenticated context of the user.
 * @returns {Promise<void>} A promise that resolves when the user is redirected to the Steam link URL.
 * @throws {ServerError} If the Steam link URL could not be generated.
 */
export const linkSteam = async (
  context: AuthenticatedContext,
): Promise<void> => {
  const data = await userService.linkSteam();

  if (!data.url) {
    throw new ServerError("Failed to generate Steam link URL.", 500);
  }

  context.redirect(data.url);
};

/**
 * Handles the callback for linking a Steam account.
 *
 * This function calls the `linkSteam` method from the `userService` with a
 * parameter indicating whether the linking is successful. It then returns
 * an object containing a message from the response data.
 *
 * @returns {Promise<{ message: string }>} An object containing a message from the response data.
 */
export const steamCallback = async (): Promise<{ message: string }> => {
  const data = await userService.linkSteam(true);
  return {
    message: data.message ?? "Steam account linked successfully.",
  };
};
