import { NotificationKind } from "@prisma/client";
import { z } from "zod";

export const notificationQueryDto = z
    .object({
        read: z
            .enum(["true", "false"])
            .optional()
            .transform((value) => (value === undefined ? undefined : value === "true")),
    })
    .strict();

export const createNotificationDto = z
    .object({
        sellerId: z.string().min(1).optional(),
        kind: z.nativeEnum(NotificationKind),
        message: z.string().min(1),
        relatedOrder: z.unknown().optional(),
        relatedCustomer: z.unknown().optional(),
    })
    .strict();

export const notificationIdParamsDto = z
    .object({
        id: z.string().uuid(),
    })
    .strict();
