import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

// Local error types
interface ErrorDetail {
  field: string;
  message: string;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
  
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode
    };
  }
}

/**
 * Global Error Handler Middleware
 * Catches all errors and formats them consistently
 */
export function errorHandler(
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error for monitoring
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      error: 'Validation failed',
      details,
    });
  }

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle generic errors
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Ein Fehler ist aufgetreten' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: `Route ${req.path} not found`,
    statusCode: 404
  });
}

/**
 * Async Route Wrapper
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
