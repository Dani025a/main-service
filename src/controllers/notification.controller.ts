import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../utils/errors.js";
import {
    createNotification,
    listNotifications,
    markNotificationAsRead,
    notificationKinds,
} from "../services/notification.service.js";

const NotificationQuerySchema = z.object({
    sellerId: z.string().min(1).optional(),
    relatedQuote: z.string().min(1).optional(),
    relatedCustomer: z.string().min(1).optional(),
    sortBy: z.enum(["timestamp", "sellerId"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
});

const CreateNotificationSchema = z.object({
    sellerId: z.string().min(1),
    kind: z.enum(notificationKinds),
    message: z.string().min(1),
    relatedQuote: z.string().min(1).optional(),
    relatedCustomer: z.string().min(1).optional(),
});

const NotificationParamSchema = z.object({
    id: z.string().min(1),
});

export const notificationController = {
    listMine: (async (req, res, next) => {
        try {
            const parsed = NotificationQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid notification query", parsed.error.flatten());
            }

            const filters = {
                ...(parsed.data.sellerId ? { sellerId: parsed.data.sellerId } : {}),
                ...(parsed.data.relatedQuote ? { relatedQuote: parsed.data.relatedQuote } : {}),
                ...(parsed.data.relatedCustomer ? { relatedCustomer: parsed.data.relatedCustomer } : {}),
                ...(parsed.data.sortBy ? { sortBy: parsed.data.sortBy } : {}),
                ...(parsed.data.sortOrder ? { sortOrder: parsed.data.sortOrder } : {}),
            };

            const notifications = await listNotifications(filters);
            res.json({ ok: true, data: notifications });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    create: (async (req, res, next) => {
        try {
            const parsed = CreateNotificationSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid notification payload", parsed.error.flatten());
            }

            const payload = {
                sellerId: parsed.data.sellerId,
                kind: parsed.data.kind,
                message: parsed.data.message,
                ...(parsed.data.relatedQuote ? { relatedQuote: parsed.data.relatedQuote } : {}),
                ...(parsed.data.relatedCustomer ? { relatedCustomer: parsed.data.relatedCustomer } : {}),
            };

            const notification = await createNotification(payload);
            res.status(201).json({ ok: true, data: notification });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    markAsRead: (async (req, res, next) => {
        try {
            const parsed = NotificationParamSchema.safeParse(req.params);
            if (!parsed.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid notification id", parsed.error.flatten());
            }

            const notification = await markNotificationAsRead(parsed.data.id);
            if (!notification) {
                throw new AppError(404, "NOT_FOUND", "Notification not found");
            }

            res.json({ ok: true, data: notification });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,
};
