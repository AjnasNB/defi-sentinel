/**
 * Request Logger Middleware - structured logging for all API requests.
 * Used by: index.ts
 */
import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  ip: string;
  userAgent: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 500;

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: (req.headers['user-agent'] || 'unknown').slice(0, 100),
    };

    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();

    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(
      `${color}[API]\x1b[0m ${req.method} ${req.path} → ${res.statusCode} (${entry.duration}ms)`
    );
  });

  next();
}

/** Get recent API logs */
export function getRecentLogs(limit = 50): LogEntry[] {
  return logs.slice(-limit).reverse();
}
