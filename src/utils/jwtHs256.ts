import {
    SignJWT,
    jwtVerify,
    type JWTPayload,
    type JWTVerifyOptions,
} from "jose";
import { AppError } from "./errors.js";

export async function signHs256Jwt(params: {
    secret: string;
    issuer: string;
    audience: string;
    subject: string;
    expiresInSeconds: number;
    claims?: Record<string, unknown>;
}) {
    if (!params.secret || params.secret.length < 16) {
        throw new AppError(500, "CONFIG_ERROR", "JWT secret missing/too short");
    }

    const key = new TextEncoder().encode(params.secret);
    const now = Math.floor(Date.now() / 1000);

    const jwt = await new SignJWT(params.claims ?? {})
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt(now)
        .setIssuer(params.issuer)
        .setAudience(params.audience)
        .setSubject(params.subject)
        .setExpirationTime(now + params.expiresInSeconds)
        .sign(key);

    return jwt;
}

export async function verifyHs256Jwt<T extends Record<string, unknown>>(params: {
    token: string;
    secret: string;
    issuer?: string;
    audience?: string;
}): Promise<JWTPayload & T> {
    if (!params.token || params.token.trim().length === 0) {
        throw new AppError(401, "UNAUTHORIZED", "Missing token");
    }

    if (!params.secret || params.secret.length < 16) {
        throw new AppError(500, "CONFIG_ERROR", "JWT secret missing/too short");
    }

    const key = new TextEncoder().encode(params.secret);

    const verifyOptions: JWTVerifyOptions = {
        algorithms: ["HS256"],
        ...(params.issuer ? { issuer: params.issuer } : {}),
        ...(params.audience ? { audience: params.audience } : {}),
    };

    try {
        const { payload } = await jwtVerify(params.token, key, verifyOptions);
        return payload as JWTPayload & T;
    } catch {
        throw new AppError(401, "UNAUTHORIZED", "Token expired or invalid");
    }
}