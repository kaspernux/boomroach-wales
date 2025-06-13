import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '@/lib/database';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request data
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { email, password, username, firstName, lastName } = validationResult.data;

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser.success && existingUser.user) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Check if username is taken
    const existingUsername = await db.prisma.user.findUnique({
      where: { username }
    });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const createResult = await db.createUser({
      email,
      username,
      passwordHash,
      firstName,
      lastName
    });

    if (!createResult.success || !createResult.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    const user = createResult.user;

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        subscriptionTier: user.subscriptionTier
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Create session record
    const session = await db.prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        ipAddress: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Create initial portfolio entry for BOOMROACH
    await db.prisma.portfolio.create({
      data: {
        userId: user.id,
        tokenSymbol: 'BOOMROACH',
        tokenAddress: 'FuYwSQfuLpAA36RqvKUDqw7x8Yjs2b1yRdtvwGq6pump',
        tokenName: 'BoomRoach',
        tokenDecimals: 9,
        balance: 0,
        averagePrice: 0,
        totalInvested: 0,
        currentValue: 0
      }
    });

    // Create welcome notification
    await db.prisma.notification.create({
      data: {
        userId: user.id,
        type: 'WELCOME',
        title: 'Welcome to BoomRoach!',
        message: 'Your account has been created successfully. Start trading with our AI engines!',
        priority: 'NORMAL'
      }
    });

    // Remove sensitive data before sending response
    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      token,
      refreshToken,
      user: safeUser
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
