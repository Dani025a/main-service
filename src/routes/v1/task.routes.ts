import { Router } from "express";
import { taskController } from "../../controllers/task.controller.js";
import { requireGatewayOrM2mApiAuth } from "../../middleware/auth.middleware.js";

export const taskRoutes = Router();

taskRoutes.use(requireGatewayOrM2mApiAuth());

taskRoutes.get("/me", taskController.listMine);
taskRoutes.post("/", taskController.create);
taskRoutes.patch("/:id/status", taskController.changeStatus);
