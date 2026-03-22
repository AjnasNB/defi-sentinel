/**
 * Strategy Engine - autonomous decision-making for DeFi yield optimization.
 * Used by: sentinel-agent.ts
 *
 * Evaluates current portfolio vs available opportunities and decides
 * whether to hold, swap, supply, withdraw, or rebalance.
 */
import type {
  StrategyDecision,
  PortfolioPosition,
  YieldOpportunity,
  SafetyLimits,
  RateData,
} from '../shared/types.js';
import { MIN_REBALANCE_THRESHOLD_BPS, MAX_POSITION_PCT } from '../shared/constants.js';
import { getAiDecision, isLlmReady } from './llm-service.js';

/** Evaluate the best action — uses LLM if available, falls back to rules */
export async function evaluateStrategy(
  portfolio: PortfolioPosition[],
  opportunities: YieldOpportunity[],
  limits: SafetyLimits,
  rates?: RateData[]
): Promise<StrategyDecision> {
  // Emergency stop check
  if (limits.emergencyStop) {
    return { action: 'hold', reason: 'Emergency stop is active', confidence: 1.0 };
  }

  // Daily spending limit check
  if (limits.dailySpentUsd >= limits.dailySpendingLimitUsd) {
    return { action: 'hold', reason: 'Daily spending limit reached', confidence: 1.0 };
  }

  // Try LLM-powered decision first
  if (isLlmReady() && rates && rates.length > 0) {
    try {
      const aiDecision = await getAiDecision(rates, portfolio, limits);
      if (aiDecision && aiDecision.action && aiDecision.confidence >= 0.6) {
        console.log('[Strategy] Using AI decision');
        return {
          action: aiDecision.action as StrategyDecision['action'],
          reason: `[AI] ${aiDecision.reason}`,
          confidence: aiDecision.confidence,
          params: aiDecision.params,
        };
      }
    } catch (err) {
      console.error('[Strategy] AI decision failed, falling back to rules:', err);
    }
  }

  // Fallback: rule-based strategy
  // Find idle capital
  const idlePositions = portfolio.filter((p) => p.type === 'idle');
  const totalIdleUsd = idlePositions.reduce((sum, p) => sum + p.valueUsd, 0);

  // If there's significant idle capital, find the best place to deploy it
  if (totalIdleUsd > 100) {
    const bestOpp = findSafestHighYield(opportunities, limits);
    if (bestOpp && bestOpp.apy > limits.minYieldThresholdBps / 100) {
      return {
        action: 'supply',
        reason: `Deploy $${totalIdleUsd.toFixed(0)} idle capital to ${bestOpp.protocol} ${bestOpp.asset} at ${bestOpp.apy.toFixed(2)}% APY`,
        confidence: 0.85,
        params: {
          protocol: bestOpp.protocol,
          chain: bestOpp.chain,
          asset: bestOpp.asset,
          amount: Math.min(totalIdleUsd, limits.maxTransactionUsd).toFixed(2),
          apy: bestOpp.apy,
        },
      };
    }
  }

  // Check if any current positions should be rebalanced
  const rebalanceDecision = checkRebalance(portfolio, opportunities, limits);
  if (rebalanceDecision) return rebalanceDecision;

  // Check for concentration risk
  const concentrationDecision = checkConcentrationRisk(portfolio, limits);
  if (concentrationDecision) return concentrationDecision;

  return {
    action: 'hold',
    reason: 'Portfolio is optimally allocated. No action needed.',
    confidence: 0.9,
  };
}

/** Find the safest high-yield opportunity */
function findSafestHighYield(
  opportunities: YieldOpportunity[],
  limits: SafetyLimits
): YieldOpportunity | null {
  // Filter by risk score (max 5) and sort by APY
  const safe = opportunities
    .filter((o) => o.riskScore <= 5)
    .sort((a, b) => b.apy - a.apy);

  return safe[0] || null;
}

/** Check if existing positions should be moved for better yield */
function checkRebalance(
  portfolio: PortfolioPosition[],
  opportunities: YieldOpportunity[],
  limits: SafetyLimits
): StrategyDecision | null {
  for (const position of portfolio) {
    if (position.type !== 'lending') continue;

    // Find better opportunity for the same asset
    const betterOpp = opportunities.find(
      (o) =>
        o.asset === position.asset &&
        o.apy - position.apy > MIN_REBALANCE_THRESHOLD_BPS / 100 &&
        o.riskScore <= 5
    );

    if (betterOpp) {
      const apyGain = betterOpp.apy - position.apy;
      return {
        action: 'rebalance',
        reason: `Move ${position.asset} from ${position.protocol} (${position.apy.toFixed(2)}%) to ${betterOpp.protocol} on ${betterOpp.chain} (${betterOpp.apy.toFixed(2)}%) — +${apyGain.toFixed(2)}% APY improvement`,
        confidence: apyGain > 1.0 ? 0.9 : 0.7,
        params: {
          fromProtocol: position.protocol,
          fromChain: position.chain,
          toProtocol: betterOpp.protocol,
          toChain: betterOpp.chain,
          asset: position.asset,
          amount: position.amount,
          apyGain,
        },
      };
    }
  }

  return null;
}

/** Check if portfolio is too concentrated in one position */
function checkConcentrationRisk(
  portfolio: PortfolioPosition[],
  limits: SafetyLimits
): StrategyDecision | null {
  const totalValue = portfolio.reduce((sum, p) => sum + p.valueUsd, 0);
  if (totalValue === 0) return null;

  for (const position of portfolio) {
    const pct = (position.valueUsd / totalValue) * 100;
    if (pct > (limits.maxPositionPct || MAX_POSITION_PCT)) {
      return {
        action: 'rebalance',
        reason: `${position.asset} on ${position.chain} is ${pct.toFixed(1)}% of portfolio (max ${limits.maxPositionPct}%). Diversifying.`,
        confidence: 0.75,
        params: {
          asset: position.asset,
          chain: position.chain,
          currentPct: pct,
          targetPct: limits.maxPositionPct || MAX_POSITION_PCT,
        },
      };
    }
  }

  return null;
}

/** Calculate portfolio health metrics */
export function getPortfolioMetrics(portfolio: PortfolioPosition[]) {
  const totalValue = portfolio.reduce((sum, p) => sum + p.valueUsd, 0);
  const weightedApy =
    totalValue > 0
      ? portfolio.reduce((sum, p) => sum + p.apy * (p.valueUsd / totalValue), 0)
      : 0;

  const idleValue = portfolio
    .filter((p) => p.type === 'idle')
    .reduce((sum, p) => sum + p.valueUsd, 0);

  const deployedValue = totalValue - idleValue;
  const deploymentRatio = totalValue > 0 ? (deployedValue / totalValue) * 100 : 0;

  return {
    totalValue,
    weightedApy,
    idleValue,
    deployedValue,
    deploymentRatio,
    positionCount: portfolio.filter((p) => p.type !== 'idle').length,
  };
}
