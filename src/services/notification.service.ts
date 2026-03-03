import { NotificationKind, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";

type CreateNotificationInput = {
    sellerId: string;
    kind: NotificationKind;
    message: string;
    relatedOrder?: unknown;
    relatedCustomer?: unknown;
};

type ListNotificationsInput = {
    sellerId: string;
    read?: boolean;
};

export async function listNotificationsForSeller(input: ListNotificationsInput) {
    return prisma.notification.findMany({
        where: {
            sellerId: input.sellerId,
            ...(typeof input.read === "boolean" ? { read: input.read } : {}),
        },
        orderBy: {
            timestamp: "desc",
        },
    });
}

export async function createNotification(input: CreateNotificationInput) {
    return prisma.notification.create({
        data: {
            sellerId: input.sellerId,
            kind: input.kind,
            message: input.message,
            ...(input.relatedOrder !== undefined
                ? { relatedOrder: input.relatedOrder as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput }
                : {}),
            ...(input.relatedCustomer !== undefined
                ? { relatedCustomer: input.relatedCustomer as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput }
                : {}),
        },
    });
}

export async function markNotificationAsRead(notificationId: string, sellerId: string) {
    const notification = await prisma.notification.findFirst({
        where: {
            id: notificationId,
            sellerId,
        },
    });

    if (!notification) {
        throw new AppError(404, "NOT_FOUND", "Notification was not found");
    }

    if (notification.read) {
        return notification;
    }

    return prisma.notification.update({
        where: { id: notification.id },
        data: { read: true },
    });
}
