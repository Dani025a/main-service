import { Router } from "express";
import { notificationController } from "../../controllers/notification.controller.js";
import { requireGatewayOrM2mApiAuth } from "../../middleware/auth.middleware.js";

export const notificationRoutes = Router();

notificationRoutes.use(requireGatewayOrM2mApiAuth());

notificationRoutes.get("/me", notificationController.listMine);
notificationRoutes.post("/", notificationController.create);
notificationRoutes.patch("/:id/read", notificationController.markAsRead);
