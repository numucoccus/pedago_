import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  accessToken?: string;
}

export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Missing or invalid Authorization header',
      },
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired authentication token',
        },
        requestId: (req.headers['x-request-id'] as string) || 'unknown',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role,
    };
    req.accessToken = token;

    next();
  } catch (err: unknown) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to authenticate user',
      },
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    });
  }
}
