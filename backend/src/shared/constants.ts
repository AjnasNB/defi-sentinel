/**
 * Application constants for DeFi Sentinel.
 * Used by: config, services, agents.
 */

export const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum'] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const CHAIN_RPC_DEFAULTS: Record<SupportedChain, string> = {
  ethereum: 'https://ethereum-sepolia-rpc.publicnode.com',
  polygon: 'https://polygon-amoy-bor-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-sepolia-rpc.publicnode.com',
};

export const STABLECOINS = ['USDT', 'USDC', 'DAI'] as const;

/** Minimum APY difference (in bps) to trigger a rebalance */
export const MIN_REBALANCE_THRESHOLD_BPS = 50;

/** Maximum percentage of portfolio in a single position */
export const MAX_POSITION_PCT = 40;

/** How often the agent checks for opportunities (ms) */
export const DEFAULT_CHECK_INTERVAL_MS = 30_000;

/** Safety: maximum actions per hour */
export const MAX_ACTIONS_PER_HOUR = 20;
