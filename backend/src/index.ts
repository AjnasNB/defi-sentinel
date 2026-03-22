/**
 * DeFi Sentinel Backend - Express server + WebSocket for real-time updates.
 * Entry point for the backend application.
 */
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { config } from './config.js';
import { initializeWdk } from './services/wdk-service.js';
import { initializeLlm } from './services/llm-service.js';
import { subscribe } from './services/agent-controller.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import healthRoutes from './routes/health.js';
import agentRoutes from './routes/agent.js';
import walletRoutes from './routes/wallet.js';
import auditRoutes from './routes/audit.js';
import portfolioRoutes from './routes/portfolio.js';
import gasRoutes from './routes/gas.js';
import docsRoutes from './routes/docs.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter(120, 60_000));

// Routes
app.use('/api', healthRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/gas', gasRoutes);
app.use('/api/docs', docsRoutes);

// Error handler (must be last)
app.use(errorHandler);

// WebSocket for real-time agent events
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  const unsubscribe = subscribe((event) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    unsubscribe();
  });
});

// Start
async function start() {
  console.log('===========================================');
  console.log('  DeFi Sentinel - Autonomous Yield Agent');
  console.log('===========================================');

  await initializeWdk();
  initializeLlm();

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[Server] HTTP + WS on http://localhost:${config.port}`);
    console.log(`[Server] API Docs: http://localhost:${config.port}/api/docs`);
    console.log(`[Server] WebSocket: ws://localhost:${config.port}/ws`);
    console.log('===========================================');
  });
}

start().catch(console.error);
