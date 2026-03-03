import type { RequestHandler } from "express";
import {
    createNotificationDto,
    notificationIdParamsDto,
    notificationQueryDto,
} from "../dtos/notification.dto.js";
import { getPrincipal } from "../middleware/auth.middleware.js";
import {
    createNotification,
    listNotificationsForSeller,
    markNotificationAsRead,
} from "../services/notification.service.js";
import { AppError } from "../utils/errors.js";

function requireUserPrincipal(req: Parameters<RequestHandler>[0]) {
    const principal = getPrincipal(req);

    if (!principal || principal.type !== "user") {
        throw new AppError(403, "FORBIDDEN", "User principal required");
    }

    return principal;
}

export const notificationController = {
    listMine: (async (req, res, next) => {
        try {
            const principal = requireUserPrincipal(req);
            const query = notificationQueryDto.parse(req.query);

            const notifications = await listNotificationsForSeller({
                sellerId: principal.userId,
                ...(query.read !== undefined ? { read: query.read } : {}),
            });

            res.json({ ok: true, data: notifications });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    create: (async (req, res, next) => {
        try {
            const principal = requireUserPrincipal(req);
            const body = createNotificationDto.parse(req.body);

            const notification = await createNotification({
                sellerId: body.sellerId ?? principal.userId,
                kind: body.kind,
                message: body.message,
                ...(body.relatedOrder !== undefined ? { relatedOrder: body.relatedOrder } : {}),
                ...(body.relatedCustomer !== undefined ? { relatedCustomer: body.relatedCustomer } : {}),
            });

            res.status(201).json({ ok: true, data: notification });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    markAsRead: (async (req, res, next) => {
        try {
            const principal = requireUserPrincipal(req);
            const params = notificationIdParamsDto.parse(req.params);

            const notification = await markNotificationAsRead(params.id, principal.userId);

            res.json({ ok: true, data: notification });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,
};
