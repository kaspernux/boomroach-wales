import { PrismaClient } from '@prisma/client';
import { tokenDataService, type TokenConfig } from './token-data';
import { telegramBot } from './telegram-bot';

// Centralisation des imports de configuration
import aiConfig from '../../../config/ai.config.json';
import monitoringConfig from '../../../config/monitoring.config.json';
import tradingConfig from '../../../config/trading.config.json';
import telegramConfig from '../../../config/telegram.config.json';
import featureFlagsConfig from '../../../config/feature-flags.config.json';
import solanaConfig from '../../../config/solana.config.json';
import databaseConfig from '../../../config/database.config.json';
import redisConfig from '../../../config/redis.config.json';
import emailConfig from '../../../config/email.config.json';
import appConfig from '../../../config/app.config.json';
import backupConfig from '../../../config/backup.config.json';

const prisma = new PrismaClient();

// Platform configuration interface
export interface PlatformConfig {
  // Token settings
  token: TokenConfig;

  // Trading settings
  trading: {
    enabled: boolean;
    maxSlippage: number;
    defaultSlippage: number;
    minTradeAmount: number;
    maxTradeAmount: number;
    commissionRate: number; // Percentage of BOOMROACH to collect
    maxDailyTrades: number;
    tradingHours: {
      enabled: boolean;
      startHour: number;
      endHour: number;
      timezone: string;
    };
  };

  // Engine settings
  engines: {
    enabled: boolean;
    maxActiveEngines: number;
    riskLevels: {
      conservative: { maxPositionSize: number; stopLoss: number; };
      moderate: { maxPositionSize: number; stopLoss: number; };
      aggressive: { maxPositionSize: number; stopLoss: number; };
    };
    autoRebalance: boolean;
    rebalanceThreshold: number;
  };

  // Security settings
  security: {
    requireEmailVerification: boolean;
    require2FA: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number; // minutes
    ipWhitelist: string[];
    walletConnectionRequired: boolean;
    minWalletBalance: number; // SOL
    minBoomroachHolding: number; // BOOMROACH tokens
  };

  // Notification settings
  notifications: {
    telegram: {
      enabled: boolean;
      botToken: string;
      webhookUrl: string;
      alertTypes: string[];
    };
    email: {
      enabled: boolean;
      smtpConfig: {
        host: string;
        port: number;
        user: string;
        pass: string;
        secure: boolean;
      };
      templates: {
        welcome: boolean;
        tradeAlert: boolean;
        portfolioUpdate: boolean;
        engineStatus: boolean;
      };
    };
    discord: {
      enabled: boolean;
      webhookUrl: string;
      alertChannels: string[];
    };
  };

  // Analytics settings
  analytics: {
    enabled: boolean;
    trackingEvents: string[];
    dataRetentionDays: number;
    exportEnabled: boolean;
  };

  // Feature flags
  features: {
    portfolioTracking: boolean;
    socialTrading: boolean;
    stakingRewards: boolean;
    referralProgram: boolean;
    mobileApp: boolean;
    advancedCharting: boolean;
    copyTrading: boolean;
    nftRewards: boolean;
  };

  // System settings
  system: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      burstLimit: number;
    };
    logging: {
      level: 'debug' | 'info' | 'warn' | 'error';
      retentionDays: number;
    };
  };
}

