import type { RequestHandler } from "express";
import {
    createTask,
    listCustomerTasks,
    listSellerTasks,
    listTasks,
    type TaskFilter,
    type TaskStatus,
    updateTask,
} from "../services/task.service.js";

function asStatusArray(input?: string | string[]) {
    if (!input) return undefined;
    const raw = Array.isArray(input) ? input.join(",") : input;
    const parsed = raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean) as TaskStatus[];

    return parsed.length > 0 ? parsed : undefined;
}

function taskFilterFromQuery(query: Record<string, unknown>): TaskFilter {
    const open = String(query.open ?? "false") === "true";

    if (open) {
        return {
            statusNotIn: ["UDFORT", "ANNULLERET"],
        };
    }

    const filter: TaskFilter = {};
    const statusIn = asStatusArray(query.status as string | string[] | undefined);
    const statusNotIn = asStatusArray(query.excludeStatus as string | string[] | undefined);

    if (statusIn) filter.statusIn = statusIn;
    if (statusNotIn) filter.statusNotIn = statusNotIn;

    return filter;
}

export const taskController = {
    create: (async (req, res, next) => {
        try {
            const task = await createTask(req.body);
            res.status(201).json({ ok: true, task });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    update: (async (req, res, next) => {
        try {
            const task = await updateTask(req.params.id as string, req.body);
            res.json({ ok: true, task });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    list: (async (req, res, next) => {
        try {
            const tasks = await listTasks(taskFilterFromQuery(req.query as Record<string, unknown>));
            res.json({ ok: true, tasks });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    listForSeller: (async (req, res, next) => {
        try {
            const tasks = await listSellerTasks(
                req.params.sellerId as string,
                taskFilterFromQuery(req.query as Record<string, unknown>),
            );
            res.json({ ok: true, tasks });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,

    listForCustomer: (async (req, res, next) => {
        try {
            const tasks = await listCustomerTasks(
                req.params.customerId as string,
                taskFilterFromQuery(req.query as Record<string, unknown>),
            );
            res.json({ ok: true, tasks });
        } catch (error) {
            next(error);
        }
    }) satisfies RequestHandler,
};
