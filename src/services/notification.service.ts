import { db } from "../db/db.js";
import { AppError } from "../utils/errors.js";

export const notificationKinds = ["SYSTEM", "ORDER", "ANALYSIS", "CUSTOMER"] as const;

export type NotificationKind = (typeof notificationKinds)[number];

export type Notification = {
    id: string;
    sellerId: string;
    kind: NotificationKind;
    message: string;
    timestamp: string;
    read: boolean;
    relatedQuote: string | null;
    relatedCustomer: string | null;
};

type NotificationRow = {
    id: string;
    sellerid: string;
    kind: NotificationKind;
    message: string;
    timestamp: Date;
    read: boolean;
    relatedquote: string | null;
    relatedcustomer: string | null;
};

function mapRow(row: NotificationRow): Notification {
    return {
        id: row.id,
        sellerId: row.sellerid,
        kind: row.kind,
        message: row.message,
        timestamp: row.timestamp.toISOString(),
        read: row.read,
        relatedQuote: row.relatedquote,
        relatedCustomer: row.relatedcustomer,
    };
}

export async function listNotifications(input: {
    sellerId?: string;
    relatedQuote?: string;
    relatedCustomer?: string;
    sortBy?: "timestamp" | "sellerId";
    sortOrder?: "asc" | "desc";
}) {
    const values: string[] = [];
    const where: string[] = [];

    if (input.sellerId) {
        values.push(input.sellerId);
        where.push(`"sellerId" = $${values.length}`);
    }

    if (input.relatedQuote) {
        values.push(input.relatedQuote);
        where.push(`"relatedQuote" = $${values.length}`);
    }

    if (input.relatedCustomer) {
        values.push(input.relatedCustomer);
        where.push(`"relatedCustomer" = $${values.length}`);
    }

    const orderColumn = input.sortBy === "sellerId" ? '"sellerId"' : '"timestamp"';
    const orderDirection = input.sortOrder === "asc" ? "ASC" : "DESC";

    const sql = `
        SELECT
            id,
            "sellerId" as sellerid,
            kind,
            message,
            "timestamp" as timestamp,
            read,
            "relatedQuote" as relatedquote,
            "relatedCustomer" as relatedcustomer
        FROM notifications
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY ${orderColumn} ${orderDirection}
    `;

    const result = await db.query<NotificationRow>(sql, values);
    return result.rows.map(mapRow);
}

export async function createNotification(input: {
    sellerId: string;
    kind: NotificationKind;
    message: string;
    relatedQuote?: string;
    relatedCustomer?: string;
}) {
    const result = await db.query<NotificationRow>(
        `
        INSERT INTO notifications (
            "sellerId",
            kind,
            message,
            read,
            "relatedQuote",
            "relatedCustomer"
        ) VALUES ($1, $2, $3, false, $4, $5)
        RETURNING
            id,
            "sellerId" as sellerid,
            kind,
            message,
            "timestamp" as timestamp,
            read,
            "relatedQuote" as relatedquote,
            "relatedCustomer" as relatedcustomer
        `,
        [
            input.sellerId,
            input.kind,
            input.message,
            input.relatedQuote ?? null,
            input.relatedCustomer ?? null,
        ],
    );

    const row = result.rows[0];
    if (!row) {
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "Failed to create notification");
    }

    return mapRow(row);
}

export async function markNotificationAsRead(id: string) {
    const result = await db.query<NotificationRow>(
        `
        UPDATE notifications
        SET read = true
        WHERE id = $1
        RETURNING
            id,
            "sellerId" as sellerid,
            kind,
            message,
            "timestamp" as timestamp,
            read,
            "relatedQuote" as relatedquote,
            "relatedCustomer" as relatedcustomer
        `,
        [id],
    );

    return result.rows[0] ?? null;
}
