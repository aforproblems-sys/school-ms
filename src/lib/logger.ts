export type LogLevel = 'info' | 'warn' | 'error' | 'debug';


export interface LogContext {
  action?: string;
  userId?: string;
  schoolId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'session',
  'jwt',
  'creditcard',
  'cvv',
  'apikey',
  'smtp_pass',
  'twilio_auth_token',
  'aws_secret_access_key',
]);

/**
  * Sanitizes data objects to prevent accidental logging of credentials/secrets.
  */
export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (data.length > 500) {
      return data.substring(0, 500) + '...[TRUNCATED]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED_SECRET]';
      } else {
        sanitizedObj[key] = sanitizeLogData(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}

export function generateCorrelationId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}


class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext, err?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = sanitizeLogData(context) as LogContext;
    }

    if (err) {
      if (err instanceof Error) {
        entry.error = {
          name: err.name,
          message: err.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        };
      } else {
        entry.error = {
          message: String(err),
        };
      }
    }

    return entry;
  }

  private writeLog(entry: LogEntry) {
    const jsonString = JSON.stringify(entry);
    if (entry.level === 'error') {
      console.error(jsonString);
    } else if (entry.level === 'warn') {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
  }

  info(message: string, context?: LogContext) {
    this.writeLog(this.formatLog('info', message, context));
  }

  warn(message: string, context?: LogContext, err?: unknown) {
    this.writeLog(this.formatLog('warn', message, context, err));
  }

  error(message: string, err?: unknown, context?: LogContext) {
    this.writeLog(this.formatLog('error', message, context, err));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      this.writeLog(this.formatLog('debug', message, context));
    }
  }
}

export const logger = new Logger();
