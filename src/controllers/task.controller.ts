import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../utils/errors.js";
import { changeTaskStatus, createTask, listTasks, taskStatuses } from "../services/task.service.js";

const TaskQuerySchema = z.object({
    sellerId: z.string().min(1).optional(),
    customerId: z.string().min(1).optional(),
    quoteId: z.string().min(1).optional(),
    statuses: z
        .union([z.string().min(1), z.array(z.string().min(1))])
        .optional()
        .transform((value) => {
            if (!value) return undefined;

            const rawList = Array.isArray(value) ? value : value.split(",");
            const normalized = rawList
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0);

            if (normalized.length === 0) return undefined;
            return z.array(z.enum(taskStatuses)).parse(normalized);
        }),
});

const CreateTaskSchema = z.object({
    title: z.string().min(1),
    sellerId: z.string().min(1),
    customerId: z.string().min(1),
    quoteId: z.string().min(1),
    deadline: z.string().datetime().optional(),
    status: z.enum(taskStatuses).optional(),
});

const TaskIdParamSchema = z.object({
    id: z.string().min(1),
});

const ChangeTaskStatusSchema = z.object({
    status: z.enum(taskStatuses),
});

export const taskController = {
    listMine: (async (req, res, next) => {
        try {
            const parsed = TaskQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid task query", parsed.error.flatten());
            }

            const filters = {
                ...(parsed.data.sellerId ? { sellerId: parsed.data.sellerId } : {}),
                ...(parsed.data.customerId ? { customerId: parsed.data.customerId } : {}),
                ...(parsed.data.quoteId ? { quoteId: parsed.data.quoteId } : {}),
                ...(parsed.data.statuses ? { statuses: parsed.data.statuses } : {}),
            };

            const tasks = await listTasks(filters);
            res.json({ ok: true, data: tasks });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    create: (async (req, res, next) => {
        try {
            const parsed = CreateTaskSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid task payload", parsed.error.flatten());
            }

            const payload = {
                title: parsed.data.title,
                sellerId: parsed.data.sellerId,
                customerId: parsed.data.customerId,
                quoteId: parsed.data.quoteId,
                ...(parsed.data.deadline ? { deadline: parsed.data.deadline } : {}),
                ...(parsed.data.status ? { status: parsed.data.status } : {}),
            };

            const task = await createTask(payload);
            res.status(201).json({ ok: true, data: task });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    changeStatus: (async (req, res, next) => {
        try {
            const parsedParams = TaskIdParamSchema.safeParse(req.params);
            if (!parsedParams.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid task id", parsedParams.error.flatten());
            }

            const parsedBody = ChangeTaskStatusSchema.safeParse(req.body);
            if (!parsedBody.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid task status", parsedBody.error.flatten());
            }

            const task = await changeTaskStatus(parsedParams.data.id, parsedBody.data.status);
            if (!task) {
                throw new AppError(404, "NOT_FOUND", "Task not found");
            }

            res.json({ ok: true, data: task });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,
};
