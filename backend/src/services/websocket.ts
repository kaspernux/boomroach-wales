import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import logger from "../../../shared/utils/logger";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.prisma = new PrismaClient();
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info("🔗 Real-time WebSocket service initialized");
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) return next(new Error('Authentication required'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "demo-secret-key") as any;
        const user = await this.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return next(new Error('User not found'));
        socket.userId = user.id;
        socket.username = user.username;
        socket.userRole = user.isEmailVerified ? 'verified' : 'unverified';
        next();
      } catch (error) {
        logger.error("WebSocket authentication error:", error);
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`🔗 User connected: ${socket.username} (${socket.userId})`);
      if (socket.userId) this.connectedUsers.set(socket.userId, socket);

      // Exemples d'abonnements
      socket.on('subscribe:prices', (symbols: string[]) => {
        socket.join('price-updates');
      });
      socket.on('subscribe:engines', () => {
        socket.join('engine-updates');
      });
      socket.on('subscribe:portfolio', () => {
        if (socket.userId) socket.join(`portfolio-${socket.userId}`);
      });
      socket.on('subscribe:chat', (channel: string) => {
        socket.join(`chat-${channel}`);
      });
      socket.on('subscribe:signals', () => {
        socket.join('signal-subscribers');
      });
      socket.on('subscribe:community', () => {
        socket.join('community-updates');
      });
      socket.on('subscribe:trading', () => {
        socket.join('trading-updates');
      });
      socket.on('disconnect', () => {
        logger.info(`🔗 User disconnected: ${socket.username}`);
        if (socket.userId) this.connectedUsers.delete(socket.userId);
      });
    });
  }

  // Méthodes de broadcast unifiées
  public broadcastSignal(signal: any) {
    this.io.to('signal-subscribers').emit('trading:signal', signal);
  }
  public broadcastEngineStatus(status: any) {
    this.io.to('engine-updates').emit('engines:status', status);
  }
  public broadcastPriceUpdate(prices: any) {
    this.io.to('price-updates').emit('prices:update', prices);
  }
  public broadcastPortfolioUpdate(userId: string, portfolio: any) {
    this.io.to(`portfolio-${userId}`).emit('portfolio:update', portfolio);
  }
  public broadcastChat(channel: string, message: any) {
    this.io.to(`chat-${channel}`).emit('chat:message', message);
  }
  public broadcastCommunityUpdate(community: any) {
    this.io.to('community-updates').emit('community:update', community);
  }
  public broadcastTradingUpdate(trading: any) {
    this.io.to('trading-updates').emit('trading:update', trading);
  }
}
