import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors.js";
import { logger } from "../config/logger.js";

export function errorMiddleware(): ErrorRequestHandler {
    return (err, req, res, _next) => {
        const requestId = (req as any).requestId;

        if (err instanceof AppError) {
            logger.warn(
                {
                    err: {
                        code: err.code,
                        message: err.message,
                        details: err.details
                    },
                    requestId
                },
                "app error"
            );

            return res.status(err.status).json({
                ok: false,
                code: err.code,
                message: err.message,
                requestId
            });
        }

        logger.error({ err, requestId }, "unhandled error");

        return res.status(500).json({
            ok: false,
            code: "INTERNAL_SERVER_ERROR",
            message: "Unexpected server error",
            requestId
        });
    };
}