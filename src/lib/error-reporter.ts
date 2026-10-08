import { logger, generateCorrelationId, LogContext } from './logger';

export interface ErrorReportOptions {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  schoolId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReportResult {
  errorId: string;
  message: string;
  reportedAt: string;
}

class ErrorReporter {
  /**
    * Capture and process an unhandled exception or critical error.
    * Returns a client-safe ErrorReportResult containing a unique error ID.
    */
  public captureError(error: unknown, options: ErrorReportOptions = {}): ErrorReportResult {
    const errorId = `err_${generateCorrelationId()}`;
    const timestamp = new Date().toISOString();

    let errorMessage = 'An unexpected error occurred';
    let errorStack: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }

    const logContext: LogContext = {
      errorId,
      severity: options.severity || 'high',
      userId: options.userId,
      schoolId: options.schoolId,
      action: options.action,
      ...options.metadata,
    };

    // Log structured error using our central logger
    logger.error(`[ErrorReporter] ${errorMessage}`, error, logContext);

    // If an APM/Sentry DSN is configured, external error reporting can be triggered here
    if (process.env.SENTRY_DSN) {
      this.sendToExternalAPM(errorId, errorMessage, errorStack, logContext);
    }

    return {
      errorId,
      message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : errorMessage,
      reportedAt: timestamp,
    };
  }

  private sendToExternalAPM(
    _errorId: string,
    _message: string,
    _stack?: string,
    _context?: Record<string, unknown>
  ) {
    // Placeholder for Sentry/Datadog integration without hardcoding vendor SDKs
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ErrorReporter External APM Mock] Dispatched error ${_errorId}`);
    }
  }

}

export const errorReporter = new ErrorReporter();
