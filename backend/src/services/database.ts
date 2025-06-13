import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { logger } from "../middleware/error-handler";

interface DatabaseConfig {
	host: string;
	port: number;
	database: string;
	username: string;
	password: string;
	pool: {
		min: number;
		max: number;
		idleTimeoutMillis: number;
		connectionTimeoutMillis: number;
	};
}

class DatabaseService {
	private prisma: PrismaClient;
	private pool: Pool | null = null;
	private connected = false;

	constructor() {
		this.prisma = new PrismaClient({
			log:
				process.env.NODE_ENV === "development"
					? ["query", "info", "warn", "error"]
					: ["error"],
		});

		this.initializePool();
	}

	private initializePool() {
		if (
			process.env.DATABASE_URL &&
			process.env.DATABASE_URL.includes("postgresql://")
		) {
			const config: DatabaseConfig = {
				host: process.env.DB_HOST || "localhost",
				port: Number.parseInt(process.env.DB_PORT || "5432"),
				database: process.env.DB_NAME || "boomroach",
				username: process.env.DB_USER || "postgres",
				password: process.env.DB_PASSWORD || "password",
				pool: {
					min: Number.parseInt(process.env.DB_POOL_MIN || "2"),
					max: Number.parseInt(process.env.DB_POOL_MAX || "10"),
					idleTimeoutMillis: Number.parseInt(
						process.env.DB_IDLE_TIMEOUT || "30000",
					),
					connectionTimeoutMillis: Number.parseInt(
						process.env.DB_CONNECTION_TIMEOUT || "10000",
					),
				},
			};

			this.pool = new Pool({
				host: config.host,
				port: config.port,
				database: config.database,
				user: config.username,
				password: config.password,
				min: config.pool.min,
				max: config.pool.max,
				idleTimeoutMillis: config.pool.idleTimeoutMillis,
				connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
			});

			this.pool.on("connect", () => {
				logger.info("New PostgreSQL client connected");
			});

			this.pool.on("error", (err) => {
				logger.error("PostgreSQL pool error:", err);
			});
		}
	}

	async connect() {
		try {
			await this.prisma.$connect();
			logger.info("✅ Database connected successfully");

			if (this.pool) {
				await this.pool.connect();
				logger.info("✅ PostgreSQL connection pool initialized");
			}

			this.connected = true;
			return true;
		} catch (error) {
			logger.warn(
				"⚠️ Database connection failed, continuing without database:",
				error,
			);
			this.connected = false;
			return false;
		}
	}

	async disconnect() {
		try {
			await this.prisma.$disconnect();
			if (this.pool) {
				await this.pool.end();
			}
			this.connected = false;
			logger.info("Database disconnected");
		} catch (error) {
			logger.error("Error disconnecting from database:", error);
		}
	}

	isConnected(): boolean {
		return this.connected;
	}

	getProvider(): string {
		return this.pool ? "postgresql" : "sqlite";
	}

	getPrisma() {
		return this.prisma;
	}

	getPool() {
		return this.pool;
	}

	async healthCheck() {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return {
				status: "healthy",
				provider: this.getProvider(),
				poolConnections: this.pool
					? {
							total: this.pool.totalCount,
							idle: this.pool.idleCount,
							waiting: this.pool.waitingCount,
						}
					: null,
			};
		} catch (error) {
			return {
				status: "unhealthy",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async executeRawQuery(query: string, params?: any[]) {
		if (this.pool) {
			const client = await this.pool.connect();
			try {
				const result = await client.query(query, params);
				return result.rows;
			} finally {
				client.release();
			}
		} else {
			return await this.prisma.$queryRawUnsafe(query, ...(params || []));
		}
	}
}

export const databaseService = new DatabaseService();
export default databaseService;
