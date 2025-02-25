import type { Elysia } from "elysia";

import invoiceRouter from "../routes/invoice";
import orgRoutes from "../routes/org";
import reportRouter from "../routes/report";
import userRoutes from "../routes/user";

export default (app: Elysia) =>
  app.use(userRoutes).use(orgRoutes).use(reportRouter).use(invoiceRouter);
