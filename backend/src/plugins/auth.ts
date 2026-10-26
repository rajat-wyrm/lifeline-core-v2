import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import { query } from '../db/client.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'DISPATCHER' | 'HOSPITAL_OPERATOR' | 'ADMIN' | 'AUDITOR' | 'VIEWER';
  full_name: string;
  hospital_id?: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser | null;
  }
}

export function hashPassword(password: string): string {
  // Deterministic standard SHA-256 for system accounts
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [`SES-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`, userId, tokenHash, expiresAt]
  );

  return token;
}

export async function revokeSession(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const res = await query(
    `UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function validateToken(token: string): Promise<AuthenticatedUser | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const res = await query(
    `SELECT u.id, u.email, u.role, u.full_name, u.hospital_id, u.is_active, s.expires_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.is_active = TRUE`,
    [tokenHash]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    full_name: row.full_name,
    hospital_id: row.hospital_id
  };
}

export const authPlugin: FastifyPluginAsync = async (app) => {
  // Decorate request with user
  app.decorateRequest('user', null);

  // Global preHandler hook to parse session cookie or Authorization header
  app.addHook('preHandler', async (request: FastifyRequest) => {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (request.cookies && (request.cookies as any).session_token) {
      token = (request.cookies as any).session_token;
    }

    if (token) {
      const user = await validateToken(token);
      if (user) {
        request.user = user;
      }
    }
  });
};

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user) {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Authentication session required. Please sign in via /login.'
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication session required. Please sign in.'
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: `Access denied. Role ${request.user.role} does not have required privileges: [${allowedRoles.join(', ')}].`
      });
    }
  };
};
