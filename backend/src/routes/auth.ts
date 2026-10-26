import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query } from '../db/client.js';
import { hashPassword, createSession, revokeSession, requireAuth } from '../plugins/auth.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Login
  app.post('/api/v2/auth/login', async (request, reply) => {
    const parse = LoginSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parse.error.format() });
    }

    const { email, password } = parse.data;
    const pwdHash = hashPassword(password);

    const userRes = await query(
      `SELECT id, email, role, full_name, hospital_id, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1) AND password_hash = $2`,
      [email, pwdHash]
    );

    if (userRes.rows.length === 0) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email address or password.'
      });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return reply.status(403).send({
        error: 'ACCOUNT_DISABLED',
        message: 'Your operator account is currently disabled. Contact administrator.'
      });
    }

    const token = await createSession(user.id);

    // Set secure HttpOnly cookie
    reply.setCookie('session_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Localhost dev friendly
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        hospital_id: user.hospital_id
      }
    };
  });

  // Logout
  app.post('/api/v2/auth/logout', async (request, reply) => {
    let token: string | undefined;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (request.cookies && (request.cookies as any).session_token) {
      token = (request.cookies as any).session_token;
    }

    if (token) {
      await revokeSession(token);
    }

    reply.clearCookie('session_token', { path: '/' });
    return { success: true, message: 'Session logged out successfully.' };
  });

  // Get current user profile
  app.get('/api/v2/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    return { user: request.user };
  });

  // Get list of demo users for rapid role-switching
  app.get('/api/v2/auth/demo-users', async () => {
    const res = await query(
      `SELECT id, email, role, full_name, hospital_id FROM users WHERE is_active = TRUE ORDER BY role ASC`
    );
    return {
      default_password: 'Lifeline@2026',
      users: res.rows
    };
  });
};
