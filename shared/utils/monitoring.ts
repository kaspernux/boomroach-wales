import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { performance } from "perf_hooks";
import logger from "./logger";

// Types for monitoring
interface MetricData {
	name: string;
	value: number;
	tags?: Record<string, string>;
	timestamp?: Date;
}

interface PerformanceMetric {
	operation: string;
	duration: number;
	success: boolean;
	error?: string;
	metadata?: Record<string, unknown>;
}

interface TradingMetric {
	engine: string;
	operation: string;
	userId?: string;
	symbol?: string;
	amount?: number;
	executionTime?: number;
	success: boolean;
	error?: string;
}

// Configuration interface
interface MonitoringConfig {
	sentry?: {
		dsn: string;
		environment: string;
		release?: string;
		tracesSampleRate: number;
		profilesSampleRate: number;
	};
	datadog?: {
		apiKey: string;
		appKey?: string;
		service: string;
		environment: string;
	};
	custom?: {
		enabled: boolean;
		endpoint?: string;
		apiKey?: string;
	};
}

class MonitoringService {
	private config: MonitoringConfig;
	private initialized = false;
	private metrics: MetricData[] = [];
	private performanceTrackers = new Map<string, number>();

	constructor(config: MonitoringConfig) {
		this.config = config;
	}

	// Initialize monitoring services
	async initialize(): Promise<void> {
		try {
			// Initialize Sentry
			if (this.config.sentry?.dsn) {
				Sentry.init({
					dsn: this.config.sentry.dsn,
					environment: this.config.sentry.environment,
					release: this.config.sentry.release,
					tracesSampleRate: this.config.sentry.tracesSampleRate,
					profilesSampleRate: this.config.sentry.profilesSampleRate,
					integrations: [
						nodeProfilingIntegration(),
						Sentry.httpIntegration({ tracing: true }),
						Sentry.expressIntegration({ app: undefined }),
					],
					beforeSend: (event) => {
						// Filter out sensitive data
						if (event.exception) {
							const error = event.exception.values?.[0];
							if (error?.stacktrace?.frames) {
								error.stacktrace.frames = error.stacktrace.frames.filter(
									frame => !frame.filename?.includes('node_modules')
								);
							}
						}
						return event;
					},
				});

				logger.info("✅ Sentry monitoring initialized", {
					environment: this.config.sentry.environment,
					release: this.config.sentry.release,
				});
			}

			// Initialize custom metrics collection
			this.startMetricsCollection();

			this.initialized = true;
			logger.info("✅ Monitoring service initialized successfully");

		} catch (error) {
			logger.error("❌ Failed to initialize monitoring service", { error });
			throw error;
		}
	}

	// Start periodic metrics collection
	private startMetricsCollection(): void {
		// Collect system metrics every 30 seconds
		setInterval(() => {
			this.collectSystemMetrics();
		}, 30000);

		// Send batched custom metrics every 60 seconds
		setInterval(() => {
			this.sendBatchedMetrics();
		}, 60000);

		logger.info("📊 Metrics collection started");
	}

	// Collect system performance metrics
	private collectSystemMetrics(): void {
		try {
			const memUsage = process.memoryUsage();
			const cpuUsage = process.cpuUsage();

			this.recordMetric({
				name: "system.memory.heap_used",
				value: memUsage.heapUsed,
				tags: { service: "boomroach-api" },
			});

			this.recordMetric({
				name: "system.memory.heap_total",
				value: memUsage.heapTotal,
				tags: { service: "boomroach-api" },
			});

			this.recordMetric({
				name: "system.cpu.user",
				value: cpuUsage.user,
				tags: { service: "boomroach-api" },
			});

			this.recordMetric({
				name: "system.uptime",
				value: process.uptime(),
				tags: { service: "boomroach-api" },
			});

		} catch (error) {
			logger.error("Failed to collect system metrics", { error });
		}
	}

	// Record custom metric
	recordMetric(metric: MetricData): void {
		metric.timestamp = metric.timestamp || new Date();
		this.metrics.push(metric);

		// Keep only last 1000 metrics in memory
		if (this.metrics.length > 1000) {
			this.metrics = this.metrics.slice(-1000);
		}
	}

