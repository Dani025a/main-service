import type {
    NotificationKind as PrismaNotificationKind,
    Prisma,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";

export const NotificationKinds = ["SYSTEM", "ORDER", "ANALYSIS", "CUSTOMER"] as const;
export type NotificationKind = PrismaNotificationKind;

export type NotificationRelatedOrder = { orderId?: string | null };
export type NotificationRelatedCustomer = { id?: string | null };

export type NotificationRecord = {
    id: string;
    kind: NotificationKind;
    message: string;
    timestamp: Date;
    read: boolean;
    relatedOrder?: NotificationRelatedOrder | null;
    relatedCustomer?: NotificationRelatedCustomer | null;
};

export type CreateNotificationInput = {
    kind: NotificationKind;
    message: string;
    timestamp?: Date;
    read?: boolean;
    relatedOrder?: NotificationRelatedOrder | null;
    relatedCustomer?: NotificationRelatedCustomer | null;
};

export type NotificationFilter = {
    kind?: NotificationKind;
    read?: boolean;
};

function mapNotification(record: {
    id: string;
    kind: NotificationKind;
    message: string;
    timestamp: Date;
    read: boolean;
    relatedOrder: Prisma.JsonValue | null;
    relatedCustomer: Prisma.JsonValue | null;
}): NotificationRecord {
    const notification: NotificationRecord = {
        id: record.id,
        kind: record.kind,
        message: record.message,
        timestamp: record.timestamp,
        read: record.read,
    };

    if (record.relatedOrder !== null) {
        notification.relatedOrder = record.relatedOrder as NotificationRelatedOrder | null;
    }

    if (record.relatedCustomer !== null) {
        notification.relatedCustomer = record.relatedCustomer as NotificationRelatedCustomer | null;
    }

    return notification;
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
    const created = await prisma.notification.create({
        data: {
            kind: input.kind,
            message: input.message,
            ...(input.timestamp ? { timestamp: input.timestamp } : {}),
            ...(input.read !== undefined ? { read: input.read } : {}),
            ...(input.relatedOrder !== undefined ? { relatedOrder: input.relatedOrder } : {}),
            ...(input.relatedCustomer !== undefined ? { relatedCustomer: input.relatedCustomer } : {}),
        },
    });

    return mapNotification(created);
}

export async function listNotifications(filter: NotificationFilter): Promise<NotificationRecord[]> {
    const notifications = await prisma.notification.findMany({
        where: {
            ...(filter.kind ? { kind: filter.kind } : {}),
            ...(filter.read !== undefined ? { read: filter.read } : {}),
        },
        orderBy: { timestamp: "desc" },
    });

    return notifications.map(mapNotification);
}

export async function markNotificationRead(notificationId: string, read: boolean): Promise<NotificationRecord> {
    try {
        const updated = await prisma.notification.update({
            where: { id: notificationId },
            data: { read },
        });

        return mapNotification(updated);
    } catch {
        throw new AppError(404, "NOT_FOUND", "Notification not found");
    }
}
