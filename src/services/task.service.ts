import { db } from "../db/db.js";
import { AppError } from "../utils/errors.js";

export const taskStatuses = ["AFVENTER", "IGANG", "UDFORT", "ANNULLERET"] as const;
export const taskStatusesWithOpenDeadlines = ["AFVENTER", "IGANG"] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export type Task = {
    id: string;
    title: string;
    sellerId: string;
    customerId: string;
    quoteId: string;
    deadline: string | null;
    status: TaskStatus;
};

type TaskRow = {
    id: string;
    title: string;
    seller_id: string;
    customer_id: string;
    quote_id: string;
    deadline: Date | null;
    status: TaskStatus;
};

function mapRow(row: TaskRow): Task {
    return {
        id: row.id,
        title: row.title,
        sellerId: row.seller_id,
        customerId: row.customer_id,
        quoteId: row.quote_id,
        deadline: row.deadline ? row.deadline.toISOString() : null,
        status: row.status,
    };
}

export async function listTasks(input: {
    sellerId?: string;
    customerId?: string;
    quoteId?: string;
    statuses?: TaskStatus[];
}) {
    const values: unknown[] = [];
    const where: string[] = [];

    if (input.sellerId) {
        values.push(input.sellerId);
        where.push(`seller_id = $${values.length}`);
    }

    if (input.customerId) {
        values.push(input.customerId);
        where.push(`customer_id = $${values.length}`);
    }

    if (input.quoteId) {
        values.push(input.quoteId);
        where.push(`quote_id = $${values.length}`);
    }

    if (input.statuses && input.statuses.length > 0) {
        values.push(input.statuses);
        where.push(`status = ANY($${values.length}::task_status[])`);
    }

    const result = await db.query<TaskRow>(
        `
        SELECT
            id,
            title,
            seller_id,
            customer_id,
            quote_id,
            deadline,
            status
        FROM tasks
        ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY deadline ASC NULLS LAST, id ASC
        `,
        values,
    );

    return result.rows.map(mapRow);
}

export async function listTasksApproachingDeadline(input: {
    from: string;
    to: string;
    statuses?: TaskStatus[];
}) {
    const statuses = input.statuses ?? [...taskStatusesWithOpenDeadlines];
    const result = await db.query<TaskRow>(
        `
        SELECT
            id,
            title,
            seller_id,
            customer_id,
            quote_id,
            deadline,
            status
        FROM tasks
        WHERE
            deadline IS NOT NULL
            AND deadline >= $1
            AND deadline <= $2
            AND status = ANY($3::task_status[])
        ORDER BY deadline ASC, id ASC
        `,
        [input.from, input.to, statuses],
    );

    return result.rows.map(mapRow);
}

export async function createTask(input: {
    title: string;
    sellerId: string;
    customerId: string;
    quoteId: string;
    deadline?: string | undefined;
    status?: TaskStatus | undefined;
}) {
    const result = await db.query<TaskRow>(
        `
        INSERT INTO tasks (
            title,
            seller_id,
            customer_id,
            quote_id,
            deadline,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6::task_status)
        RETURNING
            id,
            title,
            seller_id,
            customer_id,
            quote_id,
            deadline,
            status
        `,
        [
            input.title,
            input.sellerId,
            input.customerId,
            input.quoteId,
            input.deadline ?? null,
            input.status ?? "AFVENTER",
        ],
    );

    const row = result.rows[0];
    if (!row) {
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "Failed to create task");
    }

    return mapRow(row);
}

export async function changeTaskStatus(id: string, status: TaskStatus) {
    const result = await db.query<TaskRow>(
        `
        UPDATE tasks
        SET status = $2::task_status
        WHERE id = $1
        RETURNING
            id,
            title,
            seller_id,
            customer_id,
            quote_id,
            deadline,
            status
        `,
        [id, status],
    );

    return result.rows[0] ?? null;
}


//index

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startQuoteNotificationReceiver } from "./workers/quote-notification.receiver.js";
import { startTaskDeadlineNotificationWorker } from "./workers/task-deadline-notification.worker.js";

async function main() {
    const app = await createApp();
    const quoteNotificationReceiver = await startQuoteNotificationReceiver();
    const taskDeadlineNotificationWorker = await startTaskDeadlineNotificationWorker();
    let isShuttingDown = false;

    const server = app.listen(env.PORT, () => {
        logger.info(
            {
                port: env.PORT,
                env: env.NODE_ENV,
            },
            "main-service started",
        );
    });

    const shutdown = async (signal: string) => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logger.info({ signal }, "shutdown started");

        try {
            if (quoteNotificationReceiver) {
                await quoteNotificationReceiver.close();
            }

            await taskDeadlineNotificationWorker.close();

            await new Promise<void>((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });

            logger.info({ signal }, "shutdown complete");
            process.exit(0);
        } catch (err) {
            logger.error({ err, signal }, "shutdown failed");
            process.exit(1);
        }
    };

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });
    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
}

main().catch((err) => {
    logger.error({ err }, "fatal startup error");
    process.exit(1);
});
