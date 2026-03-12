import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ProcessErrorArgs, ServiceBusReceivedMessage } from "@azure/service-bus";
import { ServiceBusClient } from "@azure/service-bus";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/errors.js";
import { createNotificationIfMissing } from "../services/notification.service.js";
import {
    ensureNotificationProcessingTable,
    persistNotificationProcessingOutcome,
} from "../services/notification-processing.service.js";

const QuoteNotificationPayloadSchema = z.object({
    eventType: z.literal("QUOTE_NOTIFICATION"),
    occurredAt: z.string().datetime({ offset: true }),
    notificationId: z.string().uuid(),
    quoteId: z.string().min(1),
    offerNumber: z.string().min(1),
    sellerId: z.string().min(1),
    reason: z.enum(["ACTION_BY_NON_SELLER", "SELLER_CHANGED"]),
    action: z.string().min(1),
    actorType: z.string().min(1).optional(),
    actorUserId: z.string().min(1).optional(),
    actorEmail: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).optional(),
});

type QuoteNotificationPayload = z.infer<typeof QuoteNotificationPayloadSchema>;

type QuoteNotificationRecord = {
    type: "QUOTE";
    title: string;
    body: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
};

export type QuoteNotificationReceiverHandle = {
    close: () => Promise<void>;
};

