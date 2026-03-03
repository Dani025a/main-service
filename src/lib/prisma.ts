import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

const prisma =
    env.NODE_ENV === "production"
        ? new PrismaClient()
        : (globalForPrisma.prisma ??= new PrismaClient());

export { prisma };