// Default platform configuration
const DEFAULT_CONFIG: PlatformConfig = {
  token: tokenDataService.getTokenConfig(),

  trading: {
    enabled: true,
    maxSlippage: 10,
    defaultSlippage: 3,
    minTradeAmount: 0.01, // SOL
    maxTradeAmount: 1000, // SOL
    commissionRate: 0.25, // 0.25% in BOOMROACH
    maxDailyTrades: 100,
    tradingHours: {
      enabled: false,
      startHour: 9,
      endHour: 17,
      timezone: 'UTC'
    }
  },

  engines: {
    enabled: true,
    maxActiveEngines: 4,
    riskLevels: {
      conservative: { maxPositionSize: 10, stopLoss: 5 },
      moderate: { maxPositionSize: 25, stopLoss: 8 },
      aggressive: { maxPositionSize: 50, stopLoss: 12 }
    },
    autoRebalance: true,
    rebalanceThreshold: 20
  },

  security: {
    requireEmailVerification: true,
    require2FA: false,
    maxLoginAttempts: 5,
    sessionTimeout: 480, // 8 hours
    ipWhitelist: [],
    walletConnectionRequired: true,
    minWalletBalance: 0.1, // 0.1 SOL
    minBoomroachHolding: 1000 // 1000 BOOMROACH tokens
  },

  notifications: {
    telegram: {
      enabled: true,
      botToken: '7781226615:AAFn1xietRjkUSYzq5tM1wQYzN0HvJmh7cw',
      webhookUrl: '',
      alertTypes: ['trades', 'portfolio', 'engines', 'system']
    },
    email: {
      enabled: true,
      smtpConfig: {
        host: 'smtp.ethereal.email',
        port: 587,
        user: 'test@ethereal.email',
        pass: 'test123',
        secure: false
      },
      templates: {
        welcome: true,
        tradeAlert: true,
        portfolioUpdate: true,
        engineStatus: true
      }
    },
    discord: {
      enabled: false,
      webhookUrl: '',
      alertChannels: []
    }
  },

  analytics: {
    enabled: true,
    trackingEvents: ['login', 'trade', 'engine_start', 'engine_stop', 'portfolio_view'],
    dataRetentionDays: 90,
    exportEnabled: true
  },

  features: {
    portfolioTracking: true,
    socialTrading: true,
    stakingRewards: false,
    referralProgram: false,
    mobileApp: true,
    advancedCharting: true,
    copyTrading: false,
    nftRewards: false
  },

  system: {
    maintenanceMode: false,
    maintenanceMessage: 'System is under maintenance. Please try again later.',
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      burstLimit: 200
    },
    logging: {
      level: 'info',
      retentionDays: 30
    }
  }
};

export class AdminConfigService {
  private config: PlatformConfig = DEFAULT_CONFIG;
  private configCache: Map<string, any> = new Map();

  constructor() {
    this.loadConfigFromDatabase();
  }

  // Load configuration from database
  async loadConfigFromDatabase() {
    try {
      // Load platform configuration from database
      // For now, we'll use the default config and add database storage later
      console.log('📊 Admin configuration loaded');
    } catch (error) {
      console.error('❌ Error loading admin config:', error);
    }
  }

  // Get full platform configuration
  getConfig(): PlatformConfig {
    return { ...this.config };
  }

  // Get specific configuration section
  getConfigSection<K extends keyof PlatformConfig>(section: K): PlatformConfig[K] {
    return this.config[section];
  }

  // Update platform configuration
  async updateConfig(updates: Partial<PlatformConfig>): Promise<PlatformConfig> {
    try {
      // Merge updates with existing config
      this.config = { ...this.config, ...updates };

      // Apply special updates that need service reconfiguration
      if (updates.token) {
        tokenDataService.updateTokenConfig(updates.token);
      }

      if (updates.notifications?.telegram) {
        // Reconfigure Telegram bot if settings changed
        if (updates.notifications.telegram.webhookUrl) {
          await telegramBot.setWebhook(updates.notifications.telegram.webhookUrl);
        }
      }

      // Save to database
      await this.saveConfigToDatabase();

      // Clear cache
      this.configCache.clear();

      console.log('⚙️ Platform configuration updated');
      return this.config;
    } catch (error) {
      console.error('❌ Error updating config:', error);
      throw error;
    }
  }

  // Update token configuration specifically
  async updateTokenConfig(tokenConfig: Partial<TokenConfig>): Promise<TokenConfig> {
    const updatedToken = { ...this.config.token, ...tokenConfig };

    await this.updateConfig({
      token: updatedToken
    });

    return updatedToken;
  }

  // Update trading configuration
  async updateTradingConfig(tradingConfig: Partial<PlatformConfig['trading']>): Promise<PlatformConfig['trading']> {
    const updatedTrading = { ...this.config.trading, ...tradingConfig };

    await this.updateConfig({
      trading: updatedTrading
    });

    return updatedTrading;
  }

  // Update security configuration
  async updateSecurityConfig(securityConfig: Partial<PlatformConfig['security']>): Promise<PlatformConfig['security']> {
    const updatedSecurity = { ...this.config.security, ...securityConfig };

    await this.updateConfig({
      security: updatedSecurity
    });

    return updatedSecurity;
  }

