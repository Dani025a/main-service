import pino from "pino";
import type { HttpLogger, Options as PinoHttpOptions } from "pino-http";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { env } from "./env.js";

type PinoHttpFn = (opts?: PinoHttpOptions) => HttpLogger;

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http") as PinoHttpFn;

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']"
    ],
    remove: true
  }
});

export const httpLogger = pinoHttp({
  logger,
  genReqId(req) {
    const headerId = req.headers["x-request-id"];
    if (typeof headerId === "string" && headerId.length > 0) return headerId;
    return randomUUID();
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  }
});