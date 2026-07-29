import crypto from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  message: string;
  context?: Record<string, unknown>;
  error?: { message: string; stack?: string };
}

/**
 * Structured JSON logger with correlation IDs for request tracing.
 * Replaces raw console.log/error calls across the server codebase.
 */
class Logger {
  private correlationId: string;

  constructor(correlationId?: string) {
    this.correlationId = correlationId || crypto.randomUUID();
  }

  private format(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: this.correlationId,
      message,
    };
    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }
    if (error) {
      entry.error = {
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      };
    }
    return entry;
  }

  info(message: string, context?: Record<string, unknown>) {
    const entry = this.format('info', message, context);
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  warn(message: string, context?: Record<string, unknown>) {
    const entry = this.format('warn', message, context);
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    const entry = this.format('error', message, context, err);
    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'production') return;
    const entry = this.format('debug', message, context);
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  /** Create a child logger inheriting this correlation ID */
  child(additionalContext?: Record<string, unknown>) {
    return new Logger(this.correlationId);
  }
}

/** Create a fresh logger (used at app startup or standalone scripts) */
export function createLogger(correlationId?: string): Logger {
  return new Logger(correlationId);
}

/** Default app-level logger */
export const logger = createLogger();

export default Logger;
