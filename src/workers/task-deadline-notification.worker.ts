import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { createNotificationIfMissing } from "../services/notification.service.js";
import { listTasksApproachingDeadline, type Task } from "../services/task.service.js";
import { AppError } from "../utils/errors.js";

export type TaskDeadlineNotificationWorkerHandle = {
    close: () => Promise<void>;
};

function createDeterministicUuid(seed: string) {
    const hash = createHash("sha256").update(seed).digest("hex");
    const timeHighAndVersion = ((Number.parseInt(hash.slice(12, 16), 16) & 0x0fff) | 0x5000)
        .toString(16)
        .padStart(4, "0");
    const clockSeqAndVariant = ((Number.parseInt(hash.slice(16, 20), 16) & 0x3fff) | 0x8000)
        .toString(16)
        .padStart(4, "0");

    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        timeHighAndVersion,
        clockSeqAndVariant,
        hash.slice(20, 32),
    ].join("-");
}

function taskDeadlineNotificationId(task: Task) {
    return createDeterministicUuid(`task-deadline:${task.id}:${task.sellerId}:${task.deadline ?? ""}`);
}

function buildNotificationBody(task: Task) {
    return `Task "${task.title}" is due at ${task.deadline}.`;
}

async function createTaskDeadlineNotification(task: Task) {
    if (!task.deadline) {
        return {
            created: false as const,
            relatedQuoteLinked: false,
            relatedCustomerLinked: false,
        };
    }

    const notificationId = taskDeadlineNotificationId(task);
    const title = "Task deadline approaching";
    const body = buildNotificationBody(task);
    const metadata: Record<string, unknown> = {
        taskId: task.id,
        quoteId: task.quoteId,
        relatedQuote: task.quoteId,
        relatedCustomer: task.customerId,
        deadline: task.deadline,
        taskTitle: task.title,
        notificationCategory: "TASK_DEADLINE",
        lookaheadMinutes: env.TASK_DEADLINE_NOTIFICATION_LOOKAHEAD_MINUTES,
    };

    let relatedQuote: string | null = task.quoteId;
    let relatedCustomer: string | null = task.customerId;

    while (true) {
        try {
            const result = await createNotificationIfMissing({
                id: notificationId,
                userId: task.sellerId,
                sellerId: task.sellerId,
                type: "TASK_DEADLINE",
                kind: "SYSTEM",
                title,
                body,
                actionUrl: task.quoteId ? `/quotes/${task.quoteId}` : null,
                metadata,
                message: body,
                relatedQuote,
                relatedCustomer,
            });

            return {
                created: result.created,
                relatedQuoteLinked: relatedQuote !== null,
                relatedCustomerLinked: relatedCustomer !== null,
            };
        } catch (error) {
            if (!(error instanceof AppError) || error.code !== "VALIDATION_ERROR") {
                throw error;
            }

            if (error.message === "relatedQuote does not exist" && relatedQuote !== null) {
                relatedQuote = null;
                continue;
            }

            if (error.message === "relatedCustomer does not exist" && relatedCustomer !== null) {
                relatedCustomer = null;
                continue;
            }

            throw error;
        }
    }
}

async function runDeadlineNotificationSweep() {
    const windowStart = new Date();
    const windowEnd = new Date(
        windowStart.getTime() + env.TASK_DEADLINE_NOTIFICATION_LOOKAHEAD_MINUTES * 60_000,
    );
    const tasks = await listTasksApproachingDeadline({
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
    });

    let createdCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const task of tasks) {
        try {
            const result = await createTaskDeadlineNotification(task);

            if (result.created) {
                createdCount += 1;
                continue;
            }

            duplicateCount += 1;
        } catch (error) {
            if (error instanceof AppError && error.code === "VALIDATION_ERROR" && error.message === "sellerId does not exist") {
                skippedCount += 1;
                logger.warn(
                    {
                        taskId: task.id,
                        sellerId: task.sellerId,
                        deadline: task.deadline,
                        errorCode: error.code,
                        errorMessage: error.message,
                    },
                    "task deadline notification skipped because seller was not found",
                );
                continue;
            }

            failedCount += 1;
            logger.error(
                {
                    err: error,
                    taskId: task.id,
                    sellerId: task.sellerId,
                    deadline: task.deadline,
                },
                "task deadline notification failed",
            );
        }
    }

    logger.info(
        {
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
            scannedTasks: tasks.length,
            createdCount,
            duplicateCount,
            skippedCount,
            failedCount,
        },
        "task deadline notification sweep complete",
    );
}

export async function startTaskDeadlineNotificationWorker(): Promise<TaskDeadlineNotificationWorkerHandle> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let activeSweep: Promise<void> | null = null;
    let closed = false;

    const scheduleNextSweep = () => {
        if (closed) {
            return;
        }

        timer = setTimeout(() => {
            startSweep();
        }, env.TASK_DEADLINE_NOTIFICATION_INTERVAL_MS);
        timer.unref?.();
    };

    const startSweep = () => {
        if (closed || activeSweep) {
            return;
        }

        activeSweep = (async () => {
            try {
                await runDeadlineNotificationSweep();
            } catch (error) {
                logger.error({ err: error }, "task deadline notification sweep crashed");
            } finally {
                activeSweep = null;
                scheduleNextSweep();
            }
        })();
    };

    logger.info(
        {
            intervalMs: env.TASK_DEADLINE_NOTIFICATION_INTERVAL_MS,
            lookaheadMinutes: env.TASK_DEADLINE_NOTIFICATION_LOOKAHEAD_MINUTES,
        },
        "task deadline notification worker started",
    );

    startSweep();

    return {
        close: async () => {
            closed = true;

            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            if (activeSweep) {
                await activeSweep;
            }

            logger.info("task deadline notification worker stopped");
        },
    };
}
