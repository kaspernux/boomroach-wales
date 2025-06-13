import { PrismaClient } from "@prisma/client";
import express from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { asyncWrapper } from "../middleware/error-handler";
import { ApiError } from "../../../shared/utils/errors";
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';


const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

/**
 * @swagger
 * /api/achievements:
 *   get:
 *     summary: Get all achievements with user progress
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;

		const achievements = await prisma.achievement.findMany({
			where: { isActive: true },
			include: {
				userAchievements: {
					where: { userId },
				},
			},
			orderBy: [{ rarity: "desc" }, { createdAt: "asc" }],
		});

		res.json({
			success: true,
			achievements: achievements.map((achievement) => {
				const userAchievement = achievement.userAchievements[0];
				return {
					id: achievement.id,
					name: achievement.name,
					description: achievement.description,
					icon: achievement.icon,
					type: achievement.type,
					rarity: achievement.rarity,
					requirements: achievement.description, // Use description as requirements
					rewards: `${achievement.xpReward} XP, ${achievement.tokenReward} tokens`,
					userProgress: userAchievement
						? {
								progress: 1,
								maxProgress: 1,
								isUnlocked: true,
								unlockedAt: userAchievement.unlockedAt,
							}
						: {
								progress: 0,
								maxProgress: 1,
								isUnlocked: false,
								unlockedAt: null,
							},
				};
			}),
		});
	}),
);

/**
 * @swagger
 * /api/achievements/unlocked:
 *   get:
 *     summary: Get user's unlocked achievements
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/unlocked",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;

		const unlockedAchievements = await prisma.userAchievement.findMany({
			where: {
				userId,
			},
			include: {
				achievement: true,
			},
			orderBy: { unlockedAt: "desc" },
		});

		res.json({
			success: true,
			achievements: unlockedAchievements.map((ua) => ({
				id: ua.achievementId,
				name: ua.achievement.name,
				description: ua.achievement.description,
				icon: ua.achievement.icon,
				type: ua.achievement.type,
				rarity: ua.achievement.rarity,
				rewards: `${ua.achievement.xpReward} XP, ${ua.achievement.tokenReward} tokens`,
				unlockedAt: ua.unlockedAt,
			})),
		});
	}),
);

/**
 * @swagger
 * /api/achievements/progress:
 *   get:
 *     summary: Get achievements in progress
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/progress",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;

		// Get all achievements and check user progress
		const achievements = await prisma.achievement.findMany({
			where: { isActive: true },
			include: {
				userAchievements: {
					where: { userId },
				},
			},
		});

		// Filter for achievements with progress but not unlocked
		const progressAchievements = achievements.filter((achievement) => {
			const userAchievement = achievement.userAchievements[0];
			return !userAchievement; // Not unlocked yet, but could have progress
		});

		res.json({
			success: true,
			achievements: progressAchievements.map((achievement) => ({
				id: achievement.id,
				name: achievement.name,
				description: achievement.description,
				icon: achievement.icon,
				type: achievement.type,
				rarity: achievement.rarity,
				progress: 0,
				maxProgress: 1,
				progressPercent: 0,
			})),
		});
	}),
);

/**
 * @swagger
 * /api/achievements/{id}/unlock:
 *   post:
 *     summary: Unlock an achievement (for testing/admin)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 */
router.post(
	"/:id/unlock",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const achievementId = req.params.id;

		// Check if achievement exists
		const achievement = await prisma.achievement.findUnique({
			where: { id: achievementId },
		});

		if (!achievement) {
			throw new ApiError(404, "Achievement not found");
		}

		// Check if user already has this achievement
		const existingUserAchievement = await prisma.userAchievement.findUnique({
			where: {
				userId_achievementId: {
					userId,
					achievementId,
				},
			},
		});

		if (existingUserAchievement) {
			throw new ApiError(400, "Achievement already unlocked");
		}

		// Create user achievement
		const userAchievement = await prisma.userAchievement.create({
			data: {
				userId,
				achievementId,
				unlockedAt: new Date(),
			},
		});

		// Award XP rewards
		if (achievement.xpReward > 0) {
			await prisma.user.update({
				where: { id: userId },
				data: {
					experience: { increment: achievement.xpReward },
				},
			});
		}

		// Note: Token rewards would need to be handled by a separate token system
		// if achievement.tokenReward > 0, implement token awarding logic here

		res.json({
			success: true,
			message: "Achievement unlocked successfully",
			achievement: {
				id: achievement.id,
				name: achievement.name,
				rewards: `${achievement.xpReward} XP, ${achievement.tokenReward} tokens`,
			},
		});
	}),
);

/**
 * @swagger
 * /api/achievements/stats:
 *   get:
 *     summary: Get achievement statistics
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/stats",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;

		const [totalAchievements, unlockedCount] = await Promise.all([
			prisma.achievement.count({ where: { isActive: true } }),
			prisma.userAchievement.count({
				where: { userId },
			}),
		]);

		// Get unlocked achievements by rarity
		const unlockedAchievements = await prisma.userAchievement.findMany({
			where: { userId },
			include: {
				achievement: {
					select: {
						rarity: true,
					},
				},
			},
		});

		// Count by rarity
		const rarityStats = {
			COMMON: 0,
			RARE: 0,
			EPIC: 0,
			LEGENDARY: 0,
		};

		unlockedAchievements.forEach((ua) => {
			const rarity = ua.achievement.rarity as keyof typeof rarityStats;
			if (rarityStats[rarity] !== undefined) {
				rarityStats[rarity]++;
			}
		});

		const progressCount = 0; // Since we don't track progress in the schema

		res.json({
			success: true,
			stats: {
				total: totalAchievements,
				unlocked: unlockedCount,
				inProgress: progressCount,
				locked: totalAchievements - unlockedCount,
				completionRate:
					totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0,
				byRarity: rarityStats,
			},
		});
	}),
);

/**
 * @swagger
 * /api/achievements/leaderboard:
 *   get:
 *     summary: Get achievements leaderboard
 *     tags: [Achievements]
 */
router.get(
	"/leaderboard",
	asyncWrapper(async (req, res) => {
		const topUsers = await prisma.user.findMany({
			select: {
				id: true,
				username: true,
				avatar: true,
				level: true,
				achievements: {
					include: {
						achievement: {
							select: {
								rarity: true,
							},
						},
					},
				},
			},
			orderBy: {
				experience: "desc",
			},
			take: 10,
		});

		res.json({
			success: true,
			leaderboard: topUsers.map((user, index) => ({
				rank: index + 1,
				username: user.username,
				avatar: user.avatar,
				level: user.level,
				achievementCount: user.achievements.length,
				rareAchievements: user.achievements.filter(
					(a) =>
						a.achievement.rarity === "EPIC" ||
						a.achievement.rarity === "LEGENDARY",
				).length,
			})),
		});
	}),
);

export default router;
