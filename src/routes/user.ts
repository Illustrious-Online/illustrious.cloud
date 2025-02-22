import * as userController from "@/modules/user";
import { type Elysia, t } from "elysia";

export default (app: Elysia) =>
  app
    .get("/me", userController.me)
    .get("/user/:user", userController.fetchUser)
    .put("/user/:user", userController.update)
    .delete("/user/:user", userController.deleteOne)
    .post("/user/link/steam", userController.linkSteam)
    .post("/user/link/steam/auth", userController.steamCallback);
