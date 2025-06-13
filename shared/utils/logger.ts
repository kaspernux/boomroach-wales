const logger = {
  error: (message: string, ...args: unknown[]) => console.error(message, ...args),
  warn: (message: string, ...args: unknown[]) => console.warn(message, ...args),
  info: (message: string, ...args: unknown[]) => console.info(message, ...args),
  debug: (message: string, ...args: unknown[]) => console.debug(message, ...args)
}

export { logger }
export default logger

export const logSecurity = (event: string, details: Record<string, unknown>) => {
  logger.warn('SECURITY_EVENT', { event, details, timestamp: new Date().toISOString() })
}

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error('ERROR_OCCURRED', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })
}
