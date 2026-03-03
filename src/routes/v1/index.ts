import { Router } from "express";
import { taskRoutes } from "./task.routes.js";

export const v1Routes = Router();

v1Routes.use("/tasks", taskRoutes);
