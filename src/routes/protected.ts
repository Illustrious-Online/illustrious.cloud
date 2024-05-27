import { Elysia } from "elysia";

import authPlugin from "../plugins/auth";
import userRoutes from "../routes/user";

export default (app: Elysia) => app.use(authPlugin).use(userRoutes);