function readJsonBody(body: unknown): unknown {
    if (body && typeof body === "object" && !Array.isArray(body)) {
        return body;
    }

    if (typeof body === "string") {
        return JSON.parse(body);
    }

    if (body instanceof Uint8Array) {
        return JSON.parse(Buffer.from(body).toString("utf8"));
    }

    throw new Error("Message body must be a JSON object");
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    return null;
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function describeAction(action: string) {
    return action.toLowerCase().replaceAll("_", " ");
}

<<<<<<< HEAD
function buildUserMessage(payload: QuoteNotificationPayload): string {
    const action = describeAction(payload.action);
    const actor = payload.actorEmail ?? payload.actorUserId ?? payload.actorType ?? "another user";

    if (payload.reason === "SELLER_CHANGED") {
        return `Seller assignment changed for quote ${payload.offerNumber}. Last action: ${action}.`;
    }

    return `Quote ${payload.offerNumber} was ${action} by ${actor}.`;
=======
function actorLabel(payload: QuoteNotificationPayload): string {
    return payload.actorEmail ?? payload.actorUserId ?? payload.actorType ?? "another user";
}

function metadataString(metadata: Record<string, unknown>, key: string): string {
    const value = metadata[key];
    return typeof value === "string" ? value : "";
}

function buildNotificationRecord(payload: QuoteNotificationPayload): QuoteNotificationRecord {
    const actor = actorLabel(payload);
    const baseMetadata: Record<string, unknown> = {
        quoteId: payload.quoteId,
        offerNumber: payload.offerNumber,
        reason: payload.reason,
        action: payload.action,
        actorType: payload.actorType ?? null,
        actorUserId: payload.actorUserId ?? null,
        actorEmail: payload.actorEmail ?? null,
        ...payload.metadata,
    };

    if (payload.reason === "SELLER_CHANGED") {
        const previousSellerId = metadataString(payload.metadata, "previousSellerId");
        const newSellerId = metadataString(payload.metadata, "newSellerId");
        const assignedToYou = payload.sellerId === newSellerId && newSellerId.length > 0;

        if (assignedToYou) {
            return {
                type: "QUOTE",
                title: "Quote assigned to you",
                body: `${payload.offerNumber} was assigned to you by ${actor}.`,
                actionUrl: `/quotes/${payload.quoteId}`,
                metadata: {
                    ...baseMetadata,
                    previousSellerId,
                    newSellerId,
                },
            };
        }

        if (previousSellerId === payload.sellerId) {
            return {
                type: "QUOTE",
                title: "Quote reassigned",
                body: `${payload.offerNumber} is no longer assigned to you.`,
                actionUrl: `/quotes/${payload.quoteId}`,
                metadata: {
                    ...baseMetadata,
                    previousSellerId,
                    newSellerId,
                },
            };
        }

        return {
            type: "QUOTE",
            title: "Quote seller changed",
            body: `Seller assignment changed for ${payload.offerNumber}.`,
            actionUrl: `/quotes/${payload.quoteId}`,
            metadata: {
                ...baseMetadata,
                previousSellerId,
                newSellerId,
            },
        };
    }

    if (payload.action === "QUOTE_CREATED") {
        return {
            type: "QUOTE",
            title: "Quote created by another user",
            body: `${payload.offerNumber} was created on your behalf.`,
            actionUrl: `/quotes/${payload.quoteId}`,
            metadata: baseMetadata,
        };
    }

    if (payload.action === "QUOTE_UPDATED") {
        return {
            type: "QUOTE",
            title: "Quote updated by another user",
            body: `${payload.offerNumber} was updated by ${actor}.`,
            actionUrl: `/quotes/${payload.quoteId}`,
            metadata: baseMetadata,
        };
    }

    if (payload.action === "QUOTE_SEND_REQUESTED") {
        return {
            type: "QUOTE",
            title: "Quote send requested",
            body: `${payload.offerNumber} was marked for sending by ${actor}.`,
            actionUrl: `/quotes/${payload.quoteId}`,
            metadata: baseMetadata,
        };
    }

    if (payload.action.startsWith("QUOTE_STATUS_CHANGED:")) {
        return {
            type: "QUOTE",
            title: "Quote status changed",
            body: `${payload.offerNumber} changed status because of an action by ${actor}.`,
            actionUrl: `/quotes/${payload.quoteId}`,
            metadata: baseMetadata,
        };
    }

    const action = describeAction(payload.action);
    return {
        type: "QUOTE",
        title: "Quote notification",
        body: `${payload.offerNumber} was ${action} by ${actor}.`,
        actionUrl: `/quotes/${payload.quoteId}`,
        metadata: baseMetadata,
    };
>>>>>>> da5cc86 (added readme and logic for automatic notification for tasks)
}

async function persistOutcomeSafe(input: {
    payload: {
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
    };
    processingResult: "NOTIFICATION_CREATED" | "DUPLICATE_IGNORED" | "RETRY_PENDING" | "INVALID_PAYLOAD" | "SELLER_NOT_FOUND";
    errorCode?: string | null;
    errorMessage?: string | null;
}) {
    try {
        await persistNotificationProcessingOutcome({
            notificationId: input.payload.notificationId,
            quoteId: input.payload.quoteId,
            offerNumber: input.payload.offerNumber,
            sellerId: input.payload.sellerId,
            reason: input.payload.reason,
            action: input.payload.action,
            actorType: input.payload.actorType,
            actorUserId: input.payload.actorUserId,
            actorEmail: input.payload.actorEmail,
            occurredAt: input.payload.occurredAt,
            processingResult: input.processingResult,
            errorCode: input.errorCode ?? null,
            errorMessage: input.errorMessage ?? null,
        });
    } catch (err) {
        logger.error({ err, notificationId: input.payload.notificationId }, "failed to persist notification processing outcome");
    }
}

function isInvalidEnvelope(message: ServiceBusReceivedMessage): string | null {
    if (message.subject !== "quote.notification") {
        return "Invalid subject. Expected quote.notification";
    }

    const contentType = message.contentType?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
        return "Invalid contentType. Expected application/json";
    }

    return null;
}

export async function startQuoteNotificationReceiver(): Promise<QuoteNotificationReceiverHandle | null> {
    if (!env.SERVICEBUS_CONNECTION_STRING) {
        logger.info("quote notification receiver disabled (missing SERVICEBUS_CONNECTION_STRING)");
        return null;
    }

    await ensureNotificationProcessingTable();

    const client = new ServiceBusClient(env.SERVICEBUS_CONNECTION_STRING);
    const receiver = client.createReceiver(env.SERVICEBUS_QUEUE_NOTIFICATION);

    const subscription = receiver.subscribe(
        {
            processMessage: async (message) => {
                const envelopeError = isInvalidEnvelope(message);
                const unknownPayload = asRecord(message.body);
                const fallbackNotificationId =
                    readString(unknownPayload?.notificationId) ?? readString(message.messageId) ?? randomUUID();
                const fallbackContext = {
                    notificationId: fallbackNotificationId,
                    quoteId: readString(unknownPayload?.quoteId),
                    offerNumber: readString(unknownPayload?.offerNumber),
                    sellerId: readString(unknownPayload?.sellerId),
                    reason: readString(unknownPayload?.reason),
                    action: readString(unknownPayload?.action),
                    actorType: readString(unknownPayload?.actorType),
                    actorUserId: readString(unknownPayload?.actorUserId),
                    actorEmail: readString(unknownPayload?.actorEmail),
                    occurredAt: readString(unknownPayload?.occurredAt),
                };

                if (envelopeError) {
                    await persistOutcomeSafe({
                        payload: fallbackContext,
                        processingResult: "INVALID_PAYLOAD",
                        errorCode: "INVALID_ENVELOPE",
                        errorMessage: envelopeError,
                    });

                    logger.warn(
                        {
                            ...fallbackContext,
                            processingResult: "INVALID_PAYLOAD",
                            errorCode: "INVALID_ENVELOPE",
                            errorMessage: envelopeError,
                        },
                        "quote notification invalid envelope"
                    );

                    await receiver.deadLetterMessage(message, {
                        deadLetterReason: "INVALID_PAYLOAD",
                        deadLetterErrorDescription: envelopeError,
                    });
                    return;
                }

                let parsedPayload: QuoteNotificationPayload;
                try {
                    const payload = readJsonBody(message.body);
                    const parsed = QuoteNotificationPayloadSchema.safeParse(payload);

                    if (!parsed.success) {
                        const validationError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
                        await persistOutcomeSafe({
                            payload: fallbackContext,
                            processingResult: "INVALID_PAYLOAD",
                            errorCode: "INVALID_PAYLOAD",
                            errorMessage: validationError,
                        });

                        logger.warn(
                            {
                                ...fallbackContext,
                                processingResult: "INVALID_PAYLOAD",
                                errorCode: "INVALID_PAYLOAD",
                                errorMessage: validationError,
                            },
                            "quote notification payload validation failed"
                        );

                        await receiver.deadLetterMessage(message, {
                            deadLetterReason: "INVALID_PAYLOAD",
                            deadLetterErrorDescription: validationError,
                        });
                        return;
                    }

                    parsedPayload = parsed.data;
                } catch (error) {
                    const messageText = error instanceof Error ? error.message : "Failed to parse JSON body";
                    await persistOutcomeSafe({
                        payload: fallbackContext,
                        processingResult: "INVALID_PAYLOAD",
                        errorCode: "INVALID_PAYLOAD",
                        errorMessage: messageText,
                    });

                    logger.warn(
                        {
                            ...fallbackContext,
                            processingResult: "INVALID_PAYLOAD",
                            errorCode: "INVALID_PAYLOAD",
                            errorMessage: messageText,
                        },
                        "quote notification JSON parsing failed"
                    );

                    await receiver.deadLetterMessage(message, {
                        deadLetterReason: "INVALID_PAYLOAD",
                        deadLetterErrorDescription: messageText,
                    });
                    return;
                }

                const context = {
                    notificationId: parsedPayload.notificationId,
                    quoteId: parsedPayload.quoteId,
                    offerNumber: parsedPayload.offerNumber,
                    sellerId: parsedPayload.sellerId,
                    reason: parsedPayload.reason,
                    action: parsedPayload.action,
                    actorType: parsedPayload.actorType ?? null,
                    actorUserId: parsedPayload.actorUserId ?? null,
                    actorEmail: parsedPayload.actorEmail ?? null,
                    occurredAt: parsedPayload.occurredAt,
                };

                try {
                    const notification = buildNotificationRecord(parsedPayload);
                    let createdResult;
                    let relatedQuoteLinked = true;

                    try {
                        createdResult = await createNotificationIfMissing({
                            id: parsedPayload.notificationId,
                            userId: parsedPayload.sellerId,
                            sellerId: parsedPayload.sellerId,
                            type: notification.type,
                            kind: "SYSTEM",
                            title: notification.title,
                            body: notification.body,
                            actionUrl: notification.actionUrl,
                            metadata: notification.metadata,
                            createdAt: parsedPayload.occurredAt,
                            message: notification.body,
                            relatedQuote: parsedPayload.quoteId,
                            relatedCustomer: null,
                        });
                    } catch (error) {
                        if (!(error instanceof AppError) || error.code !== "VALIDATION_ERROR" || error.message !== "relatedQuote does not exist") {
                            throw error;
                        }

                        relatedQuoteLinked = false;
                        createdResult = await createNotificationIfMissing({
                            id: parsedPayload.notificationId,
                            userId: parsedPayload.sellerId,
                            sellerId: parsedPayload.sellerId,
                            type: notification.type,
                            kind: "SYSTEM",
                            title: notification.title,
                            body: notification.body,
                            actionUrl: notification.actionUrl,
                            metadata: notification.metadata,
                            createdAt: parsedPayload.occurredAt,
                            message: notification.body,
                            relatedQuote: null,
                            relatedCustomer: null,
                        });

                        logger.warn(
                            {
                                ...context,
                                processingResult: "NOTIFICATION_CREATED",
                                relatedQuoteLinked,
                            },
                            "quote notification created without related quote link"
                        );
                    }

                    if (!createdResult.created) {
                        await persistOutcomeSafe({
                            payload: context,
                            processingResult: "DUPLICATE_IGNORED",
                        });

                        logger.info(
                            {
                                ...context,
                                processingResult: "DUPLICATE_IGNORED",
                            },
                            "quote notification duplicate ignored"
                        );

                        await receiver.completeMessage(message);
                        return;
                    }

                    await persistOutcomeSafe({
                        payload: context,
                        processingResult: "NOTIFICATION_CREATED",
                    });

                    logger.info(
                        {
                            ...context,
                            processingResult: "NOTIFICATION_CREATED",
                            relatedQuoteLinked,
                        },
                        "quote notification created"
                    );

                    await receiver.completeMessage(message);
                } catch (error) {
                    if (error instanceof AppError && error.code === "VALIDATION_ERROR") {
                        const isSellerMissing = error.message === "sellerId does not exist";
                        const processingResult = isSellerMissing ? "SELLER_NOT_FOUND" : "INVALID_PAYLOAD";

                        await persistOutcomeSafe({
                            payload: context,
                            processingResult,
                            errorCode: error.code,
                            errorMessage: error.message,
                        });

                        logger.warn(
                            {
                                ...context,
                                processingResult,
                                errorCode: error.code,
                                errorMessage: error.message,
                            },
                            "quote notification dead-lettered due to validation error"
                        );

                        await receiver.deadLetterMessage(message, {
                            deadLetterReason: processingResult,
                            deadLetterErrorDescription: error.message,
                        });
                        return;
                    }

                    const errorMessage = error instanceof Error ? error.message : "Unexpected processing failure";
                    await persistOutcomeSafe({
                        payload: context,
                        processingResult: "RETRY_PENDING",
                        errorCode: "RETRY_PENDING",
                        errorMessage,
                    });

                    logger.error(
                        {
                            err: error,
                            ...context,
                            processingResult: "RETRY_PENDING",
                            errorCode: "RETRY_PENDING",
                            errorMessage,
                        },
                        "quote notification processing failed, abandoning for retry"
                    );

                    await receiver.abandonMessage(message);
                }
            },
            processError: async (args: ProcessErrorArgs) => {
                logger.error(
                    {
                        err: args.error,
                        entityPath: args.entityPath,
                        fullyQualifiedNamespace: args.fullyQualifiedNamespace,
                        errorSource: args.errorSource,
                    },
                    "quote notification receiver error"
                );
            },
        },
        {
            autoCompleteMessages: false,
            maxConcurrentCalls: 5,
        }
    );

    logger.info(
        {
            queue: env.SERVICEBUS_QUEUE_NOTIFICATION,
            subject: "quote.notification",
        },
        "quote notification receiver started"
    );

    return {
        close: async () => {
            await subscription.close();
            await receiver.close();
            await client.close();

            logger.info("quote notification receiver stopped");
        },
    };
}
