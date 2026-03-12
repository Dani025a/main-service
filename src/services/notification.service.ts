import { db } from "../db/db.js";
import { AppError } from "../utils/errors.js";

export const notificationKinds = ["SYSTEM", "ORDER", "ANALYSIS", "CUSTOMER"] as const;

export type NotificationKind = (typeof notificationKinds)[number];
export type NotificationType = NotificationKind | "QUOTE";
export type NotificationMetadata = Record<string, unknown>;

type PgError = {
    code?: string;
    constraint?: string;
    detail?: string;
};

type NotificationRow = {
    id: string;
    user_id: string | null;
    type: string | null;
    title: string | null;
    body: string | null;
    action_url: string | null;
    metadata: NotificationMetadata | null;
    created_at: Date | null;
    seller_id: string | null;
    kind: NotificationKind | null;
    message: string | null;
    timestamp: Date | null;
    read: boolean;
    related_quote: string | null;
    related_customer: string | null;
};

export type Notification = {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    actionUrl: string | null;
    metadata: NotificationMetadata;
    createdAt: string;
    read: boolean;
    sellerId: string;
    kind: NotificationKind;
    message: string;
    timestamp: string;
    relatedQuote: string | null;
    relatedCustomer: string | null;
};

export type CreateNotificationInput = {
    userId: string;
    type: string;
    title: string;
    body: string;
    actionUrl?: string | null;
    metadata?: NotificationMetadata | null;
    createdAt?: string;
    read?: boolean;
    relatedQuote?: string | null;
    relatedCustomer?: string | null;
    sellerId?: string;
    kind?: NotificationKind;
    message?: string;
};

type CreateNotificationIfMissingInput = CreateNotificationInput & {
    id: string;
};

let isInitialized = false;

