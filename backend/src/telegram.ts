import { config } from "./config/env";
import { hydraBotTelegram } from "./services/telegram";
import { logger } from "../../shared/utils/logger";

async function startTelegramBot() {
	try {
		if (!config.TELEGRAM_BOT_TOKEN) {
			logger.warn(
				"Telegram bot token not provided. Telegram bot will not start.",
			);
			return;
		}

		logger.info("🤖 Starting Hydra Bot Telegram service...");

		// The bot is already initialized in the service
		logger.info("✅ Hydra Bot Telegram is ready!");
		logger.info(
			`📱 Bot available at: https://t.me/${process.env.TELEGRAM_BOT_USERNAME || "HydraBot"}`,
		);
	} catch (error) {
		logger.error("Failed to start Telegram bot:", error);
		process.exit(1);
	}
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
	logger.info("SIGTERM received, shutting down Telegram bot...");
	process.exit(0);
});

process.on("SIGINT", () => {
	logger.info("SIGINT received, shutting down Telegram bot...");
	process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	logger.error("Telegram bot uncaught exception:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	logger.error(
		"Telegram bot unhandled rejection at:",
		promise,
		"reason:",
		reason,
	);
	process.exit(1);
});

// Start the bot
startTelegramBot();
