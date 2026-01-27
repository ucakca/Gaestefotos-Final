// Unified Error Handling System
// Generated: 2026-01-23

// ============================================================================
// Error Codes Enum
// ============================================================================

export enum ErrorCode {
  // Authentication Errors (1xxx)
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_TOKEN_INVALID = 'AUTH_003',
  AUTH_UNAUTHORIZED = 'AUTH_004',
  AUTH_FORBIDDEN = 'AUTH_005',
  AUTH_2FA_REQUIRED = 'AUTH_006',
  AUTH_2FA_INVALID = 'AUTH_007',
  
  // Validation Errors (2xxx)
  VALIDATION_FAILED = 'VAL_001',
  VALIDATION_EMAIL_INVALID = 'VAL_002',
  VALIDATION_PASSWORD_TOO_SHORT = 'VAL_003',
  VALIDATION_REQUIRED_FIELD = 'VAL_004',
  VALIDATION_FILE_TOO_LARGE = 'VAL_005',
  VALIDATION_FILE_TYPE_INVALID = 'VAL_006',
  
  // Resource Errors (3xxx)
  RESOURCE_NOT_FOUND = 'RES_001',
  RESOURCE_ALREADY_EXISTS = 'RES_002',
  RESOURCE_DELETED = 'RES_003',
  RESOURCE_LOCKED = 'RES_004',
  
  // Permission Errors (4xxx)
  PERMISSION_DENIED = 'PERM_001',
  PERMISSION_INSUFFICIENT_PLAN = 'PERM_002',
  PERMISSION_EVENT_EXPIRED = 'PERM_003',
  
  // Rate Limit Errors (5xxx)
  RATE_LIMIT_EXCEEDED = 'RATE_001',
  RATE_LIMIT_UPLOAD_QUOTA = 'RATE_002',
  
  // Server Errors (6xxx)
  SERVER_ERROR = 'SRV_001',
  SERVER_DATABASE_ERROR = 'SRV_002',
  SERVER_STORAGE_ERROR = 'SRV_003',
  SERVER_EMAIL_ERROR = 'SRV_004',
  SERVER_PROCESSING_ERROR = 'SRV_005',
  
  // External Service Errors (7xxx)
  EXTERNAL_WORDPRESS_ERROR = 'EXT_001',
  EXTERNAL_STORAGE_ERROR = 'EXT_002',
  EXTERNAL_PAYMENT_ERROR = 'EXT_003',
}

// ============================================================================
// Error Response Interface
// ============================================================================

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
  statusCode: number;
  timestamp: string;
  path?: string;
  requestId?: string;
}

export interface ErrorDetail {
  field?: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

// ============================================================================
// Error Response Builder
// ============================================================================

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetail[];
  public readonly timestamp: string;
  public readonly path?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details?: ErrorDetail[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
    };
  }
}

// ============================================================================
// Common Error Factories
// ============================================================================

export const Errors = {
  // Auth Errors
  invalidCredentials: () =>
    new ApiError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      'E-Mail oder Passwort ist ungültig',
      401
    ),

  tokenExpired: () =>
    new ApiError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      'Session abgelaufen. Bitte melde dich erneut an.',
      401
    ),

  unauthorized: () =>
    new ApiError(
      ErrorCode.AUTH_UNAUTHORIZED,
      'Nicht authentifiziert',
      401
    ),

  forbidden: () =>
    new ApiError(
      ErrorCode.AUTH_FORBIDDEN,
      'Keine Berechtigung für diese Aktion',
      403
    ),

  // Validation Errors
  validationFailed: (details: ErrorDetail[]) =>
    new ApiError(
      ErrorCode.VALIDATION_FAILED,
      'Validierung fehlgeschlagen',
      400,
      details
    ),

  fileTooLarge: (maxSize: number) =>
    new ApiError(
      ErrorCode.VALIDATION_FILE_TOO_LARGE,
      `Datei ist zu groß. Maximum: ${maxSize}MB`,
      400
    ),

  fileTypeInvalid: (allowedTypes: string[]) =>
    new ApiError(
      ErrorCode.VALIDATION_FILE_TYPE_INVALID,
      `Dateityp nicht erlaubt. Erlaubt: ${allowedTypes.join(', ')}`,
      400
    ),

  // Resource Errors
  notFound: (resource: string) =>
    new ApiError(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} nicht gefunden`,
      404
    ),

  alreadyExists: (resource: string) =>
    new ApiError(
      ErrorCode.RESOURCE_ALREADY_EXISTS,
      `${resource} existiert bereits`,
      409
    ),

  // Permission Errors
  permissionDenied: (action: string) =>
    new ApiError(
      ErrorCode.PERMISSION_DENIED,
      `Keine Berechtigung für: ${action}`,
      403
    ),

  insufficientPlan: (feature: string) =>
    new ApiError(
      ErrorCode.PERMISSION_INSUFFICIENT_PLAN,
      `Feature nicht in deinem Plan verfügbar: ${feature}`,
      403
    ),

  // Rate Limit Errors
  rateLimitExceeded: (retryAfter?: number) =>
    new ApiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Zu viele Anfragen. Bitte versuche es später erneut.',
      429,
      retryAfter ? [{ message: `Versuche es in ${retryAfter} Sekunden erneut.` }] : undefined
    ),

  // Server Errors
  serverError: (message?: string) =>
    new ApiError(
      ErrorCode.SERVER_ERROR,
      message || 'Interner Serverfehler',
      500
    ),

  databaseError: () =>
    new ApiError(
      ErrorCode.SERVER_DATABASE_ERROR,
      'Datenbankfehler',
      500
    ),

  storageError: () =>
    new ApiError(
      ErrorCode.SERVER_STORAGE_ERROR,
      'Speicherfehler',
      500
    ),
};

// ============================================================================
// Error Type Guards
// ============================================================================

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'statusCode' in error
  );
}

// ============================================================================
// Error Formatter
// ============================================================================

export function formatError(error: unknown): AppError {
  if (isApiError(error)) {
    return error.toJSON();
  }

  if (isAppError(error)) {
    return error;
  }

  // Fallback for unknown errors
  return {
    code: ErrorCode.SERVER_ERROR,
    message: error instanceof Error ? error.message : 'Unknown error',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  };
}
