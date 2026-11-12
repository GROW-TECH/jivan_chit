import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db';
import type { User } from '../fund/src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'chitfund-secure-jwt-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Simple secure HMAC signed token: base64(payload).signature
export function createToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

export function verifyToken(token: string): { id: number; username: string; role: 'admin' | 'staff' | 'agent' } | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Authentication middleware — async because db.getUserById now queries MySQL
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }

  // Async user lookup from MySQL
  db.getUserById(payload.id)
    .then((user: any) => {
      if (!user || user.status !== 'active') {
        return res.status(401).json({ error: 'User account is inactive or not found.' });
      }
      const { passwordHash: _, ...safeUser } = user as any;
      req.user = safeUser;
      next();
    })
    .catch(() => {
      res.status(500).json({ error: 'Authentication error. Please try again.' });
    });
}

// Admin role check middleware
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const role = String(req.user?.role ?? '').toLowerCase().trim();
  const username = String(req.user?.username ?? '').toLowerCase().trim();
  if (!req.user || (role !== 'admin' && username !== 'admin')) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}
