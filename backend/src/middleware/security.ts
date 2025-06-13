import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import cors from 'cors';
import { body, param, query, validationResult } from 'express-validator';
import { ApiError } from '../../../shared/utils/errors';
import { logger } from '../../../shared/utils/logger';

// --- SECURITY CORS ---
export const corsOptions = {
	origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
		const allowedOrigins = [
			'http://localhost:3000', // Development frontend
			'http://localhost:3001', // Development API
			'https://boomroach.vercel.app', // Production frontend
			'https://app.boomroach.wales', // Production domain
			'https://boomroach.wales', // Main domain
		];

		// Allow requests with no origin (mobile apps, Postman, etc.)
		if (!origin) return callback(null, true);

		if (allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			logger.warn('CORS blocked request', { origin, userAgent: 'unknown' });
			callback(new Error('Not allowed by CORS'), false);
		}
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	allowedHeaders: [
		'Origin',
		'X-Requested-With',
		'Content-Type',
		'Accept',
		'Authorization',
		'X-API-Key',
		'X-CSRF-Token',
		'X-Request-ID',
	],
	exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
	maxAge: 86400, // 24 hours
	optionsSuccessStatus: 204,
};

// --- SECURITY HELMET ---
export const helmetOptions = {
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
			fontSrc: ["'self'", 'https://fonts.gstatic.com'],
			imgSrc: ["'self'", 'data:', 'https:'],
			scriptSrc: ["'self'"],
			connectSrc: ["'self'", 'wss:', 'https:'],
			frameSrc: ["'none'"],
			objectSrc: ["'none'"],
			baseUri: ["'self'"],
			formAction: ["'self'"],
		},
	},
	crossOriginEmbedderPolicy: false, // For WebSocket compatibility
	crossOriginResourcePolicy: { policy: "same-origin" },
	hsts: {
		maxAge: 31536000, // 1 year
		includeSubDomains: true,
		preload: true,
	},
	referrerPolicy: { policy: "no-referrer" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    expectCt: { maxAge: 86400, enforce: true },
    noSniff: true,
    frameguard: { action: "deny" },
    xssFilter: true,
};

// --- RATE LIMITING ---
export const rateLimiters = {
	// General API rate limiting
	general: rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 1000, // 1000 requests per window
		message: {
			error: 'Too many requests from this IP, please try again later.',
			retryAfter: '15 minutes',
		},
		standardHeaders: true,
		legacyHeaders: false,
		handler: (req, res) => {
			logger.warn('Rate limit exceeded - General', {
				ip: req.ip,
				userAgent: req.get('User-Agent'),
				path: req.path,
			});
			res.status(429).json({
				success: false,
				error: 'Too many requests, please try again later.',
				retryAfter: 900,
			});
		},
	}),

	// Authentication rate limiting (stricter)
	auth: rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 10, // 10 attempts per window
		skipSuccessfulRequests: true,
		message: {
			error: 'Too many authentication attempts, please try again later.',
			retryAfter: '15 minutes',
		},
		handler: (req, res) => {
			logger.warn('Rate limit exceeded - Authentication', {
				ip: req.ip,
				userAgent: req.get('User-Agent'),
				path: req.path,
			});
			res.status(429).json({
				success: false,
				error: 'Too many authentication attempts, account temporarily locked.',
				retryAfter: 900,
			});
		},
	}),

	// Trading operations rate limiting
	trading: rateLimit({
		windowMs: 60 * 1000, // 1 minute
		max: 100, // 100 trading operations per minute
		message: {
			error: 'Trading rate limit exceeded, please slow down.',
			retryAfter: '1 minute',
		},
		handler: (req, res) => {
			logger.warn('Rate limit exceeded - Trading', {
				ip: req.ip,
				userAgent: req.get('User-Agent'),
				path: req.path,
			});
			res.status(429).json({
				success: false,
				error: 'Trading operations rate limit exceeded.',
				retryAfter: 60,
			});
		},
	}),

	// ML/AI operations rate limiting
	ml: rateLimit({
		windowMs: 60 * 1000, // 1 minute
		max: 50, // 50 ML requests per minute
		message: {
			error: 'ML operations rate limit exceeded.',
			retryAfter: '1 minute',
		},
		handler: (req, res) => {
			logger.warn('Rate limit exceeded - ML Operations', {
				ip: req.ip,
				userAgent: req.get('User-Agent'),
				path: req.path,
			});
			res.status(429).json({
				success: false,
				error: 'ML operations rate limit exceeded.',
				retryAfter: 60,
			});
		},
	}),

	// Admin operations rate limiting (very strict)
	admin: rateLimit({
		windowMs: 60 * 1000, // 1 minute
		max: 20, // 20 admin operations per minute
		message: {
			error: 'Admin operations rate limit exceeded.',
			retryAfter: '1 minute',
		},
		handler: (req, res) => {
			logger.warn('Rate limit exceeded - Admin Operations', {
				ip: req.ip,
				userAgent: req.get('User-Agent'),
				path: req.path,
			});
			res.status(429).json({
				success: false,
				error: 'Admin operations rate limit exceeded.',
				retryAfter: 60,
			});
		},
	}),
};

