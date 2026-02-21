import { getSessionFromHeader } from "@/lib/auth";
import { Elysia } from "elysia";
import { createAuthHelpers } from "../auth/middleware";
import { userModel } from "./model";
import {
  getProfileByUserId,
  getUserWithProfile,
  updateProfile,
} from "./service";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(userModel)
  .derive(async ({ headers }) => {
    const { session, user } = await getSessionFromHeader(headers.authorization);
    return createAuthHelpers(session, user);
  })
  // Get current user (from better-auth)
  .get(
    "/me",
    async ({ requireAuth }) => {
      const authContext = await requireAuth();
      const userWithProfile = await getUserWithProfile(authContext.userId);

      return {
        id: authContext.user.id,
        email: authContext.user.email,
        name: authContext.user.name,
        image: authContext.user.image,
        emailVerified: authContext.user.emailVerified,
        profile: userWithProfile?.profile
          ? {
              firstName: userWithProfile.profile.firstName,
              lastName: userWithProfile.profile.lastName,
              phone: userWithProfile.profile.phone,
              managed: userWithProfile.profile.managed,
              siteRole: userWithProfile.profile.siteRole,
            }
          : undefined,
      };
    },
    {
      response: {
        200: "fullUserResponse",
      },
    },
  )
  // Get current user's profile
  .get(
    "/me/profile",
    async ({ requireAuth }) => {
      const authContext = await requireAuth();
      const profile = await getProfileByUserId(authContext.userId);

      if (!profile) {
        // Return empty profile structure
        return {
          userId: authContext.userId,
          firstName: null,
          lastName: null,
          phone: null,
          managed: false,
          siteRole: 2, // Default to Normal User
        };
      }

      return {
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        managed: profile.managed,
        siteRole: profile.siteRole,
      };
    },
    {
      response: {
        200: "userProfileResponse",
      },
    },
  )
  // Update current user's profile
  .patch(
    "/me/profile",
    async ({ requireAuth, body, set }) => {
      const authContext = await requireAuth();
      const updatedProfile = await updateProfile(authContext.userId, body);

      set.status = 200;
      return {
        userId: updatedProfile.userId,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        phone: updatedProfile.phone,
        managed: updatedProfile.managed,
        siteRole: updatedProfile.siteRole,
      };
    },
    {
      body: "updateProfileBody",
      response: {
        200: "userProfileResponse",
      },
    },
  );
