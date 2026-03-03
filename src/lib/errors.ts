/**
 * Central fejlt type til hele servicen.
 *
 * Ideen:
 * - Vi vil have stabile fejl-koder + HTTP status på tværs af controllers/services.
 * - Global error handler i app.ts oversætter til JSON:
 *   { error: { code, message, details } }
 */
export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL"

export class AppError extends Error {
  public readonly code: AppErrorCode
  public readonly status: number
  public readonly details?: unknown

  constructor(opts: { code: AppErrorCode; status: number; message: string; details?: unknown }) {
    super(opts.message)
    this.code = opts.code
    this.status = opts.status
    this.details = opts.details
  }
}

/**
 * Normaliserer "unknown" errors til AppError.
 *
 * Nuværende adfærd:
 * - Hvis err allerede er AppError => returner den
 * - Ellers => returner 500 INTERNAL uden at lække interne detaljer
 *
 * Udvidelsesmuligheder:
 * - Map ZodError -> VALIDATION_ERROR (400)
 * - Map Postgres unique violation -> CONFLICT (409)
 */
export function asAppError(err: unknown): AppError {
  if (err instanceof AppError) return err
  return new AppError({
    code: "INTERNAL",
    status: 500,
    message: "Internal server error"
  })
}
