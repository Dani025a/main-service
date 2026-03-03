import type { TaskStatus as PrismaTaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";

export const TaskStatuses = ["AFVENTER", "IGANG", "UDFORT", "ANNULLERET"] as const;
export type TaskStatus = PrismaTaskStatus;

export type TaskRecord = {
    id: string;
    title: string;
    sellerId: string;
    customerId: string;
    orderId?: string;
    deadline?: Date;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type CreateTaskInput = {
    title: string;
    sellerId: string;
    customerId: string;
    orderId?: string;
    deadline?: Date;
    status?: TaskStatus;
};

export type UpdateTaskInput = {
    title?: string;
    sellerId?: string;
    customerId?: string;
    orderId?: string | null;
    deadline?: Date | null;
    status?: TaskStatus;
};

export type TaskFilter = {
    sellerId?: string;
    customerId?: string;
    statusIn?: TaskStatus[];
    statusNotIn?: TaskStatus[];
};

function buildWhere(filter: TaskFilter) {
    const status =
        filter.statusIn && filter.statusNotIn
            ? { in: filter.statusIn, notIn: filter.statusNotIn }
            : filter.statusIn
              ? { in: filter.statusIn }
              : filter.statusNotIn
                ? { notIn: filter.statusNotIn }
                : undefined;

    return {
        ...(filter.sellerId ? { sellerId: filter.sellerId } : {}),
        ...(filter.customerId ? { customerId: filter.customerId } : {}),
        ...(status ? { status } : {}),
    };
}

export async function createTask(input: CreateTaskInput): Promise<TaskRecord> {
    return prisma.task.create({
        data: {
            title: input.title,
            sellerId: input.sellerId,
            customerId: input.customerId,
            status: input.status ?? "AFVENTER",
            ...(input.orderId ? { orderId: input.orderId } : {}),
            ...(input.deadline ? { deadline: input.deadline } : {}),
        },
    });
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskRecord> {
    try {
        return await prisma.task.update({
            where: { id: taskId },
            data: {
                ...(input.title !== undefined ? { title: input.title } : {}),
                ...(input.sellerId !== undefined ? { sellerId: input.sellerId } : {}),
                ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
                ...(input.status !== undefined ? { status: input.status } : {}),
                ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
                ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
            },
        });
    } catch {
        throw new AppError(404, "NOT_FOUND", "Task not found");
    }
}

export async function listTasks(filter: TaskFilter): Promise<TaskRecord[]> {
    return prisma.task.findMany({
        where: buildWhere(filter),
        orderBy: { createdAt: "desc" },
    });
}

export async function listSellerTasks(sellerId: string, filter: Omit<TaskFilter, "sellerId">) {
    return listTasks({ ...filter, sellerId });
}

export async function listCustomerTasks(customerId: string, filter: Omit<TaskFilter, "customerId">) {
    return listTasks({ ...filter, customerId });
}
