/**
 * Wallet routes - wallet info and balances via WDK.
 * Used by: index.ts
 */
import { Router } from 'express';
import { getWallet, getBalances, isWdkReady } from '../services/wdk-service.js';
import type { SupportedChain } from '../shared/constants.js';

const router = Router();

/** GET /api/wallet - wallet info for default chain */
router.get('/', async (_req, res) => {
  try {
    const chain = (_req.query.chain as SupportedChain) || 'ethereum';
    const wallet = await getWallet(chain);
    res.json({ wallet, wdkMode: isWdkReady() ? 'live' : 'simulation' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get wallet info' });
  }
});

/** GET /api/wallet/balances - token balances */
router.get('/balances', async (_req, res) => {
  try {
    const chain = (_req.query.chain as SupportedChain) || 'ethereum';
    const balances = await getBalances(chain);
    res.json({ balances, wdkMode: isWdkReady() ? 'live' : 'simulation' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get balances' });
  }
});

export default router;
