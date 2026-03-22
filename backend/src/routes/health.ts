/**
 * Health check route.
 * Used by: index.ts
 */
import { Router } from 'express';
import { isWdkReady } from '../services/wdk-service.js';
import { isLlmReady } from '../services/llm-service.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    wdkReady: isWdkReady(),
    llmReady: isLlmReady(),
    uptime: process.uptime(),
  });
});

export default router;
