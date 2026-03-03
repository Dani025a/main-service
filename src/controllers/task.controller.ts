import { TaskStatus } from "@prisma/client";
import type { RequestHandler } from "express";
import { z } from "zod";
import { getPrincipal } from "../middleware/auth.middleware.js";
import { createTask, listTasksForUser, updateTaskStatus } from "../services/task.service.js";
import { AppError } from "../utils/errors.js";

const TaskQuerySchema = z
    .object({
        as: z.enum(["seller", "customer"]),
        status: z.union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))]).optional(),
    })
    .strict()
    .transform((value) => ({
        as: value.as,
        statuses: value.status ? (Array.isArray(value.status) ? value.status : [value.status]) : undefined,
    }));

const TaskBodySchema = z
    .object({
        title: z.string().min(1),
        sellerId: z.string().min(1),
        customerId: z.string().uuid(),
        orderId: z.string().uuid().optional(),
        deadline: z.coerce.date().optional(),
        status: z.nativeEnum(TaskStatus).optional(),
    })
    .strict();

const TaskStatusBodySchema = z
    .object({
        status: z.nativeEnum(TaskStatus),
    })
    .strict();

const TaskIdSchema = z
    .object({
        id: z.string().uuid(),
    })
    .strict();

function requireUserPrincipal(req: Parameters<RequestHandler>[0]) {
    const principal = getPrincipal(req);

    if (!principal || principal.type !== "user") {
        throw new AppError(403, "FORBIDDEN", "User principal required");
    }

    return principal;
}

export const taskController = {
    listMine: (async (req, res, next) => {
        try {
            const principal = requireUserPrincipal(req);
            const query = TaskQuerySchema.parse(req.query);

            const tasks = await listTasksForUser({
                userId: principal.userId,
                as: query.as,
                statuses: query.statuses,
            });

            res.json({ ok: true, data: tasks });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    create: (async (req, res, next) => {
        try {
            requireUserPrincipal(req);
            const body = TaskBodySchema.parse(req.body);

            const task = await createTask(body);
            res.status(201).json({ ok: true, data: task });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    changeStatus: (async (req, res, next) => {
        try {
            requireUserPrincipal(req);
            const params = TaskIdSchema.parse(req.params);
            const body = TaskStatusBodySchema.parse(req.body);

            const task = await updateTaskStatus(params.id, body.status);
            res.json({ ok: true, data: task });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,
};
