/**
 * API Documentation Route - serves OpenAPI-style endpoint listing.
 * Used by: index.ts
 */
import { Router } from 'express';

const router = Router();

/** GET /api/docs - API documentation */
router.get('/', (_req, res) => {
  res.json({
    name: 'DeFi Sentinel API',
    version: '1.0.0',
    description: 'Autonomous DeFi Yield Optimization Agent API',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Health check with dependency status',
      },
      {
        method: 'GET',
        path: '/api/agent/state',
        description: 'Get current agent state, portfolio, and recent actions',
      },
      {
        method: 'POST',
        path: '/api/agent/start',
        description: 'Start the autonomous agent loop',
      },
      {
        method: 'POST',
        path: '/api/agent/stop',
        description: 'Gracefully stop the agent',
      },
      {
        method: 'POST',
        path: '/api/agent/emergency-stop',
        description: 'Emergency stop - halts all operations immediately',
      },
      {
        method: 'POST',
        path: '/api/agent/reset',
        description: 'Reset agent state and clear emergency stop',
      },
      {
        method: 'GET',
        path: '/api/agent/rates',
        description: 'Get real-time on-chain lending rates from Aave V3',
      },
      {
        method: 'GET',
        path: '/api/agent/opportunities',
        description: 'Get ranked yield opportunities',
      },
      {
        method: 'PUT',
        path: '/api/agent/limits',
        description: 'Update safety limits (maxTransactionUsd, dailySpendingLimitUsd, etc.)',
      },
      {
        method: 'GET',
        path: '/api/wallet',
        description: 'Get wallet address and real on-chain token balances',
        params: [{ name: 'chain', type: 'query', values: ['ethereum', 'polygon', 'arbitrum'] }],
      },
      {
        method: 'GET',
        path: '/api/audit',
        description: 'Get agent audit log with filtering',
        params: [
          { name: 'category', type: 'query', values: ['decision', 'execution', 'safety', 'system'] },
          { name: 'limit', type: 'query', description: 'Max entries to return' },
          { name: 'since', type: 'query', description: 'ISO timestamp filter' },
        ],
      },
      {
        method: 'GET',
        path: '/api/audit/stats',
        description: 'Get audit log statistics',
      },
      {
        method: 'GET',
        path: '/api/portfolio/history',
        description: 'Get portfolio value snapshots over time',
      },
      {
        method: 'GET',
        path: '/api/portfolio/performance',
        description: 'Get portfolio performance metrics (24h change, peak, avg APY)',
      },
      {
        method: 'GET',
        path: '/api/gas/estimate',
        description: 'Estimate gas cost for an operation',
        params: [
          { name: 'chain', type: 'query', required: true },
          { name: 'operation', type: 'query', values: ['aave_supply', 'aave_withdraw', 'swap', 'transfer'] },
        ],
      },
    ],
    websocket: {
      path: '/ws',
      description: 'Real-time agent events via WebSocket',
      events: ['state_update', 'action_executed', 'rate_update', 'error'],
    },
    dataSources: {
      rates: 'Direct RPC calls to Aave V3 Pool contracts (getReserveData)',
      prices: 'CoinGecko API (ETH, USDT, USDC, DAI)',
      ai: 'Azure OpenAI GPT-4.1 for strategy decisions',
      wallet: 'Tether WDK (Wallet Development Kit)',
    },
    chains: ['ethereum', 'polygon', 'arbitrum'],
  });
});

export default router;
