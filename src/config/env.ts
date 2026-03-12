import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();


const EnvSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3010),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),

    PGHOST: z.string().min(1),
    PGUSER: z.string().min(1),
    PGPORT: z.coerce.number().int().min(1).max(65535).default(5432),
    PGDATABASE: z.string().min(1),
    PGPASSWORD: z.string().min(1),
    PGSSL: z.string().optional(),

    GATEWAY_ASSERTION_SECRET: z.string().min(16),
    GATEWAY_ASSERTION_ISSUER: z.string().min(1).default("api-gateway"),
    GATEWAY_ASSERTION_AUDIENCE: z.string().min(1).default("aggregate-service"),

    M2M_JWT_SECRET: z.string().min(16),
    M2M_ISSUER: z.string().min(1).default("aggregate-service"),
    M2M_AUDIENCE: z.string().min(1).default("aggregate-service"),
    M2M_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
    M2M_CLIENT_ID: z.string().min(1),
    M2M_CLIENT_SECRET: z.string().min(1),

    SERVICEBUS_CONNECTION_STRING: z.string().min(1).optional(),
<<<<<<< HEAD
    SERVICEBUS_QUEUE_NOTIFICATION: z.string().min(1).default("quote-notification-send"),
=======
    SERVICEBUS_QUEUE_NOTIFICATION: z.string().min(1).default("notification-send"),
    TASK_DEADLINE_NOTIFICATION_INTERVAL_MS: z.coerce.number().int().min(1_000).default(300_000),
    TASK_DEADLINE_NOTIFICATION_LOOKAHEAD_MINUTES: z.coerce.number().int().min(1).default(1_440),
>>>>>>> da5cc86 (added readme and logic for automatic notification for tasks)


});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten());
    throw new Error("Invalid environment variables");
}

export const env = parsed.data

export const isProd = env.NODE_ENV === "production";
