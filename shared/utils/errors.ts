export class ApiError extends Error {
  public statusCode: number
  public details?: Record<string, unknown>

  constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, validationErrors?: Record<string, unknown>[]) {
    super(400, message, { validationErrors })
  }
}

export const createErrorResponse = (
  error: ApiError,
  url: string,
  method: string,
  includeStack = false
) => {
  return {
    error: error.message,
    statusCode: error.statusCode,
    timestamp: new Date().toISOString(),
    path: url,
    method,
    ...(includeStack && { stack: error.stack }),
    ...(error.details && { details: error.details })
  }
}

export const isOperationalError = (error: Error): boolean => {
  return error instanceof ApiError
}

export const ERROR_CODES = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_INPUT: 'INVALID_INPUT',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PRICE_FEED_ERROR: 'PRICE_FEED_ERROR',
  SOLANA_RPC_ERROR: 'SOLANA_RPC_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
}
