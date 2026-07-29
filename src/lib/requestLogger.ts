import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Logger from './logger';

declare global {
  namespace Express {
    interface Request {
      log: Logger;
      correlationId: string;
    }
  }
}

/**
 * Express middleware that attaches a structured logger with a unique
 * correlation ID to every request. Also logs request start/end with
 * timing, method, path, and status code.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  const log = new Logger(correlationId);

  req.log = log;
  req.correlationId = correlationId;

  // Set correlation ID in response header for client-side tracing
  res.setHeader('x-correlation-id', correlationId);

  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const context = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    };

    if (res.statusCode >= 500) {
      log.error('Request failed', undefined, context);
    } else if (res.statusCode >= 400) {
      log.warn('Client error', context);
    } else {
      log.info('Request completed', context);
    }
  });

  next();
}
