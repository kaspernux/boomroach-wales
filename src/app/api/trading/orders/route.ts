import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const orderSchema = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  amount: z.number().positive(),
  price: z.number().positive().optional(),
  orderType: z.enum(['market', 'limit', 'stop_loss', 'take_profit']),
  slippage: z.number().min(0).max(20).default(3),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  engine: z.string().optional()
});

async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization token required');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  return decoded.userId;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);
    const body = await request.json();

    // Validate order data
    const validationResult = orderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const orderData = validationResult.data;

    // Get user to check trading permissions
    const userResult = await db.getUserById(userId);
    if (!userResult.success || !userResult.user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.user;
    if (!user.tradingEnabled) {
      return NextResponse.json(
        { success: false, error: 'Trading is not enabled for your account' },
        { status: 403 }
      );
    }

    // Get token configuration
    const tokenConfig = await db.prisma.tokenConfig.findFirst({
      where: { symbol: orderData.symbol }
    });

    if (!tokenConfig) {
      return NextResponse.json(
        { success: false, error: 'Token not supported' },
        { status: 400 }
      );
    }

    // For market orders, use current market price (simulated)
    let executionPrice = orderData.price;
    if (orderData.orderType === 'market') {
      // Simulate getting current market price
      executionPrice = orderData.symbol === 'BOOMROACH' ?
        0.000156 + (Math.random() - 0.5) * 0.000010 : // Small price variation
        100 + (Math.random() - 0.5) * 5; // For other tokens
    }

    const totalValue = orderData.amount * (executionPrice || 0);
    const fees = totalValue * 0.0025; // 0.25% fee

    // Create order record
    const order = await db.prisma.order.create({
      data: {
        userId,
        type: orderData.orderType.toUpperCase() as any,
        side: orderData.side,
        status: 'PENDING',
        tokenSymbol: orderData.symbol,
        tokenAddress: tokenConfig.address,
        amount: orderData.amount,
        price: orderData.price,
        totalValue,
        filled: 0,
        remaining: orderData.amount,
        stopLoss: orderData.stopLoss,
        takeProfit: orderData.takeProfit,
        engineId: orderData.engine,
        engineName: orderData.engine
      }
    });

    // Simulate order execution for market orders
    if (orderData.orderType === 'market') {
      // Update order status
      await db.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'FILLED',
          filled: orderData.amount,
          remaining: 0,
          executedAt: new Date()
        }
      });

      // Create trade record
      const trade = await db.createTrade({
        userId,
        orderId: order.id,
        type: 'MARKET',
        side: orderData.side,
        status: 'EXECUTED',
        tokenSymbol: orderData.symbol,
        tokenAddress: tokenConfig.address,
        amount: orderData.amount,
        price: executionPrice!,
        totalValue,
        fees,
        slippage: orderData.slippage,
        engineId: orderData.engine,
        engineName: orderData.engine
      });

      if (trade.success) {
        // Update trade with execution details
        await db.updateTradeStatus(trade.trade!.id, 'EXECUTED', {
          executedAt: new Date(),
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock transaction hash
          blockNumber: Math.floor(Math.random() * 1000000) + 200000000,
          blockTime: new Date()
        });
      }

      // Update user portfolio
      await db.updatePortfolioPosition(userId, tokenConfig.address, {
        tokenSymbol: orderData.symbol,
        tokenName: tokenConfig.name,
        amount: orderData.side === 'BUY' ? orderData.amount : -orderData.amount,
        averagePrice: executionPrice!,
        currentPrice: executionPrice!,
        totalInvested: orderData.side === 'BUY' ? totalValue : 0,
        currentValue: orderData.side === 'BUY' ? totalValue : 0
      });

      // Update user trading stats
      await db.updateUser(userId, {
        totalTrades: user.totalTrades + 1,
        lastActiveAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Order executed successfully',
        orderId: order.id,
        status: 'executed',
        executionPrice,
        fees,
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`
      });
    }

    // For limit orders, just return pending status
    return NextResponse.json({
      success: true,
      message: 'Order placed successfully',
      orderId: order.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Order placement error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to place order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);
    const { searchParams } = new URL(request.url);

    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = Number.parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    const whereClause: any = { userId };
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const orders = await db.prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        trades: true
      }
    });

    const totalCount = await db.prisma.order.count({
      where: whereClause
    });

    return NextResponse.json({
      success: true,
      orders,
      totalCount,
      hasMore: offset + orders.length < totalCount
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
