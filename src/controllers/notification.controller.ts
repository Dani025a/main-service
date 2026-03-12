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
    userId: z.string().min(1).optional(),
    relatedQuote: z.string().min(1).optional(),
    relatedCustomer: z.string().min(1).optional(),
    sortBy: z.enum(["timestamp", "sellerId", "createdAt", "userId"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
});

const LegacyCreateNotificationSchema = z.object({
    sellerId: z.string().min(1),
    kind: z.enum(notificationKinds),
    message: z.string().min(1),
    relatedQuote: z.string().min(1).nullish(),
    relatedCustomer: z.string().min(1).nullish(),
});

const RichCreateNotificationSchema = z.object({
    userId: z.string().min(1),
    type: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    actionUrl: z.string().min(1).nullish(),
    metadata: z.record(z.unknown()).nullish(),
    createdAt: z.string().datetime({ offset: true }).optional(),
    read: z.boolean().optional(),
    relatedQuote: z.string().min(1).nullish(),
    relatedCustomer: z.string().min(1).nullish(),
});

const CreateNotificationSchema = z.union([RichCreateNotificationSchema, LegacyCreateNotificationSchema]);

const NotificationParamSchema = z.object({
    id: z.string().min(1),
});

function legacyTitle(kind: (typeof notificationKinds)[number]) {
    switch (kind) {
        case "ORDER":
            return "Order notification";
        case "ANALYSIS":
            return "Analysis notification";
        case "CUSTOMER":
            return "Customer notification";
        default:
            return "System notification";
    }
}

export const notificationController = {
    listMine: (async (req, res, next) => {
        try {
            const parsed = NotificationQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid notification query", parsed.error.flatten());
            }

            const filters = {
                ...(parsed.data.userId ? { userId: parsed.data.userId } : {}),
                ...(!parsed.data.userId && parsed.data.sellerId ? { userId: parsed.data.sellerId } : {}),
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

            const notification = "userId" in parsed.data
                ? await createNotification({
                    userId: parsed.data.userId,
                    type: parsed.data.type,
                    title: parsed.data.title,
                    body: parsed.data.body,
                    actionUrl: parsed.data.actionUrl ?? null,
                    metadata: parsed.data.metadata ?? {},
                    createdAt: parsed.data.createdAt,
                    read: parsed.data.read,
                    relatedQuote: parsed.data.relatedQuote ?? null,
                    relatedCustomer: parsed.data.relatedCustomer ?? null,
                    sellerId: parsed.data.userId,
                })
                : await createNotification({
                    userId: parsed.data.sellerId,
                    sellerId: parsed.data.sellerId,
                    type: parsed.data.kind,
                    kind: parsed.data.kind,
                    title: legacyTitle(parsed.data.kind),
                    body: parsed.data.message,
                    message: parsed.data.message,
                    actionUrl: parsed.data.relatedQuote ? `/quotes/${parsed.data.relatedQuote}` : null,
                    metadata: {
                        ...(parsed.data.relatedQuote ? { quoteId: parsed.data.relatedQuote, relatedQuote: parsed.data.relatedQuote } : {}),
                        ...(parsed.data.relatedCustomer ? { relatedCustomer: parsed.data.relatedCustomer } : {}),
                    },
                    relatedQuote: parsed.data.relatedQuote ?? null,
                    relatedCustomer: parsed.data.relatedCustomer ?? null,
                });
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
