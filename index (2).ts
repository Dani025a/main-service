import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { verifyHs256Jwt } from "../utils/jwtHs256.js";

export type Principal =
    | { type: "gateway"; sub: string }
    | { type: "m2m"; clientId: string }
    | {
        type: "user";
        userId: string;
        email: string;
        name: string;
        permissions: string[];
        roles: string[];
    };

function getHeader(req: any, name: string): string | null {
    const value = req.headers?.[name.toLowerCase()];

    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
    }

    if (Array.isArray(value) && value.length > 0) {
        const first = String(value[0] ?? "").trim();
        return first.length > 0 ? first : null;
    }

    return null;
}

function getBearer(req: any): string | null {
    const auth = getHeader(req, "authorization");
    if (!auth) return null;
    if (!auth.toLowerCase().startsWith("bearer ")) return null;
    return auth.slice("bearer ".length).trim();
}

export function getPrincipal(req: any): Principal | null {
    return (req as any).principal ?? null;
}

function setPrincipal(req: any, principal: Principal): void {
    (req as any).principal = principal;
}

export function requireGatewayApiAuth(): RequestHandler {
    return async (req, _res, next) => {
        try {
            const gatewayAssertion = getHeader(req, "x-gateway-assertion");
            if (!gatewayAssertion) {
                throw new AppError(401, "UNAUTHORIZED", "Missing gateway assertion");
            }

            if (!env.GATEWAY_ASSERTION_SECRET) {
                throw new AppError(500, "CONFIG_ERROR", "Missing GATEWAY_ASSERTION_SECRET");
            }

            const payload = await verifyHs256Jwt<{
                sub?: string;
                perms?: string[];
                roles?: string[];
                email?: string;
                name?: string;
            }>({
                token: gatewayAssertion,
                secret: env.GATEWAY_ASSERTION_SECRET,
                issuer: env.GATEWAY_ASSERTION_ISSUER,
                audience: env.GATEWAY_ASSERTION_AUDIENCE
            });

            const sub = String(payload.sub ?? "");
            if (!sub) {
                throw new AppError(401, "UNAUTHORIZED", "Invalid gateway assertion (missing sub)");
            }

            const permissions = Array.isArray(payload.perms) ? payload.perms.map(String) : [];
            const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];
            const email = typeof payload.email === "string" ? payload.email : "";
            const name = typeof payload.name === "string" ? payload.name : "";

            if (permissions.length > 0 || roles.length > 0 || email.length > 0) {
                setPrincipal(req, {
                    type: "user",
                    userId: sub,
                    email: email || "unknown",
                    name: name || "Unknown",
                    permissions,
                    roles
                });

                return next();
            }

            setPrincipal(req, { type: "gateway", sub });
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

export function requireM2mApiAuth(): RequestHandler {
    return async (req, _res, next) => {
        try {
            const bearer = getBearer(req);

            if (!bearer) {
                throw new AppError(401, "UNAUTHORIZED", "Missing Authorization bearer token");
            }

            if (!env.M2M_JWT_SECRET) {
                throw new AppError(500, "CONFIG_ERROR", "Missing M2M_JWT_SECRET");
            }

            const payload = await verifyHs256Jwt<{
                sub?: string;
                typ?: string;
            }>({
                token: bearer,
                secret: env.M2M_JWT_SECRET,
                issuer: env.M2M_ISSUER,
                audience: env.M2M_AUDIENCE
            });

            const sub = String(payload.sub ?? "");
            if (!sub) {
                throw new AppError(401, "UNAUTHORIZED", "Invalid M2M token (missing sub)");
            }

            if (String(payload.typ ?? "") !== "m2m") {
                throw new AppError(401, "UNAUTHORIZED", "Invalid M2M token type");
            }

            setPrincipal(req, { type: "m2m", clientId: sub });
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

export function requireGatewayOrM2mApiAuth(): RequestHandler {
    return async (req, res, next) => {
        try {
            const gatewayAssertion = getHeader(req, "x-gateway-assertion");
            const bearer = getBearer(req);

            if (gatewayAssertion) return requireGatewayApiAuth()(req, res, next);
            if (bearer) return requireM2mApiAuth()(req, res, next);

            throw new AppError(
                401,
                "UNAUTHORIZED",
                "Missing x-gateway-assertion or Authorization bearer token"
            );
        } catch (error) {
            return next(error);
        }
    };
}