import { db } from "../db/db.js";

export const notificationProcessingResults = [
    "NOTIFICATION_SENT",
    "DUPLICATE_IGNORED",
    "RETRY_PENDING",
    "INVALID_PAYLOAD",
    "SELLER_NOT_FOUND",
] as const;

export type NotificationProcessingResult = (typeof notificationProcessingResults)[number];

export type PersistNotificationProcessingInput = {
    notificationId: string;
    quoteId: string | null;
    offerNumber: string | null;
    sellerId: string | null;
    reason: string | null;
    action: string | null;
    actorType: string | null;
    actorUserId: string | null;
    actorEmail: string | null;
    occurredAt: string | null;
    processingResult: NotificationProcessingResult;
    errorCode?: string | null;
    errorMessage?: string | null;
};

let isInitialized = false;

export async function ensureNotificationProcessingTable() {
    if (isInitialized) {
        return;
    }

    await db.query(`
        CREATE TABLE IF NOT EXISTS notification_processing_events (
            id bigserial PRIMARY KEY,
            notification_id text NOT NULL,
            quote_id text,
            offer_number text,
            seller_id text,
            reason text,
            action text,
            actor_type text,
            actor_user_id text,
            actor_email text,
            occurred_at timestamptz,
            processing_result text NOT NULL,
            error_code text,
            error_message text,
            created_at timestamptz NOT NULL DEFAULT now()
        )
    `);

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_processing_events_notification_id
        ON notification_processing_events (notification_id)
    `);

    isInitialized = true;
}

export async function persistNotificationProcessingOutcome(input: PersistNotificationProcessingInput) {
    await db.query(
        `
        INSERT INTO notification_processing_events (
            notification_id,
            quote_id,
            offer_number,
            seller_id,
            reason,
            action,
            actor_type,
            actor_user_id,
            actor_email,
            occurred_at,
            processing_result,
            error_code,
            error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
            input.notificationId,
            input.quoteId,
            input.offerNumber,
            input.sellerId,
            input.reason,
            input.action,
            input.actorType,
            input.actorUserId,
            input.actorEmail,
            input.occurredAt,
            input.processingResult,
            input.errorCode ?? null,
            input.errorMessage ?? null,
        ],
    );
}
