import { z } from "zod";
import { NotificationKinds } from "../../services/notification.service.js";

const notificationKindEnum = z.enum(NotificationKinds);

export const createNotificationBodySchema = z
    .object({
        kind: notificationKindEnum,
        message: z.string().min(1),
        timestamp: z.coerce.date().optional(),
        read: z.boolean().optional(),
        relatedOrder: z
            .object({
                orderId: z.string().uuid().nullable().optional(),
            })
            .nullable()
            .optional(),
        relatedCustomer: z
            .object({
                id: z.string().uuid().nullable().optional(),
            })
            .nullable()
            .optional(),
    })
    .strict();

export const listNotificationQuerySchema = z
    .object({
        kind: notificationKindEnum.optional(),
        read: z.enum(["true", "false"]).optional(),
    })
    .strict();

export const updateNotificationParamsSchema = z
    .object({
        id: z.string().uuid(),
    })
    .strict();

export const markNotificationReadBodySchema = z
    .object({
        read: z.boolean(),
    })
    .strict();
