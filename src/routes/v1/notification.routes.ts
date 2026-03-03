import { Router } from "express";
import { notificationController } from "../../controllers/notification.controller.js";
import { requireGatewayOrM2mApiAuth } from "../../middleware/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.middleware.js";
import {
    createNotificationBodySchema,
    listNotificationQuerySchema,
    markNotificationReadBodySchema,
    updateNotificationParamsSchema,
} from "./notification.schemas.js";

export const notificationRoutes = Router();

notificationRoutes.use(requireGatewayOrM2mApiAuth());

notificationRoutes.post("/", validateBody(createNotificationBodySchema), notificationController.create);
notificationRoutes.get("/", validateQuery(listNotificationQuerySchema), notificationController.list);
notificationRoutes.patch(
    "/:id/read",
    validateParams(updateNotificationParamsSchema),
    validateBody(markNotificationReadBodySchema),
    notificationController.markRead,
);
