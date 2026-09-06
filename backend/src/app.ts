import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { checkDatabaseConnection } from './config/supabase.js';

export const app: Express = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
app.get(['/health', '/api/v1/health'], async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  if (dbStatus.ok) {
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: dbStatus.message,
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    });
  }
});

// Root fallback
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Pedago AI Backend API',
    version: '0.1.0',
    documentation: '/api/v1/docs',
  });
});
