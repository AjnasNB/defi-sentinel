/**
 * Shared type definitions for DeFi Sentinel.
 * Used by: all backend modules.
 */

export interface WalletInfo {
  address: string;
  blockchain: string;
  balances: TokenBalance[];
}

export interface TokenBalance {
  token: string;
  symbol: string;
  balance: string;
  balanceUsd: number;
}

export interface YieldOpportunity {
  protocol: string;
  chain: string;
  asset: string;
  apy: number;
  tvl: number;
  riskScore: number; // 1-10, lower = safer
}

export interface AgentAction {
  id: string;
  timestamp: number;
  type: 'swap' | 'supply' | 'withdraw' | 'rebalance' | 'alert';
  chain: string;
  description: string;
  amountUsd: number;
  txHash?: string;
  status: 'pending' | 'success' | 'failed' | 'simulated';
  details: Record<string, unknown>;
}

export interface AgentState {
  isRunning: boolean;
  startedAt: number | null;
  totalActions: number;
  totalValueManaged: number;
  currentStrategy: string;
  lastCheck: number | null;
  actions: AgentAction[];
  portfolio: PortfolioPosition[];
  safetyLimits: SafetyLimits;
}

export interface PortfolioPosition {
  chain: string;
  protocol: string;
  asset: string;
  amount: string;
  valueUsd: number;
  apy: number;
  type: 'lending' | 'liquidity' | 'idle';
}

export interface SafetyLimits {
  maxTransactionUsd: number;
  dailySpendingLimitUsd: number;
  dailySpentUsd: number;
  minYieldThresholdBps: number;
  maxPositionPct: number; // max % of portfolio in one position
  emergencyStop: boolean;
}

export interface StrategyDecision {
  action: 'hold' | 'swap' | 'supply' | 'withdraw' | 'rebalance';
  reason: string;
  confidence: number; // 0-1
  params?: Record<string, unknown>;
}

export interface RateData {
  protocol: string;
  chain: string;
  asset: string;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  timestamp: number;
}

export type AgentEvent = {
  type: 'state_update' | 'action' | 'error' | 'rate_update';
  data: unknown;
  timestamp: number;
};
