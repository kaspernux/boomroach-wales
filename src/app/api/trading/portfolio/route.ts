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
  return decoded.userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);

    // Get user portfolio
    const portfolioResult = await db.getUserPortfolio(userId);
    if (!portfolioResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch portfolio' },
        { status: 500 }
      );
    }

    // Get recent trades for performance calculation
    const tradesResult = await db.getUserTrades(userId, { limit: 100 });

    // Calculate additional metrics
    const trades = tradesResult.success ? tradesResult.trades : [];
    const executedTrades = trades.filter(t => t.status === 'EXECUTED');
    const winningTrades = executedTrades.filter(t => t.realizedPnL > 0);

    const analytics = {
      totalTrades: executedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: executedTrades.length - winningTrades.length,
      winRate: executedTrades.length > 0 ? (winningTrades.length / executedTrades.length) * 100 : 0,
      averageWin: winningTrades.length > 0 ?
        winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0) / winningTrades.length : 0,
      averageLoss: (executedTrades.length - winningTrades.length) > 0 ?
        executedTrades.filter(t => t.realizedPnL <= 0).reduce((sum, t) => sum + t.realizedPnL, 0) / (executedTrades.length - winningTrades.length) : 0,
      totalVolume: trades.reduce((sum, t) => sum + t.totalValue, 0)
    };

    return NextResponse.json({
      success: true,
      portfolio: portfolioResult.portfolio,
      positions: portfolioResult.positions,
      analytics,
      trades: trades.slice(0, 10) // Last 10 trades
    });

  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateUser(request);
    const body = await request.json();

    const { tokenAddress, tokenSymbol, tokenName, amount, price, action } = body;

    if (!tokenAddress || !tokenSymbol || amount === undefined || !price || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate portfolio update based on action
    let portfolioUpdate: any = {};

    if (action === 'buy') {
      portfolioUpdate = {
        amount: amount,
        averagePrice: price,
        currentPrice: price,
        totalInvested: amount * price,
        currentValue: amount * price,
        unrealizedPnL: 0,
        realizedPnL: 0
      };
    } else if (action === 'sell') {
      // Get current position
      const currentPosition = await db.prisma.portfolio.findUnique({
        where: {
          userId_tokenAddress: {
            userId,
            tokenAddress
          }
        }
      });

      if (!currentPosition || currentPosition.balance < amount) {
        return NextResponse.json(
          { success: false, error: 'Insufficient balance for sale' },
          { status: 400 }
        );
      }

      const remainingAmount = currentPosition.balance - amount;
      const saleValue = amount * price;
      const realizedPnL = saleValue - (amount * currentPosition.averagePrice);

      portfolioUpdate = {
        amount: remainingAmount,
        currentPrice: price,
        currentValue: remainingAmount * price,
        realizedPnL: currentPosition.realizedPnL + realizedPnL,
        unrealizedPnL: remainingAmount > 0 ? (price - currentPosition.averagePrice) * remainingAmount : 0
      };
    }

    // Update portfolio position
    const result = await db.updatePortfolioPosition(userId, tokenAddress, {
      tokenSymbol,
      tokenName,
      ...portfolioUpdate
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update portfolio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Portfolio updated successfully',
      position: result.position
    });

  } catch (error) {
    console.error('Portfolio update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