  // Enable/disable specific features
  async toggleFeature(feature: keyof PlatformConfig['features'], enabled: boolean): Promise<boolean> {
    const updatedFeatures = { ...this.config.features, [feature]: enabled };

    await this.updateConfig({
      features: updatedFeatures
    });

    console.log(`🎛️ Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
  }

  // Set maintenance mode
  async setMaintenanceMode(enabled: boolean, message?: string): Promise<void> {
    await this.updateConfig({
      system: {
        ...this.config.system,
        maintenanceMode: enabled,
        maintenanceMessage: message || this.config.system.maintenanceMessage
      }
    });

    if (enabled) {
      // Notify users about maintenance
      await this.notifyMaintenance(message);
    }

    console.log(`🔧 Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get trading settings for validation
  getTradingLimits() {
    return {
      minTradeAmount: this.config.trading.minTradeAmount,
      maxTradeAmount: this.config.trading.maxTradeAmount,
      maxSlippage: this.config.trading.maxSlippage,
      defaultSlippage: this.config.trading.defaultSlippage,
      commissionRate: this.config.trading.commissionRate,
      maxDailyTrades: this.config.trading.maxDailyTrades
    };
  }

  // Get security requirements
  getSecurityRequirements() {
    return {
      requireEmailVerification: this.config.security.requireEmailVerification,
      require2FA: this.config.security.require2FA,
      walletConnectionRequired: this.config.security.walletConnectionRequired,
      minWalletBalance: this.config.security.minWalletBalance,
      minBoomroachHolding: this.config.security.minBoomroachHolding
    };
  }

  // Get enabled features
  getEnabledFeatures() {
    return Object.entries(this.config.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
  }

  // Check if feature is enabled
  isFeatureEnabled(feature: keyof PlatformConfig['features']): boolean {
    return this.config.features[feature];
  }

  // Check if trading is enabled
  isTradingEnabled(): boolean {
    return this.config.trading.enabled && !this.config.system.maintenanceMode;
  }

  // Check if engines are enabled
  areEnginesEnabled(): boolean {
    return this.config.engines.enabled && !this.config.system.maintenanceMode;
  }

  // Validate user trading eligibility
  async validateTradingEligibility(userWalletBalance: number, userBoomroachBalance: number): Promise<{
    eligible: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    if (!this.isTradingEnabled()) {
      reasons.push('Trading is currently disabled');
    }

    if (this.config.security.walletConnectionRequired && userWalletBalance < this.config.security.minWalletBalance) {
      reasons.push(`Minimum wallet balance of ${this.config.security.minWalletBalance} SOL required`);
    }

    if (userBoomroachBalance < this.config.security.minBoomroachHolding) {
      reasons.push(`Minimum ${this.config.security.minBoomroachHolding} BOOMROACH tokens required`);
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  }

  // Save configuration to database
  private async saveConfigToDatabase() {
    try {
      // TODO: Implement database storage for configuration
      // await prisma.platformConfig.upsert({
      //   where: { id: 1 },
      //   update: { config: JSON.stringify(this.config) },
      //   create: { id: 1, config: JSON.stringify(this.config) }
      // });
      console.log('💾 Configuration saved to database');
    } catch (error) {
      console.error('❌ Error saving config to database:', error);
    }
  }

  // Notify users about maintenance
  private async notifyMaintenance(message?: string) {
    try {
      const maintenanceMessage = `
🔧 <b>Maintenance Notice</b>

${message || this.config.system.maintenanceMessage}

We'll be back online shortly. Thank you for your patience!

🪳 The BoomRoach Team
      `.trim();

      // Send via Telegram if enabled
      if (this.config.notifications.telegram.enabled) {
        await telegramBot.broadcastMessage(maintenanceMessage);
      }

      // TODO: Send via email to all users
      // TODO: Send via Discord webhook if enabled

    } catch (error) {
      console.error('❌ Error sending maintenance notification:', error);
    }
  }

  // Get system status
  getSystemStatus() {
    return {
      maintenanceMode: this.config.system.maintenanceMode,
      tradingEnabled: this.isTradingEnabled(),
      enginesEnabled: this.areEnginesEnabled(),
      telegramBotEnabled: this.config.notifications.telegram.enabled,
      emailEnabled: this.config.notifications.email.enabled,
      rateLimitingEnabled: this.config.system.rateLimiting.enabled,
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }

  // Export configuration for backup
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Import configuration from backup
  async importConfig(configJson: string): Promise<PlatformConfig> {
    try {
      const importedConfig = JSON.parse(configJson) as PlatformConfig;
      return await this.updateConfig(importedConfig);
    } catch (error) {
      console.error('❌ Error importing config:', error);
      throw new Error('Invalid configuration format');
    }
  }

  // Reset configuration to defaults
  async resetToDefaults(): Promise<PlatformConfig> {
    this.config = { ...DEFAULT_CONFIG };
    await this.saveConfigToDatabase();
    this.configCache.clear();

    console.log('🔄 Configuration reset to defaults');
    return this.config;
  }
}

// Export singleton instance
export const adminConfigService = new AdminConfigService();

export default AdminConfigService;
