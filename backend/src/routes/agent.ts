/**
 * Agent control routes - start, stop, status, emergency stop.
 * Used by: index.ts
 */
import { Router } from 'express';
import {
  startAgent,
  stopAgent,
  getAgentState,
  emergencyStop,
  resetAgent,
  updateLimits,
} from '../services/agent-controller.js';
import { fetchRates, findBestOpportunities } from '../services/rate-monitor.js';
import { getPortfolioMetrics } from '../services/strategy-engine.js';

const router = Router();

/** GET /api/agent/state - current agent state */
router.get('/state', (_req, res) => {
  const state = getAgentState();
  const metrics = getPortfolioMetrics(state.portfolio);
  res.json({ ...state, metrics });
});

/** POST /api/agent/start - start the agent */
router.post('/start', (_req, res) => {
  const state = startAgent();
  res.json({ message: 'Agent started', state });
});

/** POST /api/agent/stop - stop the agent */
router.post('/stop', (_req, res) => {
  const state = stopAgent();
  res.json({ message: 'Agent stopped', state });
});

/** POST /api/agent/emergency-stop - emergency stop */
router.post('/emergency-stop', (_req, res) => {
  const state = emergencyStop();
  res.json({ message: 'EMERGENCY STOP activated', state });
});

/** POST /api/agent/reset - reset emergency stop and daily counters */
router.post('/reset', (_req, res) => {
  const state = resetAgent();
  res.json({ message: 'Agent reset', state });
});

/** PUT /api/agent/limits - update safety limits */
router.put('/limits', (req, res) => {
  const state = updateLimits(req.body);
  res.json({ message: 'Limits updated', state });
});

/** GET /api/agent/rates - current DeFi rates */
router.get('/rates', async (_req, res) => {
  try {
    const rates = await fetchRates();
    res.json({ rates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

/** GET /api/agent/opportunities - best yield opportunities */
router.get('/opportunities', async (_req, res) => {
  try {
    const opportunities = await findBestOpportunities();
    res.json({ opportunities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

/** GET /api/agent/actions - recent actions log */
router.get('/actions', (_req, res) => {
  const state = getAgentState();
  const limit = parseInt((_req.query?.limit as string) || '50', 10);
  res.json({ actions: state.actions.slice(0, limit) });
});

export default router;
