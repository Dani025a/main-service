import type { Request, Response, NextFunction, RequestHandler } from "express"

/**
 * Wraps en async Express handler og sender fejl til next(err).
 *
 * Uden dette:
 * - thrown errors / rejected promises inde i async handlers bliver ikke altid fanget korrekt af Express.
 *
 * Med dette:
 * - vi kan skrive async controllers uden try/catch i hver handler,
 *   og stadig få central error handler til at virke.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  const handler: RequestHandler = (req, res, next) => {
    void fn(req, res, next).catch(next)
  }
  return handler
}
