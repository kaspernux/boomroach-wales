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

// Zod schema aligned with prisma model
const updateProfileSchema = z.object({
	username: z.string().min(3).max(20).optional(),
	email: z.string().email().optional(),
	displayName: z.string().max(50).optional(),
	avatar: z.string().url().optional(),
	bio: z.string().max(500).optional(),
  });

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/profile",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
	  const userId = req.user!.id;
	  const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
		  socialProfile: true,
		  portfolio: true,
		},
	  });
	  if (!user) throw new ApiError(404, "User not found");
  
	  res.json({
		success: true,
		user: {
		  id: user.id,
		  username: user.username,
		  email: user.email,
		  displayName: user.displayName,
		  avatar: user.avatar,
		  bio: user.bio,
		  xp: user.xp,
		  level: user.level,
		  totalTrades: user.totalTrades,
		  totalPnL: user.totalPnL,
		  isVerified: user.isEmailVerified,
		  isAdmin: user.isAdmin,
		  joinedAt: user.createdAt,
		  lastLoginAt: user.lastLoginAt,
		  walletConnected: user.isWalletConnected,
		},
	  });
	})
  );
  

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put(
	"/profile",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
	  const userId = req.user!.id;
	  const data = updateProfileSchema.parse(req.body);
  
	  const updatedUser = await prisma.user.update({
		where: { id: userId },
		data,
		include: { socialProfile: true },
	  });
  
	  res.json({
		success: true,
		user: {
		  id: updatedUser.id,
		  username: updatedUser.username,
		  email: updatedUser.email,
		  displayName: updatedUser.displayName,
		  avatar: updatedUser.avatar,
		  bio: updatedUser.bio,
		},
	  });
	})
  );
  

// GAMIFICATION
// ============================================

	/**
	 * @swagger
	 * /api/users/achievements:
	 *   get:
	 *     summary: Get user achievements
	 *     tags: [Users]
	 *     security:
	 *       - bearerAuth: []
	 */
	router.get(
		"/achievements",
		asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const achievements = await prisma.userAchievement.findMany({
			where: { userId },
			include: {
			achievement: true,
			},
		});
	
		res.json({ success: true, achievements });
		})
	);

	/**
	 * GET /api/users/quests
	 * Get a list of current user quests
	 */
	router.get(
	"/quests",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
	  const userId = req.user!.id;
	  const quests = await prisma.userQuest.findMany({
		where: { userId },
		include: {
		  quest: true,
		},
	  });
  
	  res.json({ success: true, quests });
	})
  );
  
  /**
   * GET /api/users/guild
   * Get the current user's guild info
   */
  router.get(
	"/guild",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
	  const userId = req.user!.id;
	  const guildMember = await prisma.guildMember.findUnique({
		where: { userId },
		include: {
		  guild: {
			include: {
			  members: true,
			  quests: true,
			},
		  },
		},
	  });
  
	  if (!guildMember) {
		return res.json({ success: true, guild: null });
	  }
  
	  res.json({ success: true, guild: guildMember.guild });
	})
  );
  
  /**
   * GET /api/users/guild/wars
   * Get active wars for the user's guild
   */
  router.get(
	"/guild/wars",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
	  const userId = req.user!.id;
	  const member = await prisma.guildMember.findUnique({ where: { userId } });
	  if (!member) throw new ApiError(404, "User is not in a guild");
  
	  const wars = await prisma.guildWar.findMany({
		where: {
		  OR: [
			{ attackerGuildId: member.guildId },
			{ defenderGuildId: member.guildId },
		  ],
		},
		include: {
		  attackerGuild: true,
		  defenderGuild: true,
		},
	  });
  
	  res.json({ success: true, wars });
	})
  );


/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get(
	"/stats",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
	  const userId = req.user!.id;
	  const user = await prisma.user.findUnique({
		where: { id: userId },
		include: { portfolio: true },
	  });
	  if (!user) throw new ApiError(404, "User not found");
  
	  const achievements = await prisma.userAchievement.count({
		where: { userId, isCompleted: true },
	  });
	  const quests = await prisma.userQuest.count({
		where: { userId, isCompleted: true },
	  });
  
	  res.json({
		success: true,
		stats: {
		  level: user.level,
		  xp: user.xp,
		  totalTrades: user.totalTrades,
		  totalPnL: user.totalPnL,
		  achievements,
		  questsCompleted: quests,
		  memberSince: user.createdAt,
		  portfolioValue: user.portfolio?.totalValue ?? 0,
		},
	  });
	})
  );

export default router;
