import { db } from "../db/db.js";
import { AppError } from "../utils/errors.js";

export const taskStatuses = ["AFVENTER", "IGANG", "UDFORT", "ANNULLERET"] as const;

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
    sellerid: string;
    customerid: string;
    quoteid: string;
    deadline: Date | null;
    status: TaskStatus;
};

function mapRow(row: TaskRow): Task {
    return {
        id: row.id,
        title: row.title,
        sellerId: row.sellerid,
        customerId: row.customerid,
        quoteId: row.quoteid,
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
    const values: (string | string[])[] = [];
    const where: string[] = [];

    if (input.sellerId) {
        values.push(input.sellerId);
        where.push(`"sellerId" = $${values.length}`);
    }

    if (input.customerId) {
        values.push(input.customerId);
        where.push(`"customerId" = $${values.length}`);
    }

    if (input.quoteId) {
        values.push(input.quoteId);
        where.push(`"quoteId" = $${values.length}`);
    }

    if (input.statuses && input.statuses.length > 0) {
        values.push(input.statuses);
        where.push(`status = ANY($${values.length}::text[])`);
    }

    const result = await db.query<TaskRow>(
        `
        SELECT
            id,
            title,
            "sellerId" as sellerid,
            "customerId" as customerid,
            "quoteId" as quoteid,
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

export async function createTask(input: {
    title: string;
    sellerId: string;
    customerId: string;
    quoteId: string;
    deadline?: string;
    status?: TaskStatus;
}) {
    const result = await db.query<TaskRow>(
        `
        INSERT INTO tasks (
            title,
            "sellerId",
            "customerId",
            "quoteId",
            deadline,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            title,
            "sellerId" as sellerid,
            "customerId" as customerid,
            "quoteId" as quoteid,
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
        SET status = $2
        WHERE id = $1
        RETURNING
            id,
            title,
            "sellerId" as sellerid,
            "customerId" as customerid,
            "quoteId" as quoteid,
            deadline,
            status
        `,
        [id, status],
    );

    return result.rows[0] ?? null;
}
