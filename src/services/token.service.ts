// src/services/token.service.ts
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { signHs256Jwt } from "../utils/jwtHs256.js";

function timingSafeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

export async function issueClientToken(input: { clientId: string; clientSecret: string }) {
    if (!env.M2M_CLIENT_ID || !env.M2M_CLIENT_SECRET) {
        throw new AppError(500, "CONFIG_ERROR", "Missing M2M_CLIENT_ID/M2M_CLIENT_SECRET");
    }

    if (!env.M2M_JWT_SECRET || env.M2M_JWT_SECRET.length < 16) {
        throw new AppError(500, "CONFIG_ERROR", "Missing/too short M2M_JWT_SECRET");
    }

    if (!env.M2M_ISSUER || !env.M2M_AUDIENCE) {
        throw new AppError(500, "CONFIG_ERROR", "Missing M2M_ISSUER/M2M_AUDIENCE");
    }

    const clientId = String(input.clientId ?? "").trim();
    const clientSecret = String(input.clientSecret ?? "").trim();

    if (clientId !== env.M2M_CLIENT_ID) {
        throw new AppError(401, "INVALID_CLIENT", "Invalid client credentials");
    }
    if (!timingSafeEqual(clientSecret, env.M2M_CLIENT_SECRET)) {
        throw new AppError(401, "INVALID_CLIENT", "Invalid client credentials");
    }

    const ttlSeconds = Math.max(1, env.M2M_TOKEN_TTL_MINUTES) * 60;

    const accessToken = await signHs256Jwt({
        secret: env.M2M_JWT_SECRET,
        issuer: env.M2M_ISSUER,
        audience: env.M2M_AUDIENCE,
        subject: clientId,
        expiresInSeconds: ttlSeconds,
        claims: {
            typ: "m2m",
        },
    });

    return {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ttlSeconds,
    };
}
