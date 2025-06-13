import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization token required');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const userInfo = await authenticateUser(request);
    const userId = userInfo.userId;

    // Get all trading engines
    const enginesResult = await db.getTradingEngines();
    if (!enginesResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trading engines' },
        { status: 500 }
      );
    }

    // Get user's engine configurations
    const userConfigsResult = await db.getUserEngineConfigs(userId);
    const userConfigs = userConfigsResult.success ? userConfigsResult.configs : [];

    // Combine engine data with user configurations
    const engines = enginesResult.engines!.map(engine => {
      const userConfig = userConfigs.find(config => config.engineId === engine.id);

      // Check subscription access
      const hasAccess = checkSubscriptionAccess(userInfo.subscriptionTier, engine.subscriptionTier);

      return {
        id: engine.id,
        name: engine.name,
        displayName: engine.displayName,
        description: engine.description,
        type: engine.type,
        category: engine.category,
        riskLevel: engine.riskLevel,
        status: engine.status,
        isActive: userConfig?.isEnabled || false,
        hasAccess,
        successRate: engine.successRate,
        totalTrades: engine.totalTrades,
        totalPnL: engine.totalPnL,
        dailyPnL: calculateDailyPnL(engine.totalPnL, engine.totalTrades),
        activeTrades: userConfig?.totalTrades || 0,
        subscriptionRequired: engine.subscriptionTier,
        defaultConfig: engine.defaultConfig,
        userConfig: userConfig ? {
          isEnabled: userConfig.isEnabled,
          allocation: userConfig.allocation,
          riskLevel: userConfig.riskLevel,
          config: userConfig.config
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      engines
    });

  } catch (error) {
    console.error('Get engines error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch engines' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userInfo = await authenticateUser(request);
    const userId = userInfo.userId;
    const body = await request.json();

    const { engineId, config, isEnabled, allocation, riskLevel } = body;

    if (!engineId) {
      return NextResponse.json(
        { success: false, error: 'Engine ID is required' },
        { status: 400 }
      );
    }

    // Check if engine exists
    const engine = await db.prisma.tradingEngine.findUnique({
      where: { id: engineId }
    });

    if (!engine) {
      return NextResponse.json(
        { success: false, error: 'Engine not found' },
        { status: 404 }
      );
    }

    // Check subscription access
    const hasAccess = checkSubscriptionAccess(userInfo.subscriptionTier, engine.subscriptionTier);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Subscription upgrade required for this engine' },
        { status: 403 }
      );
    }

    // Update or create engine configuration
    const result = await db.updateEngineConfig(userId, engineId, {
      config: config || engine.defaultConfig,
      isEnabled: isEnabled !== undefined ? isEnabled : false,
      allocation: allocation || 100,
      riskLevel: riskLevel || 'MEDIUM'
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update engine configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Engine configuration updated successfully',
      config: result.config
    });

  } catch (error) {
    console.error('Update engine config error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update engine configuration' },
      { status: 500 }
    );
  }
}

// Engine control endpoint
export async function PUT(request: NextRequest) {
  try {
    const userInfo = await authenticateUser(request);
    const userId = userInfo.userId;
    const body = await request.json();

    const { engineId, action } = body;

    if (!engineId || !action) {
      return NextResponse.json(
        { success: false, error: 'Engine ID and action are required' },
        { status: 400 }
      );
    }

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be start, stop, or restart' },
        { status: 400 }
      );
    }

    // Get user's engine configuration
    const userConfig = await db.prisma.engineConfig.findUnique({
      where: {
        userId_engineId: {
          userId,
          engineId
        }
      },
      include: {
        engine: true
      }
    });

    if (!userConfig) {
      return NextResponse.json(
        { success: false, error: 'Engine configuration not found' },
        { status: 404 }
      );
    }

    // Check subscription access
    const hasAccess = checkSubscriptionAccess(userInfo.subscriptionTier, userConfig.engine.subscriptionTier);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Subscription upgrade required for this engine' },
        { status: 403 }
      );
    }

    let newStatus: boolean;
    switch (action) {
      case 'start':
        newStatus = true;
        break;
      case 'stop':
        newStatus = false;
        break;
      case 'restart':
        // Stop then start
        await db.prisma.engineConfig.update({
          where: { id: userConfig.id },
          data: { isEnabled: false }
        });
        newStatus = true;
        break;
      default:
        throw new Error('Invalid action');
    }

    // Update engine configuration
    const updatedConfig = await db.prisma.engineConfig.update({
      where: { id: userConfig.id },
      data: {
        isEnabled: newStatus,
        lastRunAt: action === 'start' || action === 'restart' ? new Date() : userConfig.lastRunAt
      }
    });

    // Create audit log
    await db.prisma.auditLog.create({
      data: {
        userId,
        action: `engine_${action}`,
        entity: 'EngineConfig',
        entityId: engineId,
        metadata: {
          engineName: userConfig.engine.name,
          action,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Engine ${action}ed successfully`,
      status: newStatus ? 'RUNNING' : 'STOPPED',
      config: updatedConfig
    });

  } catch (error) {
    console.error('Engine control error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to control engine' },
      { status: 500 }
    );
  }
}

// Helper functions
function checkSubscriptionAccess(userTier: string, requiredTier: string): boolean {
  const tierLevels = {
    'FREE': 0,
    'BASIC': 1,
    'PREMIUM': 2,
    'VIP': 3
  };

  const userLevel = tierLevels[userTier as keyof typeof tierLevels] || 0;
  const requiredLevel = tierLevels[requiredTier as keyof typeof tierLevels] || 0;

  return userLevel >= requiredLevel;
}

function calculateDailyPnL(totalPnL: number, totalTrades: number): number {
  // Simple calculation: assume average daily activity over last 30 days
  const avgDailyTrades = totalTrades / 30;
  const avgPnLPerTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;
  return avgDailyTrades * avgPnLPerTrade;
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
