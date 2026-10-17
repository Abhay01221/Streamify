import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from './errorHandler';
import { prisma } from '../utils/prisma';

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

interface JwtPayload {
  sessionId: string;
  userId: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isPremium: boolean;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    const session = await prisma.userSession.findFirst({ where: { id: payload.sessionId, userId: payload.userId, isActive: true } });
    if (!session) throw new AppError('Session expired', 401);
    // Check if user is banned
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, isAdmin: true, isPremium: true, isBanned: true },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (user.isBanned) {
      throw new AppError('Account has been suspended', 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isPremium: user.isPremium,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(err);
    }
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    const session = await prisma.userSession.findFirst({ where: { id: payload.sessionId, userId: payload.userId, isActive: true } });
    if (!session) return next();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, isAdmin: true, isPremium: true, isBanned: true },
    });

    if (user && !user.isBanned) {
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium,
      };
    }
  } catch {
    // Ignore auth errors for optional auth
  }
  next();
};

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isAdmin) {
    next(new AppError('Admin access required', 403));
    return;
  }
  next();
};

export const requirePremium = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isPremium && !req.user?.isAdmin) {
    next(new AppError('Premium subscription required', 403));
    return;
  }
  next();
};

export const generateTokens = async (user: {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isPremium: boolean;
}, existingSessionId?: string) => {
  const sessionId = existingSessionId || (await prisma.userSession.create({ data: { userId: user.id } })).id;
  const accessToken = jwt.sign(
    {
      userId: user.id, sessionId,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isPremium: user.isPremium,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, sessionId, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  await prisma.refreshToken.create({ data: { userId: user.id, token: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 86400000) } });
  return { accessToken, refreshToken };
};