	// Record trading performance
	recordTradingMetric(metric: TradingMetric): void {
		const tags = {
			engine: metric.engine,
			operation: metric.operation,
			success: metric.success.toString(),
		};

		if (metric.symbol) tags['symbol'] = metric.symbol;

		this.recordMetric({
			name: "trading.operation",
			value: metric.executionTime || 0,
			tags,
		});

		if (metric.amount) {
			this.recordMetric({
				name: "trading.volume",
				value: metric.amount,
				tags,
			});
		}

		// Log to Sentry if it's an error
		if (!metric.success && metric.error) {
			this.captureException(new Error(metric.error), {
				tags: {
					...tags,
					userId: metric.userId,
				},
				extra: {
					tradingMetric: metric,
				},
			});
		}

		logger.info("Trading metric recorded", { metric });
	}

	// Start performance tracking
	startPerformanceTracking(operationId: string): void {
		this.performanceTrackers.set(operationId, performance.now());
	}

	// End performance tracking and record metric
	endPerformanceTracking(
		operationId: string,
		operation: string,
		success = true,
		metadata?: Record<string, unknown>
	): number {
		const startTime = this.performanceTrackers.get(operationId);
		if (!startTime) {
			logger.warn("Performance tracker not found", { operationId });
			return 0;
		}

		const duration = performance.now() - startTime;
		this.performanceTrackers.delete(operationId);

		const performanceMetric: PerformanceMetric = {
			operation,
			duration,
			success,
			metadata,
		};

		this.recordMetric({
			name: "performance.operation_duration",
			value: duration,
			tags: {
				operation,
				success: success.toString(),
			},
		});

		logger.debug("Performance tracked", { performanceMetric });
		return duration;
	}

	// Capture exception with Sentry
	captureException(error: Error, context?: Record<string, unknown>): void {
		if (!this.initialized) return;

		try {
			if (this.config.sentry?.dsn) {
				Sentry.withScope((scope) => {
					if (context?.tags) {
						Object.entries(context.tags as Record<string, string>).forEach(([key, value]) => {
							scope.setTag(key, value);
						});
					}

					if (context?.extra) {
						Object.entries(context.extra as Record<string, unknown>).forEach(([key, value]) => {
							scope.setExtra(key, value);
						});
					}

					if (context?.user) {
						scope.setUser(context.user as any);
					}

					Sentry.captureException(error);
				});
			}

			logger.error("Exception captured", { error, context });
		} catch (captureError) {
			logger.error("Failed to capture exception", { captureError, originalError: error });
		}
	}

