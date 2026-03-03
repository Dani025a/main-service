import type { RequestHandler } from "express";
import {
    createNotification,
    listNotifications,
    markNotificationRead,
    type NotificationFilter,
    type NotificationKind,
} from "../services/notification.service.js";

function notificationFilterFromQuery(query: Record<string, unknown>): NotificationFilter {
    const filter: NotificationFilter = {};

    if (query.kind) filter.kind = query.kind as NotificationKind;
    if (query.read !== undefined) filter.read = String(query.read) === "true";

    return filter;
}

export const notificationController = {
    create: (async (req, res, next) => {
        try {
            const notification = await createNotification(req.body);
            res.status(201).json({ ok: true, notification });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    list: (async (req, res, next) => {
        try {
            const notifications = await listNotifications(notificationFilterFromQuery(req.query as Record<string, unknown>));
            res.json({ ok: true, notifications });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    markRead: (async (req, res, next) => {
        try {
            const notification = await markNotificationRead(req.params.id as string, req.body.read);
            res.json({ ok: true, notification });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,
};
