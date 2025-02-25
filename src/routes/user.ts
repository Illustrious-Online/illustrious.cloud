import * as userController from "@/modules/user";
import { type Elysia, t } from "elysia";
import authPlugin from "../plugins/auth";

export default (app: Elysia) =>
  app
    .get("/me", authPlugin, userController.me)
    .get("/user/:user", authPlugin, userController.fetchUser)
    .put("/user/:user", authPlugin, userController.update)
    .delete("/user/:user", authPlugin, userController.deleteOne)
    .post("/user/link/steam", authPlugin, userController.linkSteam)
    .post("/user/link/steam/auth", authPlugin, userController.steamCallback);
