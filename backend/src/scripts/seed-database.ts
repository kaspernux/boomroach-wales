import { PrismaClient } from "@prisma/client";

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

const prisma = new PrismaClient();

// Sample data generators
const generateUsers = (count: number) => {
	const users = [];
	const usernames = [
		"cryptoking",
		"moonwalker",
		"diamondhands",
		"hodlmaster",
		"tradingpro",
		"boomroach_fan",
		"alphatrader",
		"cryptoninja",
		"degenerate",
		"yoloinvestor",
		"smartmoney",
		"whalewatch",
		"gainsgoblin",
		"profitpilot",
		"riskmanager",
		"memecoin_lover",
		"solana_surfer",
		"nft_hunter",
		"yield_farmer",
		"liquidity_lord",
	];

	for (let i = 0; i < count; i++) {
		const username = `${usernames[i % usernames.length]}_${i + 1}`;
		users.push({
			id: `user_${Date.now()}_${i}`,
			username,
			email: `${username}@example.com`,
			walletAddress: generateWalletAddress(),
			level: Math.floor(Math.random() * 50) + 1,
			experience: Math.floor(Math.random() * 10000),
			totalTrades: Math.floor(Math.random() * 1000),
			winRate: 0.4 + Math.random() * 0.5,
			totalProfit: (Math.random() - 0.3) * 50000,
			reputation: Math.floor(Math.random() * 1000),
			joinedAt: new Date(
				Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
			),
			isActive: Math.random() > 0.2,
			subscription: ["free", "premium", "vip"][Math.floor(Math.random() * 3)],
		});
	}

	return users;
};

const generateTrades = (users: any[], count: number) => {
	const trades = [];
	const engines = ["sniper", "reentry", "ai-signals", "guardian"];
	const symbols = ["BOOMROACH", "SOL", "BONK", "WIF", "PEPE"];

	for (let i = 0; i < count; i++) {
		const user = users[Math.floor(Math.random() * users.length)];
		const isWin = Math.random() > 0.35;

		trades.push({
			id: `trade_${Date.now()}_${i}`,
			userId: user.id,
			symbol: symbols[Math.floor(Math.random() * symbols.length)],
			side: Math.random() > 0.5 ? "buy" : "sell",
			amount: Math.floor(Math.random() * 10000) + 100,
			price: 0.001 + Math.random() * 0.1,
			engine: engines[Math.floor(Math.random() * engines.length)],
			status: "filled",
			profit: isWin ? Math.random() * 2000 + 10 : -(Math.random() * 1000 + 5),
			executionTime: Math.random() * 5,
			timestamp: new Date(
				Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
			),
			fees: Math.random() * 10 + 1,
		});
	}

	return trades;
};

const generateAchievements = () => {
	return [
		{
			id: "first_trade",
			name: "First Trade",
			description: "Complete your first trade",
			icon: "🎯",
			category: "trading",
			points: 100,
			rarity: "common",
		},
		{
			id: "profitable_streak",
			name: "Profit Streak",
			description: "Make 10 profitable trades in a row",
			icon: "🔥",
			category: "trading",
			points: 500,
			rarity: "rare",
		},
		{
			id: "speed_demon",
			name: "Speed Demon",
			description: "Execute a trade in under 1 second",
			icon: "⚡",
			category: "trading",
			points: 300,
			rarity: "uncommon",
		},
		{
			id: "whale_watcher",
			name: "Whale Watcher",
			description: "Execute a trade worth over $10,000",
			icon: "🐋",
			category: "trading",
			points: 750,
			rarity: "epic",
		},
		{
			id: "diamond_hands",
			name: "Diamond Hands",
			description: "Hold a position for over 24 hours",
			icon: "💎",
			category: "holding",
			points: 400,
			rarity: "uncommon",
		},
		{
			id: "social_butterfly",
			name: "Social Butterfly",
			description: "Get 100 followers on the platform",
			icon: "🦋",
			category: "social",
			points: 600,
			rarity: "rare",
		},
		{
			id: "risk_manager",
			name: "Risk Manager",
			description: "Use stop losses on 50 consecutive trades",
			icon: "🛡️",
			category: "risk",
			points: 800,
			rarity: "epic",
		},
		{
			id: "boomroach_master",
			name: "BoomRoach Master",
			description: "Make 1000 profitable BOOMROACH trades",
			icon: "🪳",
			category: "trading",
			points: 2000,
			rarity: "legendary",
		},
	];
};

