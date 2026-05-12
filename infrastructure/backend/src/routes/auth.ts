// =============================================================================
// Auth Routes - Login, Register, Refresh
// =============================================================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set');
    console.error('   Set JWT_SECRET in .env before starting the server');
    process.exit(1);
  }
  return secret;
})();
const SESSION_EXPIRY = process.env.SESSION_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  role: z.enum(['Admin', 'Sales Team', 'Engineer', 'Accountant']).default('Sales Team'),
});

// Parse EMERGENCY_ADMINS from env. Supported formats:
// 1) JSON array string: [{"email":"a@b.com","hash":"$2a$...","name":"Admin"}, ...]
// 2) Semicolon-separated list: email:hashedPassword[:Name];email2:hash2
const EMERGENCY_ADMINS_RAW = process.env.EMERGENCY_ADMINS || '';
let EMERGENCY_ADMINS: Array<{ email: string; hash: string; name?: string }> = [];
if (EMERGENCY_ADMINS_RAW) {
  try {
    const parsed = JSON.parse(EMERGENCY_ADMINS_RAW);
    if (Array.isArray(parsed)) {
      EMERGENCY_ADMINS = parsed.map((p: any) => ({ email: String(p.email).toLowerCase(), hash: String(p.hash), name: p.name }));
    }
  } catch (e) {
    // try semicolon format
    EMERGENCY_ADMINS = EMERGENCY_ADMINS_RAW.split(';').map(s => {
      const parts = s.split(':');
      return { email: (parts[0] || '').toLowerCase(), hash: parts[1] || '', name: parts[2] };
    }).filter(a => a.email && a.hash);
  }
}

// ─── LOGIN ──────────────────────────────────────────────────────────────────
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await query(
      'SELECT id, email, password, role, name, active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    if (!user.active) {
      res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: SESSION_EXPIRY }
    );

    // Log the login
    await query(
      'INSERT INTO activity_log (user_email, action, entity_type, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [
        user.email,
        'LOGIN',
        'auth',
        JSON.stringify({ method: 'password' }),
        req.headers['cf-connecting-ip'] || req.ip,
      ]
    );

    // Set token in HTTPOnly cookie (secure, not accessible to JavaScript)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    res.cookie('auth_token', token, {
      httpOnly: true, // Not accessible to JavaScript (XSS protection)
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'strict' as const, // CSRF protection
      maxAge: maxAge, // 7 days
      path: '/',
    });

    // Return user info and token (legacy support - frontend should rely on cookie)
    res.json({
      token, // Keep for backwards compatibility
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── EMERGENCY LOGIN (local fallback) ───────────────────────────────────────
// Allows using locally configured admin accounts (EMERGENCY_ADMINS)
authRouter.post('/emergency-login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    if (EMERGENCY_ADMINS.length === 0) {
      res.status(404).json({ error: 'No emergency admin configured' });
      return;
    }

    const admin = EMERGENCY_ADMINS.find(a => a.email === email.toLowerCase());
    if (!admin) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const ok = await bcrypt.compare(password, admin.hash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: `local:${admin.email}`, email: admin.email }, JWT_SECRET, { expiresIn: SESSION_EXPIRY });

    // Set cookie
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge,
      path: '/',
    });

    // Log emergency login (no DB write if DB unavailable)
    try {
      await query(
        'INSERT INTO activity_log (user_email, action, entity_type, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [admin.email, 'EMERGENCY_LOGIN', 'auth', JSON.stringify({ method: 'emergency' }), req.headers['cf-connecting-ip'] || req.ip]
      );
    } catch (e) {
      // ignore logging errors (DB may be down)
    }

    res.json({ token, user: { id: `local:${admin.email}`, email: admin.email, role: 'Admin', name: admin.name || 'Local Admin' } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    console.error('Emergency login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── LOGIN WITH FALLBACK (tries DB first, falls back to emergency admins on DB error) ──
authRouter.post('/login-fallback', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    try {
      // Try normal DB login
      const result = await query(
        'SELECT id, email, password, role, name, active FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        // fall through to emergency if configured
        throw new Error('no_user_db');
      }

      const user = result.rows[0];
      if (!user.active) {
        res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
        return;
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: SESSION_EXPIRY });
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, maxAge, path: '/' });
      res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
      return;
    } catch (dbErr) {
      // If DB failed or user not found, try emergency admins
      if (EMERGENCY_ADMINS.length === 0) {
        // If no emergency admins configured, return DB error
        console.error('DB login failed and no emergency admins configured:', dbErr);
        res.status(500).json({ error: 'Authentication service unavailable' });
        return;
      }

      const admin = EMERGENCY_ADMINS.find(a => a.email === email.toLowerCase());
      if (!admin) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      const ok = await bcrypt.compare(password, admin.hash);
      if (!ok) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign({ userId: `local:${admin.email}`, email: admin.email }, JWT_SECRET, { expiresIn: SESSION_EXPIRY });
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, maxAge, path: '/' });
      res.json({ token, user: { id: `local:${admin.email}`, email: admin.email, role: 'Admin', name: admin.name || 'Local Admin' } });
      return;
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    console.error('Login-fallback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET CURRENT USER ───────────────────────────────────────────────────────
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// ─── LOGOUT ─────────────────────────────────────────────────────────────────
authRouter.post('/logout', (req: Request, res: Response) => {
  // Clear the HTTPOnly auth token cookie
  res.clearCookie('auth_token', { path: '/' });
  
  res.json({ message: 'Logged out successfully' });
});

// ─── REGISTER (Admin only) ─────────────────────────────────────────────────
authRouter.post('/register', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'Admin') {
      res.status(403).json({ error: 'Only admins can create users' });
      return;
    }

    const { email, password, name, role } = registerSchema.parse(req.body);

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await query(
      'INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id, email, role, name',
      [email.toLowerCase(), hashedPassword, role, name]
    );

    // Log the action
    await query(
      'INSERT INTO activity_log (user_email, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user.email, 'CREATE', 'user', result.rows[0].id, JSON.stringify({ created_email: email, role })]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CHANGE PASSWORD ────────────────────────────────────────────────────────
authRouter.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    });

    const { currentPassword, newPassword } = schema.parse(req.body);

    const result = await query('SELECT password FROM users WHERE id = $1', [req.user!.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);

    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user!.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
