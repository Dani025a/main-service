import { PrismaClient } from "@prisma/client";
import { isProd } from "../config/env.js";

let prisma: PrismaClient;

if (!isProd) {
  // @ts-ignore
  globalThis.__PRISMA__ = globalThis.__PRISMA__ ?? new PrismaClient();
  // @ts-ignore
  prisma = globalThis.__PRISMA__;
} else {
  prisma = new PrismaClient();
}

export { prisma };