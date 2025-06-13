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
const startQuestSchema = z.object({
	questId: z.string(),
});

/**
 * @swagger
 * /api/quests:
 *   get:
 *     summary: Get available quests for user
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;

		const quests = await prisma.quest.findMany({
			where: { isActive: true },
			include: {
				userQuests: {
					where: { userId },
				},
			},
			orderBy: { createdAt: "desc" },
		});

		res.json({
			success: true,
			quests: quests.map((quest) => {
				const userQuest = quest.userQuests[0];
				return {
					id: quest.id,
					title: quest.name, // Use name as title
					description: quest.description,
					category: quest.type, // Use type as category
					difficulty: quest.difficulty,
					rewards: `${quest.xpReward} XP, ${quest.tokenReward} tokens`,
					maxProgress: quest.userQuests[0]?.target || 1,
					timeLimit: quest.endDate
						? Math.floor((quest.endDate.getTime() - Date.now()) / 1000)
						: null,
					seasonalTheme: quest.type, // Use type as seasonal theme
					userProgress: userQuest
						? {
								progress: userQuest.progress,
								expiresAt: quest.endDate,
							}
						: null,
					isCompleted: userQuest ? userQuest.isCompleted : false,
					startDate: quest.startDate,
					endDate: quest.endDate,
				};
			}),
		});
	}),
);

/**
 * @swagger
 * /api/quests/{id}/start:
 *   post:
 *     summary: Start a quest
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 */
router.post(
	"/:id/start",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const questId = req.params.id;

		// Check if quest exists
		const quest = await prisma.quest.findUnique({
			where: { id: questId },
		});

		if (!quest) {
			throw new ApiError(404, "Quest not found");
		}

		if (!quest.isActive) {
			throw new ApiError(400, "Quest is not active");
		}

		// Check if user already started this quest
		const existingUserQuest = await prisma.userQuest.findUnique({
			where: {
				userId_questId: {
					userId,
					questId,
				},
			},
		});

		if (existingUserQuest) {
			throw new ApiError(400, "Quest already started");
		}

		// Calculate target progress (default to 1)
		const target = 1;

		// Calculate expiration based on quest end date
		const expiresAt =
			quest.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

		// Create user quest
		const userQuest = await prisma.userQuest.create({
			data: {
				userId,
				questId,
				progress: 0,
				target,
				startedAt: new Date(),
			},
		});

		res.json({
			success: true,
			message: "Quest started successfully",
			quest: {
				id: quest.id,
				title: quest.name,
				description: quest.description,
				progress: 0,
				target,
				expiresAt,
				startedAt: userQuest.startedAt,
			},
		});
	}),
);

/**
 * @swagger
 * /api/quests/{id}/complete:
 *   post:
 *     summary: Complete a quest
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 */
router.post(
	"/:id/complete",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const questId = req.params.id;

		// Find user quest
		const userQuest = await prisma.userQuest.findUnique({
			where: {
				userId_questId: {
					userId,
					questId,
				},
			},
			include: {
				quest: true,
			},
		});

		if (!userQuest) {
			throw new ApiError(404, "Quest not started");
		}

		if (userQuest.isCompleted) {
			throw new ApiError(400, "Quest already completed");
		}

		// Check if quest progress meets target
		if (userQuest.progress < userQuest.target) {
			throw new ApiError(400, "Quest requirements not met");
		}

		// Complete the quest
		const completedQuest = await prisma.userQuest.update({
			where: { id: userQuest.id },
			data: {
				isCompleted: true,
				completedAt: new Date(),
			},
		});

		// Award XP and tokens to user
		await prisma.user.update({
			where: { id: userId },
			data: {
				experience: { increment: userQuest.quest.xpReward },
			},
		});

		res.json({
			success: true,
			message: "Quest completed successfully",
			rewards: {
				xp: userQuest.quest.xpReward,
				tokens: userQuest.quest.tokenReward,
			},
			completedAt: completedQuest.completedAt,
		});
	}),
);

/**
 * @swagger
 * /api/quests/progress:
 *   get:
 *     summary: Get user's quest progress
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/progress",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;

		const userQuests = await prisma.userQuest.findMany({
			where: { userId },
			include: {
				quest: true,
			},
			orderBy: { startedAt: "desc" },
		});

		res.json({
			success: true,
			quests: userQuests.map((userQuest) => ({
				id: userQuest.questId,
				title: userQuest.quest.name,
				description: userQuest.quest.description,
				progress: userQuest.progress,
				target: userQuest.target,
				isCompleted: userQuest.isCompleted,
				completedAt: userQuest.completedAt,
				startedAt: userQuest.startedAt,
				rewards: `${userQuest.quest.xpReward} XP, ${userQuest.quest.tokenReward} tokens`,
				difficulty: userQuest.quest.difficulty,
				category: userQuest.quest.type,
			})),
		});
	}),
);

/**
 * @swagger
 * /api/quests/daily:
 *   get:
 *     summary: Get daily quests
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/daily",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const today = new Date();
		const startOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
		);
		const endOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate() + 1,
		);

		const dailyQuests = await prisma.quest.findMany({
			where: {
				type: "DAILY",
				isActive: true,
				startDate: {
					gte: startOfDay,
					lt: endOfDay,
				},
			},
			include: {
				userQuests: {
					where: { userId },
				},
			},
		});

		res.json({
			success: true,
			quests: dailyQuests.map((quest) => {
				const userQuest = quest.userQuests[0];
				return {
					id: quest.id,
					title: quest.name,
					description: quest.description,
					difficulty: quest.difficulty,
					rewards: `${quest.xpReward} XP, ${quest.tokenReward} tokens`,
					progress: userQuest ? userQuest.progress : 0,
					target: userQuest ? userQuest.target : 1,
					isCompleted: userQuest ? userQuest.isCompleted : false,
					timeRemaining: Math.max(0, endOfDay.getTime() - Date.now()),
				};
			}),
		});
	}),
);

export default router;
