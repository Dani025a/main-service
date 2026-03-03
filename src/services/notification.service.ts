import { randomUUID } from "node:crypto";
import { AppError } from "../utils/errors.js";

export const NotificationKinds = ["SYSTEM", "ORDER", "ANALYSIS", "CUSTOMER"] as const;
export type NotificationKind = (typeof NotificationKinds)[number];

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

const notifications = new Map<string, NotificationRecord>();

function applyFilter(item: NotificationRecord, filter: NotificationFilter): boolean {
    if (filter.kind && item.kind !== filter.kind) return false;
    if (filter.read !== undefined && item.read !== filter.read) return false;
    return true;
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
    const now = new Date();
    const notification: NotificationRecord = {
        id: randomUUID(),
        kind: input.kind,
        message: input.message,
        timestamp: input.timestamp ?? now,
        read: input.read ?? false,
    };

    if (input.relatedOrder !== undefined) notification.relatedOrder = input.relatedOrder;
    if (input.relatedCustomer !== undefined) notification.relatedCustomer = input.relatedCustomer;

    notifications.set(notification.id, notification);
    return notification;
}

export async function listNotifications(filter: NotificationFilter): Promise<NotificationRecord[]> {
    return [...notifications.values()]
        .filter((item) => applyFilter(item, filter))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function markNotificationRead(notificationId: string, read: boolean): Promise<NotificationRecord> {
    const existing = notifications.get(notificationId);
    if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Notification not found");
    }

    const next: NotificationRecord = {
        ...existing,
        read,
    };

    notifications.set(notificationId, next);
    return next;
}
