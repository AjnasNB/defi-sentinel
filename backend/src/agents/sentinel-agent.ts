/**
 * Sentinel Agent - the autonomous DeFi yield optimization agent.
 * Used by: agent-controller.ts
 *
 * Runs on an interval, monitors rates, evaluates strategies,
 * and executes actions via WDK with safety guardrails.
 */
import { v4 as uuidv4 } from 'crypto';
import { findBestOpportunities, fetchRates } from '../services/rate-monitor.js';
import { evaluateStrategy, getPortfolioMetrics } from '../services/strategy-engine.js';
import { executeSwap, executeLendingSupply, getWallet } from '../services/wdk-service.js';
import type { AgentState, AgentAction, PortfolioPosition, SafetyLimits } from '../shared/types.js';
import { config } from '../config.js';
import { MAX_ACTIONS_PER_HOUR } from '../shared/constants.js';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create the initial agent state */
export function createInitialState(): AgentState {
  return {
    isRunning: false,
    startedAt: null,
    totalActions: 0,
    totalValueManaged: 0,
    currentStrategy: 'Yield Optimization',
    lastCheck: null,
    actions: [],
    portfolio: getInitialPortfolio(),
    safetyLimits: {
      maxTransactionUsd: config.maxTransactionUsd,
      dailySpendingLimitUsd: config.dailySpendingLimitUsd,
      dailySpentUsd: 0,
      minYieldThresholdBps: config.minYieldThresholdBps,
      maxPositionPct: 40,
      emergencyStop: false,
    },
  };
}

/** Run one cycle of the agent's decision loop */
export async function runAgentCycle(state: AgentState): Promise<AgentState> {
  if (!state.isRunning || state.safetyLimits.emergencyStop) {
    return state;
  }

  // Rate limit: max actions per hour
  const recentActions = state.actions.filter(
    (a) => a.timestamp > Date.now() - 3_600_000
  );
  if (recentActions.length >= MAX_ACTIONS_PER_HOUR) {
    console.log('[Agent] Rate limit reached, skipping cycle');
    return { ...state, lastCheck: Date.now() };
  }

  console.log('[Agent] Running decision cycle...');

  try {
    // 1. Fetch current rates and opportunities
    const opportunities = await findBestOpportunities();
    const rates = await fetchRates();

    // 2. Evaluate strategy (LLM-powered when available, rule-based fallback)
    const decision = await evaluateStrategy(
      state.portfolio,
      opportunities,
      state.safetyLimits,
      rates
    );

    console.log(`[Agent] Decision: ${decision.action} — ${decision.reason} (confidence: ${decision.confidence})`);

    // 3. Execute if confidence is high enough
    if (decision.action !== 'hold' && decision.confidence >= 0.7) {
      const action = await executeDecision(decision, state);
      if (action) {
        state = applyAction(state, action);
      }
    }

    // 4. Log the check
    state = {
      ...state,
      lastCheck: Date.now(),
      totalValueManaged: getPortfolioMetrics(state.portfolio).totalValue,
    };

    // Log a monitoring action even if we held
    if (decision.action === 'hold') {
      const holdAction: AgentAction = {
        id: generateId(),
        timestamp: Date.now(),
        type: 'alert',
        chain: 'all',
        description: decision.reason,
        amountUsd: 0,
        status: 'success',
        details: { rates: rates.slice(0, 3) },
      };
      state.actions = [holdAction, ...state.actions].slice(0, 100);
    }
  } catch (err) {
    console.error('[Agent] Cycle error:', err);
    const errorAction: AgentAction = {
      id: generateId(),
      timestamp: Date.now(),
      type: 'alert',
      chain: 'all',
      description: `Error in cycle: ${err instanceof Error ? err.message : 'Unknown'}`,
      amountUsd: 0,
      status: 'failed',
      details: {},
    };
    state.actions = [errorAction, ...state.actions].slice(0, 100);
  }

  return state;
}

