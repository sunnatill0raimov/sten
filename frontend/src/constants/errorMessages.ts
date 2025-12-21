/**
 * Centralized error messages for user-friendly UX
 * Maps backend error codes to human-readable messages
 */

export const ERROR_CODES = {
  // Authentication & Password Errors
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  
  // STEN State Errors
  STEN_NOT_FOUND: 'STEN_NOT_FOUND',
  STEN_EXPIRED: 'STEN_EXPIRED',
  STEN_ALREADY_VIEWED: 'STEN_ALREADY_VIEWED',
  WINNERS_LIMIT_REACHED: 'WINNERS_LIMIT_REACHED',
  
  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * User-friendly error messages mapped by error code
 */
export const ERROR_MESSAGES: Record<ErrorCode | string, string> = {
  // 400 - Bad Request
  [ERROR_CODES.PASSWORD_REQUIRED]: 'This STEN requires a password to view.',
  
  // 401 - Unauthorized
  [ERROR_CODES.INVALID_PASSWORD]: 'Wrong password. Please try again.',
  
  // 403 - Forbidden
  [ERROR_CODES.STEN_ALREADY_VIEWED]: 'This STEN has already been viewed.',
  [ERROR_CODES.WINNERS_LIMIT_REACHED]: 'Maximum views reached for this STEN.',
  
  // 404 - Not Found
  [ERROR_CODES.STEN_NOT_FOUND]: 'STEN not found. It may have been deleted.',
  
  // 410 - Gone
  [ERROR_CODES.STEN_EXPIRED]: 'This STEN has expired.',
  
  // Network/Server Errors
  [ERROR_CODES.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
  [ERROR_CODES.SERVER_ERROR]: 'Something went wrong. Please try again later.',
};

/**
 * HTTP status code to default error code mapping
 */
export const STATUS_CODE_ERRORS: Record<number, ErrorCode> = {
  400: ERROR_CODES.PASSWORD_REQUIRED,
  401: ERROR_CODES.INVALID_PASSWORD,
  403: ERROR_CODES.STEN_ALREADY_VIEWED,
  404: ERROR_CODES.STEN_NOT_FOUND,
  410: ERROR_CODES.STEN_EXPIRED,
  500: ERROR_CODES.SERVER_ERROR,
};

/**
 * Get user-friendly error message from error code or status
 */
export const getErrorMessage = (code?: string, statusCode?: number): string => {
  // Try to get message by error code first
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  
  // Fall back to status code mapping
  if (statusCode && STATUS_CODE_ERRORS[statusCode]) {
    return ERROR_MESSAGES[STATUS_CODE_ERRORS[statusCode]];
  }
  
  // Default fallback
  return ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR];
};

/**
 * Error icons for different error types
 */
export const ERROR_ICONS = {
  [ERROR_CODES.PASSWORD_REQUIRED]: '🔐',
  [ERROR_CODES.INVALID_PASSWORD]: '❌',
  [ERROR_CODES.STEN_NOT_FOUND]: '🔍',
  [ERROR_CODES.STEN_EXPIRED]: '⏰',
  [ERROR_CODES.STEN_ALREADY_VIEWED]: '👁️',
  [ERROR_CODES.WINNERS_LIMIT_REACHED]: '🏆',
  [ERROR_CODES.NETWORK_ERROR]: '📡',
  [ERROR_CODES.SERVER_ERROR]: '⚠️',
};
