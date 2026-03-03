import pino from "pino"

/**
 * Pino logger (JSON logs).
 *
 * Hvorfor:
 * - Azure / Docker logs er typisk lettest at arbejde med i JSON
 * - Strukturerede logs gør det nemt at filtrere på requestId/outboxId osv.
 *
 * Redaction:
 * - Fjerner sensitive headers (Authorization, Cookie) fra logs
 */
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true
  }
})
