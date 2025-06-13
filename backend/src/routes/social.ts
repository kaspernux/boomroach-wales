import { PrismaClient } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';
import { asyncWrapper } from "../middleware/error-handler";
import { ApiError } from "../../../shared/utils/errors";

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// Validation schemas
const messageSchema = z.object({
	content: z.string().min(1).max(500),
	channelId: z.string().optional(),
});

const updateProfileSchema = z.object({
	username: z.string().min(3).max(50).optional(),
	avatar: z.string().url().optional(),
});

const searchSchema = z.object({
	query: z.string().min(1).max(100),
});

/**
 * @swagger
 * /api/social/messages:
 *   get:
 *     summary: Get messages from a channel or direct messages
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/messages",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const { channelId, receiverId, page = 1, limit = 50 } = req.query;

		let whereClause: any = {};

		if (channelId) {
			// Channel messages
			whereClause = { channelId: channelId as string };
		} else {
			// For direct messages, we'll just get messages from the user
			// Since the Message model only has userId, not senderId/receiverId
			whereClause = { userId };
		}

		const messages = await prisma.message.findMany({
			where: whereClause,
			include: {
				user: {
					select: {
						id: true,
						username: true,
						avatar: true,
						level: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
			take: Number(limit),
			skip: (Number(page) - 1) * Number(limit),
		});

		res.json({
			success: true,
			messages: messages.map((message) => ({
				id: message.id,
				content: message.content,
				channelId: message.channelId,
				channel: message.channel,
				userId: message.userId,
				user: message.user,
				createdAt: message.createdAt,
				editedAt: message.editedAt,
			})),
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total: messages.length,
			},
		});
	}),
);

/**
 * @swagger
 * /api/social/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 */
router.post(
	"/messages",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const validatedData = messageSchema.parse(req.body);

		// Create message
		const message = await prisma.message.create({
			data: {
				userId,
				content: validatedData.content,
				channel: validatedData.channelId ? "GUILD" : "GENERAL",
				channelId: validatedData.channelId,
			},
			include: {
				user: {
					select: {
						id: true,
						username: true,
						avatar: true,
						level: true,
					},
				},
			},
		});

		res.status(201).json({
			success: true,
			message: {
				id: message.id,
				content: message.content,
				channel: message.channel,
				channelId: message.channelId,
				userId: message.userId,
				user: message.user,
				createdAt: message.createdAt,
			},
		});
	}),
);

/**
 * @swagger
 * /api/social/profile:
 *   get:
 *     summary: Get user's social profile
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/profile",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				username: true,
				avatar: true,
				level: true,
				experience: true,
				totalTrades: true,
				totalPnL: true,
				createdAt: true,
				achievements: {
					include: {
						achievement: true,
					},
				},
				guildMemberships: {
					include: {
						guild: true,
					},
				},
			},
		});

		if (!user) {
			throw new ApiError(404, "User not found");
		}

		res.json({
			success: true,
			profile: {
				id: user.id,
				username: user.username,
				avatar: user.avatar,
				level: user.level,
				experience: user.experience,
				totalTrades: user.totalTrades,
				totalPnL: user.totalPnL,
				joinedAt: user.createdAt,
				achievements: user.achievements.length,
				guild: user.guildMemberships[0]?.guild || null,
				stats: {
					messagesCount: await prisma.message.count({ where: { userId } }),
					achievementsUnlocked: user.achievements.length,
					questsCompleted: await prisma.userQuest.count({
						where: { userId, isCompleted: true },
					}),
				},
			},
		});
	}),
);

/**
 * @swagger
 * /api/social/profile:
 *   put:
 *     summary: Update user's social profile
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 */
router.put(
	"/profile",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const validatedData = updateProfileSchema.parse(req.body);

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: validatedData,
			select: {
				id: true,
				username: true,
				avatar: true,
				level: true,
				experience: true,
			},
		});

		res.json({
			success: true,
			profile: updatedUser,
		});
	}),
);

/**
 * @swagger
 * /api/social/users/search:
 *   get:
 *     summary: Search for users
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/users/search",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const { query } = searchSchema.parse(req.query);

		const users = await prisma.user.findMany({
			where: {
				username: {
					contains: query,
				},
			},
			select: {
				id: true,
				username: true,
				avatar: true,
			},
			take: 20,
		});

		res.json({
			success: true,
			users,
		});
	}),
);

/**
 * @swagger
 * /api/social/leaderboard:
 *   get:
 *     summary: Get social leaderboard
 *     tags: [Social]
 */
router.get(
	"/leaderboard",
	asyncWrapper(async (req, res) => {
		const { type = "experience", limit = 10 } = req.query;

		let orderBy: any = { experience: "desc" };

		switch (type) {
			case "trades":
				orderBy = { totalTrades: "desc" };
				break;
			case "pnl":
				orderBy = { totalPnL: "desc" };
				break;
			case "level":
				orderBy = { level: "desc" };
				break;
			default:
				orderBy = { experience: "desc" };
		}

		const users = await prisma.user.findMany({
			select: {
				id: true,
				username: true,
				avatar: true,
				level: true,
				experience: true,
				totalTrades: true,
				totalPnL: true,
			},
			orderBy,
			take: Number(limit),
		});

		res.json({
			success: true,
			leaderboard: users.map((user, index) => ({
				rank: index + 1,
				...user,
			})),
		});
	}),
);

/**
 * @swagger
 * /api/social/stats:
 *   get:
 *     summary: Get community statistics
 *     tags: [Social]
 */
router.get(
	"/stats",
	asyncWrapper(async (req, res) => {
		const [totalUsers, totalMessages, activeUsers, totalGuilds] =
			await Promise.all([
				prisma.user.count(),
				prisma.message.count(),
				prisma.user.count({
					where: {
						lastLoginAt: {
							gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
						},
					},
				}),
				prisma.guild.count({ where: { isActive: true } }),
			]);

		res.json({
			success: true,
			stats: {
				totalUsers,
				totalMessages,
				activeUsers,
				totalGuilds,
				averageLevel: 5.2, // Mock data
				totalTrades: 12543, // Mock data
				totalVolume: 2847293.45, // Mock data
			},
		});
	}),
);

/**
 * @swagger
 * /api/social/channels/{channelId}/messages:
 *   get:
 *     summary: Get messages from a specific channel
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/channels/:channelId/messages",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const { channelId } = req.params;
		const { page = 1, limit = 50 } = req.query;

		const messages = await prisma.message.findMany({
			where: { channelId },
			include: {
				user: {
					select: {
						id: true,
						username: true,
						avatar: true,
						level: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
			take: Number(limit),
			skip: (Number(page) - 1) * Number(limit),
		});

		res.json({
			success: true,
			messages: messages.map((message) => ({
				id: message.id,
				content: message.content,
				userId: message.userId,
				user: message.user,
				createdAt: message.createdAt,
				editedAt: message.editedAt,
			})),
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total: messages.length,
			},
		});
	}),
);

export default router;
