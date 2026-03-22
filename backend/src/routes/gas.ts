/**
 * Gas Estimation Routes - estimate transaction costs.
 * Used by: index.ts
 */
import { Router } from 'express';
import { estimateGasCostUsd, isProfitableAfterGas } from '../services/gas-estimator.js';

const router = Router();

/** GET /api/gas/estimate - estimate gas cost for an operation */
router.get('/estimate', async (req, res) => {
  try {
    const chain = (req.query.chain as string) || 'ethereum';
    const operation = (req.query.operation as string) || 'aave_supply';
    const estimate = await estimateGasCostUsd(chain, operation as any);
    res.json({ chain, operation, ...estimate });
  } catch (err) {
    res.status(500).json({ error: 'Gas estimation failed' });
  }
});

/** GET /api/gas/profitability - check if action is profitable after gas */
router.get('/profitability', async (req, res) => {
  try {
    const chain = (req.query.chain as string) || 'ethereum';
    const operation = (req.query.operation as string) || 'aave_supply';
    const amount = parseFloat(req.query.amount as string) || 100;
    const apy = parseFloat(req.query.apy as string) || 3;
    const days = parseInt(req.query.days as string) || 30;

    const result = await isProfitableAfterGas(chain, operation as any, amount, apy, days);
    res.json({ chain, operation, amountUsd: amount, apyPercent: apy, holdDays: days, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Profitability check failed' });
  }
});

export default router;