/** Execute a strategy decision */
async function executeDecision(
  decision: ReturnType<typeof evaluateStrategy>,
  state: AgentState
): Promise<AgentAction | null> {
  const params = decision.params || {};

  switch (decision.action) {
    case 'supply': {
      const result = await executeLendingSupply(
        (params.chain as any) || 'ethereum',
        (params.asset as string) || 'USDT',
        (params.amount as string) || '0'
      );

      return {
        id: generateId(),
        timestamp: Date.now(),
        type: 'supply',
        chain: (params.chain as string) || 'ethereum',
        description: decision.reason,
        amountUsd: parseFloat((params.amount as string) || '0'),
        txHash: result.txHash,
        status: result.status === 'success' ? 'success' : 'simulated',
        details: params,
      };
    }

    case 'swap': {
      const result = await executeSwap(
        (params.chain as any) || 'ethereum',
        (params.fromToken as string) || 'USDT',
        (params.toToken as string) || 'USDC',
        (params.amount as string) || '0'
      );

      return {
        id: generateId(),
        timestamp: Date.now(),
        type: 'swap',
        chain: (params.chain as string) || 'ethereum',
        description: decision.reason,
        amountUsd: parseFloat((params.amount as string) || '0'),
        txHash: result.txHash,
        status: result.status === 'success' ? 'success' : 'simulated',
        details: params,
      };
    }

    case 'rebalance': {
      return {
        id: generateId(),
        timestamp: Date.now(),
        type: 'rebalance',
        chain: (params.toChain as string) || (params.chain as string) || 'ethereum',
        description: decision.reason,
        amountUsd: parseFloat((params.amount as string) || '0'),
        txHash: `0xsim_rebal_${Date.now().toString(16)}`,
        status: 'simulated',
        details: params,
      };
    }

    default:
      return null;
  }
}

/** Apply an action to the agent state */
function applyAction(state: AgentState, action: AgentAction): AgentState {
  const newSpent = state.safetyLimits.dailySpentUsd + action.amountUsd;

  // Update portfolio based on action
  let portfolio = [...state.portfolio];
  if (action.type === 'supply' && action.details.asset) {
    // Move from idle to lending
    const asset = action.details.asset as string;
    const idleIdx = portfolio.findIndex((p) => p.asset === asset && p.type === 'idle');
    if (idleIdx >= 0) {
      portfolio[idleIdx] = {
        ...portfolio[idleIdx],
        valueUsd: Math.max(0, portfolio[idleIdx].valueUsd - action.amountUsd),
      };
    }

    // Add or update lending position
    const lendIdx = portfolio.findIndex(
      (p) => p.asset === asset && p.type === 'lending' && p.protocol === (action.details.protocol as string)
    );
    if (lendIdx >= 0) {
      portfolio[lendIdx] = {
        ...portfolio[lendIdx],
        valueUsd: portfolio[lendIdx].valueUsd + action.amountUsd,
      };
    } else {
      portfolio.push({
        chain: action.chain,
        protocol: (action.details.protocol as string) || 'Aave V3',
        asset,
        amount: action.amountUsd.toString(),
        valueUsd: action.amountUsd,
        apy: (action.details.apy as number) || 4.5,
        type: 'lending',
      });
    }
  }

  return {
    ...state,
    totalActions: state.totalActions + 1,
    actions: [action, ...state.actions].slice(0, 100),
    portfolio,
    safetyLimits: {
      ...state.safetyLimits,
      dailySpentUsd: newSpent,
    },
  };
}

/** Generate initial portfolio for demo */
function getInitialPortfolio(): PortfolioPosition[] {
  return [
    { chain: 'ethereum', protocol: 'Wallet', asset: 'USDT', amount: '3000', valueUsd: 3000, apy: 0, type: 'idle' },
    { chain: 'ethereum', protocol: 'Wallet', asset: 'USDC', amount: '2000', valueUsd: 2000, apy: 0, type: 'idle' },
    { chain: 'ethereum', protocol: 'Aave V3', asset: 'USDT', amount: '2000', valueUsd: 2000, apy: 4.2, type: 'lending' },
    { chain: 'polygon', protocol: 'Aave V3', asset: 'USDT', amount: '1500', valueUsd: 1500, apy: 5.5, type: 'lending' },
    { chain: 'arbitrum', protocol: 'Aave V3', asset: 'USDC', amount: '1000', valueUsd: 1000, apy: 5.7, type: 'lending' },
    { chain: 'ethereum', protocol: 'Wallet', asset: 'DAI', amount: '500', valueUsd: 500, apy: 0, type: 'idle' },
  ];
}