function throwNotificationWriteError(error: unknown): never {
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

function isMetadataRecord(value: unknown): value is NotificationMetadata {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function metadataString(metadata: NotificationMetadata, key: string): string | null {
    const value = metadata[key];
    return typeof value === "string" && value.length > 0 ? value : null;
}

function legacyKindFromType(type: string): NotificationKind {
    if (type === "ORDER" || type === "ANALYSIS" || type === "CUSTOMER") {
        return type;
    }

    return "SYSTEM";
}

function defaultTitle(type: string, kind: NotificationKind | null): string {
    if (type === "QUOTE") {
        return "Quote notification";
    }

    switch (kind ?? legacyKindFromType(type)) {
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

async function ensureNotificationSchema() {
    if (isInitialized) {
        return;
    }

    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id text`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url text`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at timestamptz`);
    await db.query(`ALTER TABLE notifications ALTER COLUMN metadata SET DEFAULT '{}'::jsonb`);
    await db.query(`UPDATE notifications SET metadata = '{}'::jsonb WHERE metadata IS NULL`);
    await db.query(`
        UPDATE notifications
        SET
            user_id = COALESCE(user_id, seller_id),
            type = COALESCE(type, kind::text),
            title = COALESCE(
                title,
                CASE kind
                    WHEN 'ORDER' THEN 'Order notification'
                    WHEN 'ANALYSIS' THEN 'Analysis notification'
                    WHEN 'CUSTOMER' THEN 'Customer notification'
                    ELSE 'System notification'
                END
            ),
            body = COALESCE(body, message),
            action_url = COALESCE(
                action_url,
                CASE
                    WHEN related_quote IS NOT NULL THEN '/quotes/' || related_quote
                    ELSE NULL
                END
            ),
            created_at = COALESCE(created_at, timestamp)
        WHERE
            user_id IS NULL
            OR type IS NULL
            OR title IS NULL
            OR body IS NULL
            OR created_at IS NULL
    `);
    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
        ON notifications (user_id, created_at DESC)
    `);

    isInitialized = true;
}

function mapRow(row: NotificationRow): Notification {
    const metadata = isMetadataRecord(row.metadata) ? { ...row.metadata } : {};
    const sellerId = row.seller_id ?? row.user_id ?? "";
    const userId = row.user_id ?? sellerId;
    const type = row.type ?? row.kind ?? "SYSTEM";
    const kind = row.kind ?? legacyKindFromType(type);
    const relatedQuote = row.related_quote ?? metadataString(metadata, "quoteId") ?? metadataString(metadata, "relatedQuote");
    const relatedCustomer = row.related_customer ?? metadataString(metadata, "relatedCustomer");
    const body = row.body ?? row.message ?? "";
    const title = row.title ?? defaultTitle(type, row.kind);
    const actionUrl = row.action_url ?? (relatedQuote ? `/quotes/${relatedQuote}` : null);
    const createdAtDate = row.created_at ?? row.timestamp ?? new Date();
    const timestampDate = row.timestamp ?? row.created_at ?? createdAtDate;

    if (relatedQuote && metadata.quoteId === undefined) {
        metadata.quoteId = relatedQuote;
    }

    if (relatedCustomer && metadata.relatedCustomer === undefined) {
        metadata.relatedCustomer = relatedCustomer;
    }

    return {
        id: row.id,
        userId,
        type,
        title,
        body,
        actionUrl,
        metadata,
        createdAt: createdAtDate.toISOString(),
        read: row.read,
        sellerId,
        kind,
        message: row.message ?? body,
        timestamp: timestampDate.toISOString(),
        relatedQuote,
        relatedCustomer,
    };
}

function normalizeCreateInput(input: CreateNotificationInput) {
    const metadata = isMetadataRecord(input.metadata) ? { ...input.metadata } : {};
    const relatedQuote =
        input.relatedQuote ?? metadataString(metadata, "quoteId") ?? metadataString(metadata, "relatedQuote");
    const relatedCustomer = input.relatedCustomer ?? metadataString(metadata, "relatedCustomer");

    if (relatedQuote && metadata.quoteId === undefined) {
        metadata.quoteId = relatedQuote;
    }

    if (relatedCustomer && metadata.relatedCustomer === undefined) {
        metadata.relatedCustomer = relatedCustomer;
    }

    return {
        userId: input.userId,
        sellerId: input.sellerId ?? input.userId,
        type: input.type,
        kind: input.kind ?? legacyKindFromType(input.type),
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl ?? (relatedQuote ? `/quotes/${relatedQuote}` : null),
        metadata,
        createdAt: input.createdAt ?? new Date().toISOString(),
        read: input.read ?? false,
        relatedQuote: relatedQuote ?? null,
        relatedCustomer: relatedCustomer ?? null,
        message: input.message ?? input.body,
    };
}

async function insertNotification(sql: string, values: unknown[]) {
    let result;
    try {
        result = await db.query<NotificationRow>(sql, values);
    } catch (error) {
        throwNotificationWriteError(error);
    }

    return result;
}

export async function listNotifications(input: {
    userId?: string;
    relatedQuote?: string;
    relatedCustomer?: string;
    sortBy?: "timestamp" | "sellerId" | "createdAt" | "userId";
    sortOrder?: "asc" | "desc";
}) {
    await ensureNotificationSchema();

    const values: unknown[] = [];
    const where: string[] = [];

    if (input.userId) {
        values.push(input.userId);
        where.push(`COALESCE(user_id, seller_id) = $${values.length}`);
    }

    if (input.relatedQuote) {
        values.push(input.relatedQuote);
        where.push(`COALESCE(related_quote, metadata->>'quoteId', metadata->>'relatedQuote') = $${values.length}`);
    }

    if (input.relatedCustomer) {
        values.push(input.relatedCustomer);
        where.push(`COALESCE(related_customer, metadata->>'relatedCustomer') = $${values.length}`);
    }

    const orderColumn =
        input.sortBy === "sellerId" || input.sortBy === "userId"
            ? "COALESCE(user_id, seller_id)"
            : "COALESCE(created_at, timestamp)";
    const orderDirection = input.sortOrder === "asc" ? "ASC" : "DESC";

    const result = await db.query<NotificationRow>(
        `
        SELECT
            id,
            user_id,
            type,
            title,
            body,
            action_url,
            metadata,
            created_at,
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
        `,
        values,
    );

    return result.rows.map(mapRow);
}

export async function createNotification(input: CreateNotificationInput) {
    await ensureNotificationSchema();

    const normalized = normalizeCreateInput(input);
    const result = await insertNotification(
        `
        INSERT INTO notifications (
            user_id,
            type,
            title,
            body,
            action_url,
            metadata,
            created_at,
            seller_id,
            kind,
            message,
            timestamp,
            read,
            related_quote,
            related_customer
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING
            id,
            user_id,
            type,
            title,
            body,
            action_url,
            metadata,
            created_at,
            seller_id,
            kind,
            message,
            timestamp,
            read,
            related_quote,
            related_customer
        `,
        [
            normalized.userId,
            normalized.type,
            normalized.title,
            normalized.body,
            normalized.actionUrl,
            normalized.metadata,
            normalized.createdAt,
            normalized.sellerId,
            normalized.kind,
            normalized.message,
            normalized.createdAt,
            normalized.read,
            normalized.relatedQuote,
            normalized.relatedCustomer,
        ],
    );

    const row = result.rows[0];
    if (!row) {
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "Failed to create notification");
    }

    return mapRow(row);
}

export async function createNotificationIfMissing(input: CreateNotificationIfMissingInput) {
    await ensureNotificationSchema();

    const normalized = normalizeCreateInput(input);
    const result = await insertNotification(
        `
        INSERT INTO notifications (
            id,
            user_id,
            type,
            title,
            body,
            action_url,
            metadata,
            created_at,
            seller_id,
            kind,
            message,
            timestamp,
            read,
            related_quote,
            related_customer
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING
        RETURNING
            id,
            user_id,
            type,
            title,
            body,
            action_url,
            metadata,
            created_at,
            seller_id,
            kind,
            message,
            timestamp,
            read,
            related_quote,
            related_customer
        `,
        [
            input.id,
            normalized.userId,
            normalized.type,
            normalized.title,
            normalized.body,
            normalized.actionUrl,
            normalized.metadata,
            normalized.createdAt,
            normalized.sellerId,
            normalized.kind,
            normalized.message,
            normalized.createdAt,
            normalized.read,
            normalized.relatedQuote,
            normalized.relatedCustomer,
        ],
    );

    const row = result.rows[0];
    if (!row) {
        return { created: false as const, notification: null };
    }

    return { created: true as const, notification: mapRow(row) };
}

export async function markNotificationAsRead(id: string) {
    await ensureNotificationSchema();

    const result = await db.query<NotificationRow>(
        `
        UPDATE notifications
        SET read = true
        WHERE id = $1
        RETURNING
            id,
            user_id,
            type,
            title,
            body,
            action_url,
            metadata,
            created_at,
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