const generateUserAchievements = (users: any[], achievements: any[]) => {
	const userAchievements = [];

	users.forEach((user) => {
		// Each user gets random achievements based on their stats
		const numAchievements = Math.floor(
			Math.random() * achievements.length * 0.7,
		);
		const userAchievementIds = achievements
			.sort(() => 0.5 - Math.random())
			.slice(0, numAchievements);

		userAchievementIds.forEach((achievement) => {
			userAchievements.push({
				id: `user_achievement_${user.id}_${achievement.id}`,
				userId: user.id,
				achievementId: achievement.id,
				unlockedAt: new Date(
					Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
				),
				progress: 100,
			});
		});
	});

	return userAchievements;
};

const generateGuilds = () => {
	return [
		{
			id: "diamond_traders",
			name: "Diamond Traders",
			description: "Elite traders with exceptional performance",
			icon: "💎",
			level: 15,
			memberCount: 28,
			totalTrades: 15420,
			avgWinRate: 0.847,
			createdAt: new Date("2024-01-15"),
			isPublic: true,
			requirements: "Minimum 80% win rate and 500+ trades",
		},
		{
			id: "boomroach_army",
			name: "BoomRoach Army",
			description: "Dedicated BOOMROACH token enthusiasts",
			icon: "🪳",
			level: 12,
			memberCount: 156,
			totalTrades: 8940,
			avgWinRate: 0.723,
			createdAt: new Date("2024-02-01"),
			isPublic: true,
			requirements: "Focus on BOOMROACH trading",
		},
		{
			id: "ai_pioneers",
			name: "AI Pioneers",
			description: "Advanced AI signal traders",
			icon: "🤖",
			level: 18,
			memberCount: 45,
			totalTrades: 22180,
			avgWinRate: 0.798,
			createdAt: new Date("2024-01-20"),
			isPublic: false,
			requirements: "AI signal engine users only",
		},
		{
			id: "speed_runners",
			name: "Speed Runners",
			description: "Lightning-fast execution specialists",
			icon: "⚡",
			level: 10,
			memberCount: 89,
			totalTrades: 6750,
			avgWinRate: 0.681,
			createdAt: new Date("2024-03-01"),
			isPublic: true,
			requirements: "Average execution time under 2 seconds",
		},
	];
};

const generateGuildMemberships = (users: any[], guilds: any[]) => {
	const memberships = [];

	users.forEach((user) => {
		// 60% chance user is in a guild
		if (Math.random() > 0.4) {
			const guild = guilds[Math.floor(Math.random() * guilds.length)];
			const role =
				Math.random() > 0.9
					? "admin"
					: Math.random() > 0.7
						? "moderator"
						: "member";

			memberships.push({
				id: `membership_${user.id}_${guild.id}`,
				userId: user.id,
				guildId: guild.id,
				role,
				joinedAt: new Date(
					Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
				),
				contributionScore: Math.floor(Math.random() * 1000),
				isActive: Math.random() > 0.1,
			});
		}
	});

	return memberships;
};

const generateQuests = () => {
	return [
		{
			id: "daily_trader",
			title: "Daily Trader",
			description: "Complete 5 profitable trades today",
			type: "daily",
			category: "trading",
			targetValue: 5,
			reward: 100,
			expiration: new Date(Date.now() + 24 * 60 * 60 * 1000),
			isActive: true,
			difficulty: "easy",
		},
		{
			id: "engine_master",
			title: "Engine Master",
			description: "Use all 4 trading engines this week",
			type: "weekly",
			category: "exploration",
			targetValue: 4,
			reward: 500,
			expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			isActive: true,
			difficulty: "medium",
		},
		{
			id: "profit_milestone",
			title: "Profit Milestone",
			description: "Reach $10,000 total profit",
			type: "milestone",
			category: "achievement",
			targetValue: 10000,
			reward: 1000,
			expiration: null,
			isActive: true,
			difficulty: "hard",
		},
		{
			id: "social_connector",
			title: "Social Connector",
			description: "Follow 10 other traders",
			type: "social",
			category: "community",
			targetValue: 10,
			reward: 200,
			expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			isActive: true,
			difficulty: "easy",
		},
	];
};

const generateUserQuests = (users: any[], quests: any[]) => {
	const userQuests = [];

	users.forEach((user) => {
		quests.forEach((quest) => {
			if (Math.random() > 0.3) {
				// 70% chance user has this quest
				const progress = Math.floor(Math.random() * quest.targetValue * 1.2);
				const isCompleted = progress >= quest.targetValue;

				userQuests.push({
					id: `user_quest_${user.id}_${quest.id}`,
					userId: user.id,
					questId: quest.id,
					progress,
					isCompleted,
					completedAt: isCompleted
						? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
						: null,
					startedAt: new Date(
						Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000,
					),
				});
			}
		});
	});

	return userQuests;
};

