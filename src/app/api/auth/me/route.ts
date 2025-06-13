import { type NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user from database
    const result = await db.getUserById(decoded.userId);
    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.user;

    // Check if user is still active
    if (!user.isActive || user.isBanned) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive or banned' },
        { status: 403 }
      );
    }

    // Update last active time
    await db.updateUser(user.id, {
      lastActiveAt: new Date()
    });

    // Remove sensitive data before sending response
    const { passwordHash, resetToken, resetTokenExpiry, twoFactorSecret, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, avatar, username } = body;

    // Update user profile
    const result = await db.updateUser(decoded.userId, {
      firstName,
      lastName,
      avatar,
      username
    });

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Remove sensitive data before sending response
    const { passwordHash, resetToken, resetTokenExpiry, twoFactorSecret, ...safeUser } = result.user;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: safeUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
