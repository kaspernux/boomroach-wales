import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '@/lib/database';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request data
    const validationResult = loginSchema.safeParse(body);
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

    const { email, password } = validationResult.data;

    // Find user by email
    const result = await db.getUserByEmail(email);
    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.user;

    // Check if user is active and not banned
    if (!user.isActive || user.isBanned) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive or banned' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

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

    // Update last login time
    await db.updateUser(user.id, {
      lastLoginAt: new Date(),
      lastActiveAt: new Date()
    });

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

    // Remove sensitive data before sending response
    const { passwordHash, resetToken, resetTokenExpiry, twoFactorSecret, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: safeUser
    });

  } catch (error) {
    console.error('Login error:', error);
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
