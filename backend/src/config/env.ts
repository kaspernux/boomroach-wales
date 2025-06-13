import { z } from 'zod'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  API_URL: z.string().url().default('http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Solana Configuration
  SOLANA_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),
  SOLANA_CLUSTER: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('mainnet-beta'),

  // External API Keys
  JUPITER_API_KEY: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Redis (Optional)
  REDIS_URL: z.string().optional(),

  // Email Service (Optional)
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Webhook URLs (Optional)
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Security
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_SECRET: z.string().optional(),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),

  // Feature Flags
  ENABLE_WEBSOCKET: z.string().transform(Boolean).default('true'),
  ENABLE_PRICE_UPDATES: z.string().transform(Boolean).default('true'),
  ENABLE_TRADING_SIGNALS: z.string().transform(Boolean).default('true'),
  ENABLE_GUILD_WARS: z.string().transform(Boolean).default('true'),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),

  // Development
  DEBUG_SQL: z.string().transform(Boolean).default('false'),
  MOCK_EXTERNAL_APIS: z.string().transform(Boolean).default('false'),
})

// Validate environment variables
let config: z.infer<typeof envSchema>

try {
  config = envSchema.parse(process.env)
} catch (error) {
  console.error('❌ Invalid environment configuration:')
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`)
    })
  }
  process.exit(1)
}

// Additional computed values
const computedConfig = {
  ...config,
  API_BASE_URL: config.API_URL,
  IS_PRODUCTION: config.NODE_ENV === 'production',
  IS_DEVELOPMENT: config.NODE_ENV === 'development',
  IS_TEST: config.NODE_ENV === 'test',
}

export { computedConfig as config }

// Type for configuration
export type Config = typeof computedConfig

// Helper functions
export const isDevelopment = () => config.NODE_ENV === 'development'
export const isProduction = () => config.NODE_ENV === 'production'
export const isTest = () => config.NODE_ENV === 'test'

// Validate required secrets in production
if (isProduction()) {
  const requiredSecrets = [
    'JWT_SECRET',
    'DATABASE_URL',
  ]

  const missingSecrets = requiredSecrets.filter(secret => !config[secret as keyof typeof config])

  if (missingSecrets.length > 0) {
    console.error('❌ Missing required secrets in production:')
    missingSecrets.forEach(secret => console.error(`  ${secret}`))
    process.exit(1)
  }
}

console.log(`✅ Environment configuration loaded (${config.NODE_ENV})`)

export default config
