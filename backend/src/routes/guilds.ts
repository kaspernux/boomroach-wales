import { PrismaClient } from "@prisma/client";
import express from "express";
import { z } from "zod";
import { asyncWrapper } from "../middleware/error-handler";
import { ApiError } from "../../../shared/utils/errors";
import { authenticateToken, authMiddleware, requireAdmin, requireVerified, requireLevel } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireVerified);
router.use(requireLevel);

// Validation schemas
const createGuildSchema = z.object({
	name: z.string().min(3).max(50),
	description: z.string().max(500),
	isPublic: z.boolean().optional().default(true),
	maxMembers: z.number().min(5).max(100).optional().default(50),
});

/**
 * @swagger
 * /api/guilds:
 *   get:
 *     summary: List all public guilds
 *     tags: [Guilds]
 */
router.get(
	"/",
	asyncWrapper(async (req, res) => {
		const guilds = await prisma.guild.findMany({
			where: { isActive: true },
			include: {
				members: {
					select: {
						user: {
							select: {
								username: true,
								level: true,
							},
						},
						role: true,
					},
				},
			},
			orderBy: { totalXp: "desc" },
			take: 50,
		});

		res.json({
			success: true,
			guilds: guilds.map((guild) => ({
				id: guild.id,
				name: guild.name,
				description: guild.description,
				level: guild.level,
				totalPower: guild.totalXp,
				memberCount: guild.members?.length || 0,
				maxMembers: guild.memberLimit,
				rank: 1,
			})),
		});
	}),
);

/**
 * @swagger
 * /api/guilds:
 *   post:
 *     summary: Create a new guild
 *     tags: [Guilds]
 *     security:
 *       - bearerAuth: []
 */
router.post(
	"/",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const validatedData = createGuildSchema.parse(req.body);

		// Check if user is already in a guild
		const existingMembership = await prisma.guildMember.findFirst({
			where: { userId },
		});

		if (existingMembership) {
			throw new ApiError(400, "User is already a member of a guild");
		}

		const guild = await prisma.guild.create({
			data: {
				name: validatedData.name,
				description: validatedData.description,
				memberLimit: validatedData.maxMembers || 50,
				ownerId: userId,
				members: {
					create: {
						userId,
						role: "OWNER",
					},
				},
			},
			include: {
				members: {
					include: {
						user: {
							select: {
								username: true,
								level: true,
							},
						},
					},
				},
			},
		});

		res.status(201).json({
			success: true,
			guild: {
				id: guild.id,
				name: guild.name,
				description: guild.description,
				level: guild.level,
				memberCount: guild.members?.length || 0,
				maxMembers: guild.memberLimit,
			},
		});
	}),
);

/**
 * @swagger
 * /api/guilds/{id}:
 *   get:
 *     summary: Get guild details
 *     tags: [Guilds]
 */
router.get(
	"/:id",
	asyncWrapper(async (req, res) => {
		const guildId = req.params.id;

		const guild = await prisma.guild.findUnique({
			where: { id: guildId },
			include: {
				members: {
					include: {
						user: {
							select: {
								username: true,
								level: true,
								avatar: true,
							},
						},
					},
				},
			},
		});

		if (!guild) {
			throw new ApiError(404, "Guild not found");
		}

		res.json({
			success: true,
			guild: {
				id: guild.id,
				name: guild.name,
				description: guild.description,
				level: guild.level,
				experience: guild.totalXp,
				totalPower: guild.totalXp,
				rank: 1,
				memberCount: guild.members?.length || 0,
				maxMembers: guild.memberLimit,
				members: guild.members.map((member) => ({
					id: member.user.username,
					username: member.user.username,
					level: member.user.level,
					avatar: member.user.avatar,
					role: member.role,
					contribution: 0,
					joinedAt: member.joinedAt,
				})),
				createdAt: guild.createdAt,
			},
		});
	}),
);

/**
 * @swagger
 * /api/guilds/{id}/join:
 *   post:
 *     summary: Join a guild
 *     tags: [Guilds]
 *     security:
 *       - bearerAuth: []
 */
router.post(
	"/:id/join",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const guildId = req.params.id;

		// Check if user is already in a guild
		const existingMembership = await prisma.guildMember.findFirst({
			where: { userId },
		});

		if (existingMembership) {
			throw new ApiError(400, "User is already a member of a guild");
		}

		// Check if guild exists and has space
		const guild = await prisma.guild.findUnique({
			where: { id: guildId },
			include: {
				members: true,
			},
		});

		if (!guild) {
			throw new ApiError(404, "Guild not found");
		}

		if (guild.members.length >= guild.memberLimit) {
			throw new ApiError(400, "Guild is full");
		}

		// Join the guild
		const membership = await prisma.guildMember.create({
			data: {
				userId,
				guildId,
				role: "MEMBER",
			},
		});

		res.json({
			success: true,
			message: "Successfully joined guild",
			membership: {
				guildId: membership.guildId,
				role: membership.role,
				joinedAt: membership.joinedAt,
			},
		});
	}),
);

/**
 * @swagger
 * /api/guilds/{id}/leave:
 *   post:
 *     summary: Leave a guild
 *     tags: [Guilds]
 *     security:
 *       - bearerAuth: []
 */
router.post(
	"/:id/leave",
	asyncWrapper(async (req: AuthenticatedRequest, res) => {
		const userId = req.user!.id;
		const guildId = req.params.id;

		const membership = await prisma.guildMember.findFirst({
			where: {
				userId,
				guildId,
			},
		});

		if (!membership) {
			throw new ApiError(404, "Not a member of this guild");
		}

		if (membership.role === "OWNER") {
			// Check if there are other members to transfer ownership
			const otherMembers = await prisma.guildMember.findMany({
				where: {
					guildId,
					userId: { not: userId },
				},
			});

			if (otherMembers.length > 0) {
				// Transfer ownership to another admin or member
				const newOwner =
					otherMembers.find((m) => m.role === "ADMIN") || otherMembers[0];
				await prisma.guildMember.update({
					where: { id: newOwner.id },
					data: { role: "OWNER" },
				});

				// Update guild owner
				await prisma.guild.update({
					where: { id: guildId },
					data: { ownerId: newOwner.userId },
				});
			} else {
				// Delete the guild if no other members
				await prisma.guild.delete({
					where: { id: guildId },
				});
			}
		}

		// Remove membership
		await prisma.guildMember.delete({
			where: { id: membership.id },
		});

		res.json({
			success: true,
			message: "Successfully left guild",
		});
	}),
);

export default router;
