/**
 * Application Error Types
 */

export enum ErrorCode {
  // Network errors
  BRIDGE_NOT_CONNECTED = 'BRIDGE_NOT_CONNECTED',
  BRIDGE_CONNECTION_FAILED = 'BRIDGE_CONNECTION_FAILED',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',

  // Tab errors
  NO_ACTIVE_TAB = 'NO_ACTIVE_TAB',
  TAB_NOT_FOUND = 'TAB_NOT_FOUND',
  TAB_LOAD_FAILED = 'TAB_LOAD_FAILED',

  // Element errors
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  ELEMENT_NOT_VISIBLE = 'ELEMENT_NOT_VISIBLE',
  ELEMENT_NOT_CLICKABLE = 'ELEMENT_NOT_CLICKABLE',

  // Content script errors
  CONTENT_SCRIPT_NOT_READY = 'CONTENT_SCRIPT_NOT_READY',
  CONTENT_SCRIPT_INJECTION_FAILED = 'CONTENT_SCRIPT_INJECTION_FAILED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_SELECTOR = 'INVALID_SELECTOR',

  // Execution errors
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  UNKNOWN_TOOL = 'UNKNOWN_TOOL',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleError(error: unknown): { success: false; error: string; code?: string } {
  if (isAppError(error)) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
  };
}
