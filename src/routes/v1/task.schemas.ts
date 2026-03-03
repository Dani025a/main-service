import { z } from "zod";
import { TaskStatuses } from "../../services/task.service.js";

const taskStatusEnum = z.enum(TaskStatuses);

const csvStatuses = z
    .string()
    .transform((value) => value.split(",").map((v) => v.trim()).filter(Boolean))
    .refine((values) => values.every((v) => taskStatusEnum.safeParse(v).success), {
        message: "Invalid task status value",
    });

export const createTaskBodySchema = z
    .object({
        title: z.string().min(1).max(500),
        sellerId: z.string().min(1),
        customerId: z.string().uuid(),
        orderId: z.string().uuid().optional(),
        deadline: z.coerce.date().optional(),
        status: taskStatusEnum.optional(),
    })
    .strict();

export const updateTaskParamsSchema = z
    .object({
        id: z.string().uuid(),
    })
    .strict();

export const sellerTaskParamsSchema = z
    .object({
        sellerId: z.string().min(1),
    })
    .strict();

export const customerTaskParamsSchema = z
    .object({
        customerId: z.string().uuid(),
    })
    .strict();

export const updateTaskBodySchema = z
    .object({
        title: z.string().min(1).max(500).optional(),
        sellerId: z.string().min(1).optional(),
        customerId: z.string().uuid().optional(),
        orderId: z.string().uuid().nullable().optional(),
        deadline: z.coerce.date().nullable().optional(),
        status: taskStatusEnum.optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided",
    });

export const listTaskQuerySchema = z
    .object({
        status: z.union([csvStatuses, z.array(taskStatusEnum)]).optional(),
        excludeStatus: z.union([csvStatuses, z.array(taskStatusEnum)]).optional(),
        open: z.enum(["true", "false"]).optional(),
    })
    .strict();