// --- SLOW DOWN ---
export const speedLimiter = slowDown({
	windowMs: 15 * 60 * 1000, // 15 minutes
	delayAfter: 500, // Allow 500 requests per window at full speed
	delayMs: () => 100, // Add 100ms delay after delayAfter is reached (v2 format)
	maxDelayMs: 2000, // Maximum delay of 2 seconds
	validate: { delayMs: false }, // Disable warning
});

// --- SANITIZATION ---
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
	const sanitizeValue = (value: any): any => {
		if (typeof value === 'string') {
			// Remove potential XSS patterns
			return value
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/vbscript:/gi, '')
			.replace(/onload\s*=/gi, '')
			.replace(/onerror\s*=/gi, '')
			.replace(/<.*?on\w+\s*=\s*['"].*?['"].*?>/gi, '')
			.replace(/<iframe.*?>.*?<\/iframe>/gi, '')
			.replace(/<object.*?>.*?<\/object>/gi, '')
			.replace(/<embed.*?>.*?<\/embed>/gi, '')
			.trim();
		}
		if (typeof value === 'object' && value !== null) {
			const sanitized: any = Array.isArray(value) ? [] : {};
			for (const key in value) {
				sanitized[key] = sanitizeValue(value[key]);
			}
			return sanitized;
		}
		return value;
	};

	if (req.body) req.body = sanitizeValue(req.body);
	if (req.query) req.query = sanitizeValue(req.query);
	if (req.params) req.params = sanitizeValue(req.params);

	next();
};

// --- VALIDATION ---
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const errorMessages = errors.array().map(error => ({
			field: error.type === 'field' ? error.path : 'unknown',
			message: error.msg,
			value: error.type === 'field' ? error.value : undefined,
		}));

		logger.warn('Request validation failed', {
			ip: req.ip,
			path: req.path,
			errors: errorMessages,
		});

		return res.status(400).json({
			success: false,
			error: 'Validation failed',
			details: errorMessages,
		});
	}
	next();
};

// --- HEADERS ---
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
	// Remove server information
	res.removeHeader('X-Powered-By');

	// Add custom security headers
	res.set({
		'X-Content-Type-Options': 'nosniff',
		'X-Frame-Options': 'DENY',
		'X-XSS-Protection': '1; mode=block',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
		'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
	});

	next();
};

// --- IP WHITELIST ---
export const ipWhitelist = (allowedIPs: string[] = []) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const clientIP = req.ip || req.connection.remoteAddress || '';

		// In development, allow localhost
		if (process.env.NODE_ENV === 'development') {
			const devIPs = ['127.0.0.1', '::1', 'localhost'];
			if (devIPs.some(ip => clientIP.includes(ip))) {
				return next();
			}
		}

		if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
			logger.warn('IP access denied', {
				ip: clientIP,
				path: req.path,
				userAgent: req.get('User-Agent'),
			});

			return res.status(403).json({
				success: false,
				error: 'Access denied from this IP address',
			});
		}

		next();
	};
};

// --- API KEY ---
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.get('X-API-Key');
    const validApiKeys = process.env.API_KEYS?.split(',') || [];
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'API key required',
        });
    }
    if (!/^[A-Za-z0-9\-_]{32,}$/.test(apiKey)) {
        logger.warn('Malformed API key attempt', {
            ip: req.ip,
            apiKey: apiKey.substring(0, 8) + '...',
            path: req.path,
        });
        return res.status(401).json({
            success: false,
            error: 'Malformed API key',
        });
    }
    if (!validApiKeys.includes(apiKey)) {
        logger.warn('Invalid API key attempt', {
            ip: req.ip,
            apiKey: apiKey.substring(0, 8) + '...',
            path: req.path,
        });
        return res.status(401).json({
            success: false,
            error: 'Invalid API key',
        });
    }
    next();
};

// --- LOGGING ---
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
	const startTime = Date.now();
	const requestId = res.get('X-Request-ID');

	res.on('finish', () => {
		const duration = Date.now() - startTime;
		const logData = {
			requestId,
			method: req.method,
			url: req.url,
			status: res.statusCode,
			duration,
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			contentLength: res.get('Content-Length'),
		};

		if (res.statusCode >= 400) {
			logger.warn('HTTP Error Response', logData);
		} else {
			logger.info('HTTP Request', logData);
		}
	});

	next();
};

// --- VALIDATION RULES ---
export const validationRules = {
    email: body('email').isEmail().normalizeEmail(),
    password: body('password')
        .isLength({ min: 12, max: 128 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/)
        .withMessage('Password must be at least 12 chars, include upper, lower, number, and special char.'),
    username: body('username').isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
    walletAddress: body('walletAddress').isLength({ min: 32, max: 44 }).matches(/^[A-Za-z0-9]+$/),
    amount: body('amount').isFloat({ min: 0.000001 }),
    price: body('price').isFloat({ min: 0.000001 }),
    symbol: body('symbol').isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9/]+$/),
    id: param('id').isUUID().withMessage('Invalid ID format'),
    mongoId: param('id').isMongoId().withMessage('Invalid MongoDB ID format'),
    pagination: {
        page: query('page').optional().isInt({ min: 1 }).toInt(),
        limit: query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    },
};

export default {
	corsOptions,
	helmetOptions,
	rateLimiters,
	speedLimiter,
	sanitizeInput,
	validateRequest,
	securityHeaders,
	ipWhitelist,
	validateApiKey,
	requestLogger,
	validationRules,
};
