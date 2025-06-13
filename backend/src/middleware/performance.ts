import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import logger from "../../../shared/utils/logger";

declare global {
	namespace Express {
		interface Request {
			requestId: string;
			startTime?: number;
			logger?: any;
		}
	}
}

export const requestIdMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	req.requestId = uuidv4();
	res.setHeader("X-Request-ID", req.requestId);
	next();
};

export const performanceMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	req.startTime = Date.now();

	const originalSend = res.send;
	res.send = function (data) {
		const duration = Date.now() - (req.startTime || Date.now());
		logger.info(
			`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.requestId}`,
		);
		return originalSend.call(this, data);
	};

	next();
};
