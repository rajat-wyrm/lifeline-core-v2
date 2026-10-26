import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query } from '../db/client.js';
import { hashPassword, requireRole } from '../plugins/auth.js';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['DISPATCHER', 'HOSPITAL_OPERATOR', 'ADMIN', 'AUDITOR', 'VIEWER']),
  full_name: z.string().min(2),
  hospital_id: z.string().optional()
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  // List users (Admin only)
  app.get('/api/v2/users', async (request, reply) => {
    const res = await query(
      `SELECT u.id, u.email, u.role, u.full_name, u.hospital_id, u.is_active, u.created_at, h.name as hospital_name
       FROM users u
       LEFT JOIN hospitals h ON u.hospital_id = h.id
       ORDER BY u.created_at DESC`
    );
    return { count: res.rows.length, data: res.rows };
  });

  // Create user
  app.post('/api/v2/users', async (request, reply) => {
    const parse = CreateUserSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parse.error.format() });
    }

    const { email, password, role, full_name, hospital_id } = parse.data;
    const userId = `USR-${role.substring(0, 4)}-${Date.now()}`;
    const pwdHash = hashPassword(password);

    try {
      const res = await query(
        `INSERT INTO users (id, email, password_hash, role, full_name, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, role, full_name, hospital_id, is_active, created_at`,
        [userId, email, pwdHash, role, full_name, hospital_id || null]
      );
      return { success: true, user: res.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') {
        return reply.status(409).send({ error: 'USER_EXISTS', message: 'A user with this email address already exists.' });
      }
      throw err;
    }
  });
};
