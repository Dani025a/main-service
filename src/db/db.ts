// src/models/db.ts
import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

function resolveSsl(pgssl?: string) {
    const v = (pgssl ?? "").trim().toLowerCase();

    if (!v) return undefined;

    if (v === "true" || v === "1" || v === "require") {
        return { rejectUnauthorized: false };
    }
    if (v === "no-verify") {
        return { rejectUnauthorized: false };
    }
    if (v === "verify") {
        return { rejectUnauthorized: true };
    }
    if (v === "false" || v === "0" || v === "off") {
        return undefined;
    }
    return { rejectUnauthorized: false };
}

export const db = new Pool({
    host: env.PGHOST,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
    port: env.PGPORT,
    ssl: resolveSsl(env.PGSSL),

    max: 10,
    idleTimeoutMillis: 30_000,
});

// ✅ Force schema + timezone at connection level
db.on("connect", async (client) => {
    await client.query(`SET search_path TO public`);
    await client.query(`SET TIME ZONE 'UTC'`);
});

// ✅ Helpful startup log (you will immediately see wrong DB here)
(async () => {
    try {
        const res = await db.query<{
            db: string;
            user: string;
            host: string | null;
            port: number | null;
            search_path: string;
        }>(
            `SELECT
        current_database() as db,
        current_user as user,
        inet_server_addr()::text as host,
        inet_server_port() as port,
        current_setting('search_path') as search_path
      `,
        );

        const m = res.rows[0];
        console.log("[db] connected:", m);
    } catch (e) {
        console.error("[db] connection check failed:", e);
    }
})();

export async function withTx<T>(fn: (client: pg.PoolClient) => Promise<T>) {
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}
