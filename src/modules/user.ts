import BadRequestError from "@/domain/exceptions/BadRequestError";
import ServerError from "@/domain/exceptions/ServerError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import type { UserDetails } from "@/domain/interfaces/users";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { User } from "@/drizzle/schema";
import * as userService from "@/services/user";

/**
 * Fetches the details of the authenticated user.
 *
 * @param context - The authenticated context containing the user and query information.
 * @returns A promise that resolves to a success response containing the user details.
 *
 * The function retrieves the user details from the context and optionally includes additional resources
 * if specified in the query parameters. The resources are fetched using the userService.
 *
 * @example
 * ```typescript
 * const context = {
 *   query: { include: "posts,comments", org: "exampleOrg" },
 *   user: { id: "user123", name: "John Doe" }
 * };
 * const response = await me(context);
 * console.log(response.data); // { user: { id: "user123", name: "John Doe" }, posts: [...], comments: [...] }
 * ```
 */
export const me = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<UserDetails>> => {
  const { query, user } = context;
  let result = { user };

  if (query?.include) {
    const resources = query.include.split(",");
    const foundResources = await userService.fetchResources(
      user.id,
      resources,
      query.org,
    );
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
 * @param context - The authenticated context containing user identification details.
 * @returns A promise that resolves to a success response containing the user details.
 * @throws {BadRequestError} If the required user identification details are missing.
 */
export const getUser = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<User>> => {
  console.log("getUser");
  const { params, query } = context;
  console.log("params", params);
  console.log("query", query);

  if (!params.user) {
    throw new BadRequestError(
      "Required user identification details are missing",
    );
  }

  const { user: id } = params;
  const fetchedUser = await userService.fetchUser({ [query.by ?? "id"]: id });

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
 * @param context - The authenticated context containing user and permissions information.
 * @returns A promise that resolves to a success response containing the updated user.
 * @throws {UnauthorizedError} If the user does not have permission to update the specified user.
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

  if (!superAdmin && id !== user.id && !org?.managed) {
    throw new UnauthorizedError(
      "You do not have permission to update this user.",
    );
  }

  const data = await userService.updateUser(body);

  return {
    data,
    message: "User updated successfully.",
  };
};

/**
 * Deletes a user account based on the provided context.
 *
 * @param context - The authenticated context containing user information and parameters.
 * @returns A promise that resolves to a success response with a message indicating the user was deleted successfully.
 * @throws UnauthorizedError - If the user is not a super admin and tries to delete an account that is not their own.
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

  await userService.removeUser(id, user.identifier);

  return {
    message: "User deleted successfully.",
  };
};

/**
 * Links a Steam account to the authenticated user's account.
 *
 * This function calls the userService to generate a Steam link URL and redirects
 * the user to that URL. If the URL generation fails, it throws a ServerError.
 *
 * @param context - The authenticated context containing user information and methods.
 * @throws {ServerError} If the Steam link URL generation fails.
 * @returns {Promise<void>} A promise that resolves when the redirection is complete.
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
 * This function calls the `linkSteam` method from the `userService` to link a Steam account.
 * If the linking is successful, it returns a message indicating the success.
 *
 * @returns {Promise<{ message: string }>} A promise that resolves to an object containing a success message.
 */
export const steamCallback = async (): Promise<{ message: string }> => {
  const data = await userService.linkSteam(true);
  return {
    message: data.message ?? "Steam account linked successfully.",
  };
};
