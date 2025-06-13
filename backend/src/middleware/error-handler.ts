import type express from "express";
import { v4 as uuidv4 } from "uuid";
import winston from "winston";

// Custom error classes
export class AppError extends Error {
	statusCode: number;
	isOperational: boolean;
	code?: string;
	details?: any;

	constructor(message: string, statusCode = 500, code?: string, details?: any) {
		super(message);
		this.statusCode = statusCode;
		this.isOperational = true;
		this.code = code;
		this.details = details;

		Error.captureStackTrace(this, this.constructor);
	}
}

export class ValidationError extends AppError {
	field: string;
	value: any;

	constructor(message: string, field: string, value: any) {
		super(message, 400, "VALIDATION_ERROR");
		this.field = field;
		this.value = value;
		this.details = { field, value };
	}
}

export class TradingError extends AppError {
	tradeId?: string;
	engineId?: string;

	constructor(
		message: string,
		statusCode = 400,
		tradeId?: string,
		engineId?: string,
	) {
		super(message, statusCode, "TRADING_ERROR");
		this.tradeId = tradeId;
		this.engineId = engineId;
		this.details = { tradeId, engineId };
	}
}

export class DatabaseError extends AppError {
	query?: string;
	table?: string;

	constructor(message: string, query?: string, table?: string) {
		super(message, 500, "DATABASE_ERROR");
		this.query = query;
		this.table = table;
		this.details = { query, table };
	}
}

export class BlockchainError extends AppError {
	transactionHash?: string;
	network?: string;

	constructor(message: string, transactionHash?: string, network?: string) {
		super(message, 503, "BLOCKCHAIN_ERROR");
		this.transactionHash = transactionHash;
		this.network = network;
		this.details = { transactionHash, network };
	}
}

export class AuthError extends AppError {
	userId?: string;

	constructor(message: string, userId?: string) {
		super(message, 401, "AUTH_ERROR");
		this.userId = userId;
		this.details = { userId };
	}
}

// Winston logger configuration
const logFormat = winston.format.combine(
	winston.format.timestamp(),
	winston.format.errors({ stack: true }),
	winston.format.json(),
	winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
		return JSON.stringify({
			timestamp,
			level,
			message,
			...(stack ? { stack } : {}),
			...meta,
		});
	}),
);

export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: logFormat,
	defaultMeta: { service: "boomroach-api" },
	transports: [
		// Console transport for development
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
				winston.format.printf(({ level, message, timestamp, ...meta }) => {
					return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
				}),
			),
		}),

		// File transports for production
		new winston.transports.File({
			filename: "logs/error.log",
			level: "error",
			maxsize: 5242880, // 5MB
			maxFiles: 5,
		}),

		new winston.transports.File({
			filename: "logs/combined.log",
			maxsize: 5242880, // 5MB
			maxFiles: 10,
		}),
	],

	// Handle exceptions and rejections
	exceptionHandlers: [
		new winston.transports.File({ filename: "logs/exceptions.log" }),
	],
	rejectionHandlers: [
		new winston.transports.File({ filename: "logs/rejections.log" }),
	],
});

// Specialized loggers
export const tradingLogger = {
	logTrade: (trade: any) => {
		logger.info("Trade executed", { type: "trade", trade });
	},
	logEngineStatus: (engineId: string, status: string, data: any) => {
		logger.info("Engine status change", {
			type: "engine",
			engineId,
			status,
			data,
		});
	},
	logOrder: (order: any) => {
		logger.info("Order processed", { type: "order", order });
	},
};

export const blockchainLogger = {
	logTransaction: (transaction: any) => {
		logger.info("Blockchain transaction", { type: "blockchain", transaction });
	},
	logContractCall: (contract: string, method: string, params: any) => {
		logger.info("Smart contract call", {
			type: "contract",
			contract,
			method,
			params,
		});
	},
};

// Request ID middleware
export const requestIdMiddleware = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const requestId = (req.headers["x-request-id"] as string) || uuidv4();

	req.requestId = requestId;
	res.setHeader("X-Request-ID", requestId);

	// Add request ID to logger context
	req.logger = logger.child({ requestId });

	next();
};

// Request logging middleware
export const requestLoggingMiddleware = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const startTime = Date.now();

	// Log incoming request
	req.logger?.info("Incoming request", {
		method: req.method,
		url: req.url,
		userAgent: req.get("User-Agent"),
		ip: req.ip,
		body: req.method === "POST" || req.method === "PUT" ? req.body : undefined,
	});

	// Override res.json to log responses
	const originalJson = res.json;
	res.json = function (body: any) {
		const responseTime = Date.now() - startTime;

		req.logger?.info("Outgoing response", {
			statusCode: res.statusCode,
			responseTime,
			contentLength: JSON.stringify(body).length,
		});

		return originalJson.call(this, body);
	};

	next();
};