	// Capture custom message
	captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>): void {
		if (!this.initialized) return;

		try {
			if (this.config.sentry?.dsn) {
				Sentry.withScope((scope) => {
					if (context?.tags) {
						Object.entries(context.tags as Record<string, string>).forEach(([key, value]) => {
							scope.setTag(key, value);
						});
					}

					if (context?.extra) {
						Object.entries(context.extra as Record<string, unknown>).forEach(([key, value]) => {
							scope.setExtra(key, value);
						});
					}

					Sentry.captureMessage(message, level);
				});
			}

			logger.info("Message captured", { message, level, context });
		} catch (captureError) {
			logger.error("Failed to capture message", { captureError, message });
		}
	}

	// Send batched metrics to external services
	private async sendBatchedMetrics(): Promise<void> {
		if (this.metrics.length === 0) return;

		try {
			const metricsToSend = [...this.metrics];
			this.metrics = [];

			// Send to DataDog if configured
			if (this.config.datadog?.apiKey) {
				await this.sendToDataDog(metricsToSend);
			}

			// Send to custom endpoint if configured
			if (this.config.custom?.enabled && this.config.custom.endpoint) {
				await this.sendToCustomEndpoint(metricsToSend);
			}

			logger.debug("Batched metrics sent", { count: metricsToSend.length });

		} catch (error) {
			logger.error("Failed to send batched metrics", { error });
		}
	}

	// Send metrics to DataDog
	private async sendToDataDog(metrics: MetricData[]): Promise<void> {
		try {
			const datadogMetrics = metrics.map(metric => ({
				metric: metric.name,
				points: [[Math.floor((metric.timestamp?.getTime() || Date.now()) / 1000), metric.value]],
				type: 'gauge',
				tags: metric.tags ? Object.entries(metric.tags).map(([k, v]) => `${k}:${v}`) : [],
			}));

			const response = await fetch('https://api.datadoghq.com/api/v1/series', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'DD-API-KEY': this.config.datadog!.apiKey,
				},
				body: JSON.stringify({ series: datadogMetrics }),
			});

			if (!response.ok) {
				throw new Error(`DataDog API error: ${response.status}`);
			}

			logger.debug("Metrics sent to DataDog", { count: metrics.length });

		} catch (error) {
			logger.error("Failed to send metrics to DataDog", { error });
		}
	}

	// Send metrics to custom endpoint
	private async sendToCustomEndpoint(metrics: MetricData[]): Promise<void> {
		try {
			const response = await fetch(this.config.custom!.endpoint!, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.config.custom!.apiKey || ''}`,
				},
				body: JSON.stringify({ metrics }),
			});

			if (!response.ok) {
				throw new Error(`Custom endpoint error: ${response.status}`);
			}

			logger.debug("Metrics sent to custom endpoint", { count: metrics.length });

		} catch (error) {
			logger.error("Failed to send metrics to custom endpoint", { error });
		}
	}

	// Get current metrics summary
	getMetricsSummary(): Record<string, unknown> {
		const summary = {
			totalMetrics: this.metrics.length,
			activeTrackers: this.performanceTrackers.size,
			systemStats: {
				memoryUsage: process.memoryUsage(),
				cpuUsage: process.cpuUsage(),
				uptime: process.uptime(),
			},
			recentMetrics: this.metrics.slice(-10),
		};

		return summary;
	}

	// Health check
	isHealthy(): boolean {
		return this.initialized && this.metrics.length < 10000; // Prevent memory leaks
	}

	// Shutdown gracefully
	async shutdown(): Promise<void> {
		try {
			// Send remaining metrics
			await this.sendBatchedMetrics();

			// Close Sentry
			if (this.config.sentry?.dsn) {
				await Sentry.close();
			}

			// Clear intervals
			this.performanceTrackers.clear();
			this.metrics = [];

			logger.info("✅ Monitoring service shut down successfully");
		} catch (error) {
			logger.error("❌ Error during monitoring shutdown", { error });
		}
	}
}

// Initialize monitoring service
const createMonitoringService = (): MonitoringService => {
	const config: MonitoringConfig = {
		sentry: process.env.SENTRY_DSN ? {
			dsn: process.env.SENTRY_DSN,
			environment: process.env.NODE_ENV || 'development',
			release: process.env.npm_package_version || '1.0.0',
			tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
			profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
		} : undefined,
		datadog: process.env.DATADOG_API_KEY ? {
			apiKey: process.env.DATADOG_API_KEY,
			service: 'boomroach-api',
			environment: process.env.NODE_ENV || 'development',
		} : undefined,
		custom: {
			enabled: process.env.CUSTOM_METRICS_ENABLED === 'true',
			endpoint: process.env.CUSTOM_METRICS_ENDPOINT,
			apiKey: process.env.CUSTOM_METRICS_API_KEY,
		},
	};

	return new MonitoringService(config);
};

// Export singleton instance
export const monitoring = createMonitoringService();

// Export types and utilities
export type { MetricData, PerformanceMetric, TradingMetric, MonitoringConfig };

// Convenience functions
export const recordMetric = (metric: MetricData) => monitoring.recordMetric(metric);
export const recordTradingMetric = (metric: TradingMetric) => monitoring.recordTradingMetric(metric);
export const captureException = (error: Error, context?: Record<string, unknown>) =>
	monitoring.captureException(error, context);
export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, unknown>) =>
	monitoring.captureMessage(message, level, context);
export const startPerformanceTracking = (operationId: string) => monitoring.startPerformanceTracking(operationId);
export const endPerformanceTracking = (operationId: string, operation: string, success?: boolean, metadata?: Record<string, unknown>) =>
	monitoring.endPerformanceTracking(operationId, operation, success, metadata);

export default monitoring;
