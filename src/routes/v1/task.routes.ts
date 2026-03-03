import { Router } from "express";
import { taskController } from "../../controllers/task.controller.js";
import { requireGatewayApiAuth } from "../../middleware/auth.middleware.js";

export const taskRoutes = Router();

taskRoutes.use(requireGatewayApiAuth());

taskRoutes.get("/me", taskController.listMine);
taskRoutes.post("/", taskController.create);
taskRoutes.patch("/:id/status", taskController.changeStatus);
