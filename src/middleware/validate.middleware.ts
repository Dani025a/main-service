import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../utils/errors.js";

export function validateBody(schema: ZodSchema): RequestHandler {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return next(
                new AppError(400, "VALIDATION_ERROR", "Invalid request body", result.error.flatten())
            );
        }

        req.body = result.data;
        next();
    };
}

export function validateQuery(schema: ZodSchema): RequestHandler {
    return (req, _res, next) => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            return next(
                new AppError(400, "VALIDATION_ERROR", "Invalid request query", result.error.flatten())
            );
        }

        req.query = result.data as any;
        next();
    };
}

export function validateParams(schema: ZodSchema): RequestHandler {
    return (req, _res, next) => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            return next(
                new AppError(400, "VALIDATION_ERROR", "Invalid request params", result.error.flatten())
            );
        }

        req.params = result.data as any;
        next();
    };
}