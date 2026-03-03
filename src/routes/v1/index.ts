import { Router } from "express";
import { notificationRoutes } from "./notification.routes.js";
import { taskRoutes } from "./task.routes.js";

export const v1Routes = Router();

v1Routes.use("/tasks", taskRoutes);
v1Routes.use("/notifications", notificationRoutes);
