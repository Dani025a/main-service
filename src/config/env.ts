import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

function splitCsv(v: string | undefined): string[] {
    return (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

const EnvSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3010),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),
    ALLOWED_ORIGINS: z.string().optional(),

    GATEWAY_ASSERTION_SECRET: z.string().min(16),
    GATEWAY_ASSERTION_ISSUER: z.string().min(1).default("api-gateway"),
    GATEWAY_ASSERTION_AUDIENCE: z.string().min(1).default("aggregate-service"),

    M2M_JWT_SECRET: z.string().min(16),
    M2M_ISSUER: z.string().min(1).default("aggregate-service"),
    M2M_AUDIENCE: z.string().min(1).default("aggregate-service"),
    M2M_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
    M2M_CLIENT_ID: z.string().min(1),
    M2M_CLIENT_SECRET: z.string().min(1),


});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten());
    throw new Error("Invalid environment variables");
}

export const env = {
    ...parsed.data,
    ALLOWED_ORIGINS_LIST: splitCsv(parsed.data.ALLOWED_ORIGINS),
};
