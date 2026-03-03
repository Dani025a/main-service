import type { RequestHandler } from "express";
import { z } from "zod";
import { issueClientToken } from "../services/token.service.js";
import { AppError } from "../utils/errors.js";

/**
 * Accept ONLY client id + secret.
 * Supports camelCase OR snake_case. No extra keys.
 */
const TokenBodySchema = z
    .union([
        z.object({ clientId: z.string().min(1), clientSecret: z.string().min(1) }).strict(),
        z.object({ client_id: z.string().min(1), client_secret: z.string().min(1) }).strict(),
    ])
    .transform((d) => {
        if ("clientId" in d) return { clientId: d.clientId, clientSecret: d.clientSecret };
        return { clientId: d.client_id, clientSecret: d.client_secret };
    });

export const tokenController = {
    issue: (async (req, res, next) => {
        try {
            const parsed = TokenBodySchema.safeParse(req.body);
            if (!parsed.success) {
                throw new AppError(400, "VALIDATION_ERROR", "Invalid token request", parsed.error.flatten());
            }

            const out = await issueClientToken(parsed.data);
            res.json({ ok: true, ...out });
        } catch (err) {
            next(err);
        }
    }) satisfies RequestHandler,
};
