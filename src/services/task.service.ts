import { TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";

type TaskListInput = {
    userId: string;
    as: "seller" | "customer";
    statuses?: TaskStatus[];
};

type CreateTaskInput = {
    title: string;
    sellerId: string;
    customerId: string;
    orderId?: string;
    deadline?: Date;
    status?: TaskStatus;
};

export async function listTasksForUser(input: TaskListInput) {
    return prisma.task.findMany({
        where: {
            ...(input.as === "seller" ? { sellerId: input.userId } : { customerId: input.userId }),
            ...(input.statuses && input.statuses.length > 0 ? { status: { in: input.statuses } } : {}),
        },
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    });
}

export async function createTask(input: CreateTaskInput) {
    return prisma.task.create({
        data: {
            title: input.title,
            sellerId: input.sellerId,
            customerId: input.customerId,
            ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
            ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
        },
    });
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
    const existing = await prisma.task.findUnique({ where: { id } });

    if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Task was not found");
    }

    return prisma.task.update({
        where: { id },
        data: { status },
    });
}
