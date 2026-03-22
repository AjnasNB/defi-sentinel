/**
 * Portfolio Routes - portfolio history and performance metrics.
 * Used by: index.ts
 */
import { Router } from 'express';
import { getPortfolioHistory, getPerformanceMetrics } from '../services/portfolio-tracker.js';

const router = Router();

/** GET /api/portfolio/history - get portfolio snapshots over time */
router.get('/history', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  res.json({ snapshots: getPortfolioHistory(limit) });
});

/** GET /api/portfolio/performance - get performance metrics */
router.get('/performance', (_req, res) => {
  res.json(getPerformanceMetrics());
});

export default router;
