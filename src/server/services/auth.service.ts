import { db } from '@/db/client';
import { users } from '@/db/schema';
import { hashPassword, verifyPassword, createSessionToken } from '@/server/auth/session';
import { BadRequestError, UnauthorizedError, NotFoundError } from '@/server/errors/app-error';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export class AuthService {
  static async register(data: { name: string; email: string; password: string }) {
    const existing = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      throw new BadRequestError('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const userId = `usr_${crypto.randomUUID()}`;

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
      })
      .returning();

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async login(data: { email: string; password: string }) {
    const [user] = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  static async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}