// Performance monitoring middleware
export const performanceMiddleware = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	const startTime = process.hrtime.bigint();
	const startMemory = process.memoryUsage();

	res.on("finish", () => {
		const endTime = process.hrtime.bigint();
		const endMemory = process.memoryUsage();

		const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
		const memoryDelta = {
			rss: endMemory.rss - startMemory.rss,
			heapUsed: endMemory.heapUsed - startMemory.heapUsed,
			heapTotal: endMemory.heapTotal - startMemory.heapTotal,
		};

		// Log slow requests (>1 second)
		if (executionTime > 1000) {
			req.logger?.warn("Slow request detected", {
				executionTime,
				memoryDelta,
				method: req.method,
				url: req.url,
			});
		}

		// Add performance headers
		res.setHeader("X-Execution-Time", `${executionTime.toFixed(2)}ms`);
		res.setHeader("X-Memory-Usage", JSON.stringify(memoryDelta));
	});

	next();
};

// Error handling middleware
export const errorHandler = (
	error: Error | AppError,
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
) => {
	// Default error values
	let statusCode = 500;
	let message = "Internal Server Error";
	let code = "INTERNAL_ERROR";
	let details: any = undefined;

	// Handle custom errors
	if (error instanceof AppError) {
		statusCode = error.statusCode;
		message = error.message;
		code = error.code || "APP_ERROR";
		details = error.details;
	}

	// Handle Prisma errors
	if (error.name === "PrismaClientKnownRequestError") {
		statusCode = 400;
		message = "Database operation failed";
		code = "DATABASE_ERROR";
		details = { prismaCode: (error as any).code };
	}

	// Handle validation errors
	if (error.name === "ValidationError") {
		statusCode = 400;
		message = error.message;
		code = "VALIDATION_ERROR";
	}

	// Log error with request context
	const errorLog = {
		error: {
			message: error.message,
			name: error.name,
			stack: error.stack,
			code,
			details,
		},
		request: {
			method: req.method,
			url: req.url,
			userAgent: req.get("User-Agent"),
			ip: req.ip,
			requestId: req.requestId,
		},
		response: {
			statusCode,
		},
	};

	if (statusCode >= 500) {
		req.logger?.error("Server error", errorLog);
	} else {
		req.logger?.warn("Client error", errorLog);
	}

	// Send error response
	const errorResponse: any = {
		error: {
			message,
			code,
			statusCode,
			requestId: req.requestId,
			timestamp: new Date().toISOString(),
		},
	};

	// Add details in development
	if (process.env.NODE_ENV === "development") {
		errorResponse.error.details = details;
		errorResponse.error.stack = error.stack;
	}

	res.status(statusCode).json(errorResponse);
};

// Health check with monitoring
export const healthCheckWithMonitoring = (
	req: express.Request,
	res: express.Response,
) => {
	const health = {
		status: "healthy",
		timestamp: new Date().toISOString(),
		version: "3.0.0",
		environment: process.env.NODE_ENV || "development",
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		requestId: req.requestId,
	};

	req.logger?.info("Health check requested", { health });
	res.json(health);
};

// Async wrapper for route handlers
export const asyncWrapper = (fn: Function) => {
	return (
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
	) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
};

// Create error functions
export const createValidationError = (
	message: string,
	field: string,
	value: any,
) => {
	return new ValidationError(message, field, value);
};

export const createTradingError = (
	message: string,
	statusCode?: number,
	tradeId?: string,
	engineId?: string,
) => {
	return new TradingError(message, statusCode, tradeId, engineId);
};

export const createDatabaseError = (
	message: string,
	query?: string,
	table?: string,
) => {
	return new DatabaseError(message, query, table);
};

export const createBlockchainError = (
	message: string,
	transactionHash?: string,
	network?: string,
) => {
	return new BlockchainError(message, transactionHash, network);
};

export const createAuthError = (message: string, userId?: string) => {
	return new AuthError(message, userId);
};

// Extend Express Request interface

export default {
	AppError,
	ValidationError,
	TradingError,
	DatabaseError,
	BlockchainError,
	AuthError,
	logger,
	tradingLogger,
	blockchainLogger,
	requestIdMiddleware,
	requestLoggingMiddleware,
	performanceMiddleware,
	errorHandler,
	healthCheckWithMonitoring,
	asyncWrapper,
	createValidationError,
	createTradingError,
	createDatabaseError,
	createBlockchainError,
	createAuthError,
};
