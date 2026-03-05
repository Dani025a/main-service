import { db } from "../db/db.js";
import { AppError } from "../utils/errors.js";

export const notificationKinds = ["SYSTEM", "ORDER", "ANALYSIS", "CUSTOMER"] as const;

export type NotificationKind = (typeof notificationKinds)[number];

type PgError = {
    code?: string;
    constraint?: string;
    detail?: string;
};

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
    seller_id: string;
    kind: NotificationKind;
    message: string;
    timestamp: Date;
    read: boolean;
    related_quote: string | null;
    related_customer: string | null;
};

function mapRow(row: NotificationRow): Notification {
    return {
        id: row.id,
        sellerId: row.seller_id,
        kind: row.kind,
        message: row.message,
        timestamp: row.timestamp.toISOString(),
        read: row.read,
        relatedQuote: row.related_quote,
        relatedCustomer: row.related_customer,
    };
}

export async function listNotifications(input: {
    sellerId?: string;
    relatedQuote?: string;
    relatedCustomer?: string;
    sortBy?: "timestamp" | "sellerId";
    sortOrder?: "asc" | "desc";
}) {
    const values: unknown[] = [];
    const where: string[] = [];

    if (input.sellerId) {
        values.push(input.sellerId);
        where.push(`seller_id = $${values.length}`);
    }

    if (input.relatedQuote) {
        values.push(input.relatedQuote);
        where.push(`related_quote = $${values.length}`);
    }

    if (input.relatedCustomer) {
        values.push(input.relatedCustomer);
        where.push(`related_customer = $${values.length}`);
    }

    const orderColumn = input.sortBy === "sellerId" ? "seller_id" : "timestamp";
    const orderDirection = input.sortOrder === "asc" ? "ASC" : "DESC";

    const sql = `
        SELECT
            id,
            seller_id,
            kind,
            message,
            timestamp,
            read,
            related_quote,
            related_customer
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
    let result;
    try {
        result = await db.query<NotificationRow>(
            `
            INSERT INTO notifications (
                seller_id,
                kind,
                message,
                read,
                related_quote,
                related_customer
            ) VALUES ($1, $2, $3, false, $4, $5)
            RETURNING
                id,
                seller_id,
                kind,
                message,
                timestamp,
                read,
                related_quote,
                related_customer
            `,
            [
                input.sellerId,
                input.kind,
                input.message,
                input.relatedQuote ?? null,
                input.relatedCustomer ?? null,
            ],
        );
    } catch (error) {
        const pgError = error as PgError;
        if (pgError.code === "23503") {
            if (pgError.constraint === "fk_notifications_related_quote") {
                throw new AppError(400, "VALIDATION_ERROR", "relatedQuote does not exist");
            }

            if (pgError.constraint === "fk_notifications_related_customer") {
                throw new AppError(400, "VALIDATION_ERROR", "relatedCustomer does not exist");
            }

            if (pgError.constraint === "fk_notifications_seller") {
                throw new AppError(400, "VALIDATION_ERROR", "sellerId does not exist");
            }

            throw new AppError(
                400,
                "VALIDATION_ERROR",
                "Notification references unknown related entities",
                { detail: pgError.detail }
            );
        }

        throw error;
    }

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
            seller_id,
            kind,
            message,
            timestamp,
            read,
            related_quote,
            related_customer
        `,
        [id],
    );

    const row = result.rows[0];
    return row ? mapRow(row) : null;
}
