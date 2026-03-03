import { Router } from "express";
import { notificationController } from "../../controllers/notification.controller.js";
import { requireGatewayApiAuth } from "../../middleware/auth.middleware.js";

export const notificationRoutes = Router();

notificationRoutes.use(requireGatewayApiAuth());

notificationRoutes.get("/me", notificationController.listMine);
notificationRoutes.post("/", notificationController.create);
notificationRoutes.patch("/:id/read", notificationController.markAsRead);
