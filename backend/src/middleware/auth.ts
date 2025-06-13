import { PrismaClient } from "@prisma/client";
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../../../shared/utils/logger'
import { ApiError } from '../../../shared/utils/errors'

const prisma = new PrismaClient();

// JWT payload interface
interface JWTPayload {
  id: string;
  username: string;
  walletAddress: string;
  level: number;
  isAdmin: boolean;
  isVerified: boolean;
  isEmailVerified?: boolean;
  isWalletConnected?: boolean;
  email?: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request interface
export interface AuthenticatedRequest extends Request {
  headers: Request['headers']
  user?: {
    id: string
    username: string
    email?: string
    walletAddress: string
    level: number
    isAdmin: boolean
    isEmailVerified: boolean
    isWalletConnected: boolean
    isVerified?: boolean
  }
  session?: {
    id: string
    token: string
  }
}

// Async JWT authentication middleware (fetches user from DB)
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Access token required",
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        walletAddress: true,
        level: true,
        isAdmin: true,
        isEmailVerified: true,
        isWalletConnected: true,
        isBanned: true,
        isVerified: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        error: "Account is banned",
      });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
      walletAddress: user.walletAddress,
      level: user.level,
      isAdmin: user.isAdmin,
      isEmailVerified: user.isEmailVerified,
      isWalletConnected: user.isWalletConnected,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: "Invalid token",
      });
      return;
    }
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Synchronous JWT authentication middleware (does not fetch user from DB)
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(' ')[1]

    if (!token) {
      res.status(401).json({ error: 'Access token required' })
      return
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new ApiError(500, 'JWT secret not configured')
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      walletAddress: decoded.walletAddress,
      level: decoded.level,
      isAdmin: decoded.isAdmin,
      isEmailVerified: decoded.isEmailVerified ?? false,
      isWalletConnected: decoded.isWalletConnected ?? false,
      isVerified: decoded.isVerified
    }

    next()
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' })
      return
    }

    logger.error('Authentication error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Require admin middleware
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin privileges required' })
    return
  }

  next()
}

// Require verified account middleware
export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  if (!req.user.isVerified) {
    res.status(403).json({ error: 'Account verification required' })
    return
  }

  next()
}

// Require minimum level middleware
export const requireLevel = (minLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (req.user.level < minLevel) {
      res.status(403).json({
        error: `Level ${minLevel} required`,
        currentLevel: req.user.level,
        requiredLevel: minLevel
      })
      return
    }

    next()
  }
}
    if (!jwtSecret) {
      throw new ApiError(500, 'JWT secret not configured')
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      id: string
      username: string
      walletAddress: string
      level: number
      isAdmin: boolean
      isVerified: boolean
      isEmailVerified?: boolean
      isWalletConnected?: boolean
      email?: string
    }
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      walletAddress: decoded.walletAddress,
      level: decoded.level,
      isAdmin: decoded.isAdmin,
      isEmailVerified: decoded.isEmailVerified ?? false,
      isWalletConnected: decoded.isWalletConnected ?? false,
      isVerified: decoded.isVerified
    }

    next()
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' })
      return
    }

    logger.error('Authentication error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin privileges required' })
    return
  }

  next()
}

export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  if (!req.user.isVerified) {
    res.status(403).json({ error: 'Account verification required' })
    return
  }

  next()
}

export const requireLevel = (minLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (req.user.level < minLevel) {
      res.status(403).json({
        error: `Level ${minLevel} required`,
        currentLevel: req.user.level,
        requiredLevel: minLevel
      })
      return
    }

    next()
  }
}

// Extend Express Request interface
export interface AuthenticatedRequest extends Request {
  headers: Request['headers']
  user?: {
    id: string
    username: string
    email?: string
    walletAddress: string
    level: number
    isAdmin: boolean
    isEmailVerified: boolean
    isWalletConnected: boolean
    isVerified?: boolean // add this if you use isVerified elsewhere
  }
  session?: {
    id: string
    token: string
  }
}



