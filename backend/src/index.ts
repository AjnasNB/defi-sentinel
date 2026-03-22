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
import healthRoutes from './routes/health.js';
import agentRoutes from './routes/agent.js';
import walletRoutes from './routes/wallet.js';

const app = express();
const server = createServer(app);

// Middleware — allow all origins in production for hackathon demo
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/wallet', walletRoutes);

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
  console.log('=================================');
  console.log('  DeFi Sentinel - Starting...');
  console.log('=================================');

  // Initialize WDK + LLM
  await initializeWdk();
  initializeLlm();

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[Server] HTTP + WS on http://localhost:${config.port}`);
    console.log(`[Server] Health: http://localhost:${config.port}/api/health`);
    console.log(`[Server] WebSocket: ws://localhost:${config.port}/ws`);
    console.log('=================================');
  });
}

start().catch(console.error);
