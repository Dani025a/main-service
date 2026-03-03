import type { RequestHandler } from "express";
import crypto from "node:crypto";

export function requestIdMiddleware(): RequestHandler {
    return (req, _res, next) => {
        const existing = req.headers["x-request-id"];

        if (typeof existing === "string" && existing.length > 0) {
            (req as any).requestId = existing;
            return next();
        }

        const requestId = crypto.randomUUID();
        (req as any).requestId = requestId;
        req.headers["x-request-id"] = requestId;
        next();
    };
}