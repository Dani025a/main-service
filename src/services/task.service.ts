import { randomUUID } from "node:crypto";
import { AppError } from "../utils/errors.js";

export const TaskStatuses = ["AFVENTER", "IGANG", "UDFORT", "ANNULLERET"] as const;
export type TaskStatus = (typeof TaskStatuses)[number];

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

const tasks = new Map<string, TaskRecord>();

function applyFilter(task: TaskRecord, filter: TaskFilter): boolean {
    if (filter.sellerId && task.sellerId !== filter.sellerId) return false;
    if (filter.customerId && task.customerId !== filter.customerId) return false;
    if (filter.statusIn && filter.statusIn.length > 0 && !filter.statusIn.includes(task.status)) return false;
    if (filter.statusNotIn && filter.statusNotIn.length > 0 && filter.statusNotIn.includes(task.status))
        return false;
    return true;
}

export async function createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const now = new Date();
    const task: TaskRecord = {
        id: randomUUID(),
        title: input.title,
        sellerId: input.sellerId,
        customerId: input.customerId,
        status: input.status ?? "AFVENTER",
        createdAt: now,
        updatedAt: now,
    };

    if (input.orderId) task.orderId = input.orderId;
    if (input.deadline) task.deadline = input.deadline;

    tasks.set(task.id, task);
    return task;
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskRecord> {
    const existing = tasks.get(taskId);
    if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Task not found");
    }

    const next: TaskRecord = {
        ...existing,
        updatedAt: new Date(),
    };

    if (input.title !== undefined) next.title = input.title;
    if (input.sellerId !== undefined) next.sellerId = input.sellerId;
    if (input.customerId !== undefined) next.customerId = input.customerId;
    if (input.status !== undefined) next.status = input.status;

    if (input.orderId === null) delete next.orderId;
    if (input.orderId !== undefined && input.orderId !== null) next.orderId = input.orderId;

    if (input.deadline === null) delete next.deadline;
    if (input.deadline !== undefined && input.deadline !== null) next.deadline = input.deadline;

    tasks.set(taskId, next);
    return next;
}

export async function listTasks(filter: TaskFilter): Promise<TaskRecord[]> {
    return [...tasks.values()]
        .filter((task) => applyFilter(task, filter))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listSellerTasks(sellerId: string, filter: Omit<TaskFilter, "sellerId">) {
    return listTasks({ ...filter, sellerId });
}

export async function listCustomerTasks(customerId: string, filter: Omit<TaskFilter, "customerId">) {
    return listTasks({ ...filter, customerId });
}