const generateWalletAddress = () => {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
	let result = "";
	for (let i = 0; i < 44; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};

// Main seeding function
export const seedDatabase = async () => {
	try {
		logger.info("Starting database seeding...");

		// Clear existing data
		logger.info("Clearing existing data...");
		await prisma.userQuest.deleteMany();
		await prisma.userAchievement.deleteMany();
		await prisma.guildMembership.deleteMany();
		await prisma.trade.deleteMany();
		await prisma.quest.deleteMany();
		await prisma.achievement.deleteMany();
		await prisma.guild.deleteMany();
		await prisma.user.deleteMany();

		// Generate sample data
		logger.info("Generating sample data...");
		const users = generateUsers(50);
		const trades = generateTrades(users, 500);
		const achievements = generateAchievements();
		const userAchievements = generateUserAchievements(users, achievements);
		const guilds = generateGuilds();
		const guildMemberships = generateGuildMemberships(users, guilds);
		const quests = generateQuests();
		const userQuests = generateUserQuests(users, quests);

		// Seed users
		logger.info("Seeding users...");
		for (const user of users) {
			await prisma.user.create({
				data: {
					id: user.id,
					username: user.username,
					email: user.email,
					walletAddress: user.walletAddress,
					level: user.level,
					experience: user.experience,
					totalTrades: user.totalTrades,
					winRate: user.winRate,
					totalProfit: user.totalProfit,
					reputation: user.reputation,
					joinedAt: user.joinedAt,
					isActive: user.isActive,
					subscription: user.subscription,
				},
			});
		}

		// Seed achievements
		logger.info("Seeding achievements...");
		for (const achievement of achievements) {
			await prisma.achievement.create({
				data: achievement,
			});
		}

		// Seed guilds
		logger.info("Seeding guilds...");
		for (const guild of guilds) {
			await prisma.guild.create({
				data: guild,
			});
		}

		// Seed quests
		logger.info("Seeding quests...");
		for (const quest of quests) {
			await prisma.quest.create({
				data: quest,
			});
		}

		// Seed trades
		logger.info("Seeding trades...");
		for (const trade of trades) {
			await prisma.trade.create({
				data: trade,
			});
		}

		// Seed user achievements
		logger.info("Seeding user achievements...");
		for (const userAchievement of userAchievements) {
			await prisma.userAchievement.create({
				data: userAchievement,
			});
		}

		// Seed guild memberships
		logger.info("Seeding guild memberships...");
		for (const membership of guildMemberships) {
			await prisma.guildMembership.create({
				data: membership,
			});
		}

		// Seed user quests
		logger.info("Seeding user quests...");
		for (const userQuest of userQuests) {
			await prisma.userQuest.create({
				data: userQuest,
			});
		}

		logger.info("Database seeding completed successfully!");

		// Log summary
		const summary = {
			users: users.length,
			trades: trades.length,
			achievements: achievements.length,
			userAchievements: userAchievements.length,
			guilds: guilds.length,
			guildMemberships: guildMemberships.length,
			quests: quests.length,
			userQuests: userQuests.length,
		};

		logger.info("Seeding summary:", summary);
		return summary;
	} catch (error) {
		logger.error("Database seeding failed:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
};

// Quick seed function for development
export const quickSeed = async () => {
	try {
		logger.info("Running quick seed for development...");

		// Just add a few essential records
		const testUser = {
			id: "test_user_dev",
			username: "dev_trader",
			email: "dev@boomroach.wales",
			walletAddress: generateWalletAddress(),
			level: 25,
			experience: 5000,
			totalTrades: 150,
			winRate: 0.78,
			totalProfit: 15000,
			reputation: 850,
			joinedAt: new Date(),
			isActive: true,
			subscription: "premium",
		};

		await prisma.user.upsert({
			where: { id: testUser.id },
			update: testUser,
			create: testUser,
		});

		logger.info("Quick seed completed!");
		return { users: 1, message: "Development user created" };
	} catch (error) {
		logger.error("Quick seed failed:", error);
		throw error;
	}
};

// Run seeding if called directly
if (require.main === module) {
	const seedType = process.argv[2] || "full";

	if (seedType === "quick") {
		quickSeed()
			.then((result) => {
				console.log("Quick seed result:", result);
				process.exit(0);
			})
			.catch((error) => {
				console.error("Quick seed error:", error);
				process.exit(1);
			});
	} else {
		seedDatabase()
			.then((result) => {
				console.log("Full seed result:", result);
				process.exit(0);
			})
			.catch((error) => {
				console.error("Full seed error:", error);
				process.exit(1);
			});
	}
}
