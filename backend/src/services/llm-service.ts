/**
 * LLM Service - Azure OpenAI integration for intelligent agent decisions.
 * Used by: strategy-engine.ts, sentinel-agent.ts
 *
 * Provides AI-powered market analysis and strategy recommendations
 * using GPT-4 via Azure OpenAI.
 */
import { AzureOpenAI } from 'openai';
import { config } from '../config.js';
import type { RateData, PortfolioPosition, SafetyLimits } from '../shared/types.js';

let client: AzureOpenAI | null = null;
let isLlmAvailable = false;

const SYSTEM_PROMPT = `You are DeFi Sentinel, an autonomous DeFi yield optimization agent.
You manage a self-custodial portfolio across Ethereum, Polygon, and Arbitrum using Tether's WDK.

Your role:
1. Analyze current DeFi lending rates across protocols and chains
2. Evaluate the portfolio's current positions vs available opportunities
3. Recommend specific actions (supply, withdraw, rebalance, or hold)
4. Always explain your reasoning with economic justification

Safety rules you MUST follow:
- Never recommend exceeding the per-transaction limit
- Never recommend exceeding the daily spending cap
- Never recommend putting more than the max position % in one asset/chain
- Prefer established protocols (Aave V3) over unknown ones
- Factor in gas costs — small rebalances may not be worth it
- When in doubt, recommend HOLD

Response format: Return a JSON object with:
{
  "action": "hold" | "supply" | "withdraw" | "rebalance",
  "reason": "Clear explanation of why this action (2-3 sentences)",
  "confidence": 0.0-1.0,
  "params": {
    "chain": "ethereum|polygon|arbitrum",
    "asset": "USDT|USDC|DAI",
    "protocol": "Aave V3",
    "amount": "100.00",
    "apy": 5.5
  }
}

Only return the JSON, no markdown fences or extra text.`;

/** Initialize the Azure OpenAI client */
export function initializeLlm(): void {
  if (!config.azureOpenaiApiKey || !config.azureOpenaiEndpoint) {
    console.log('[LLM] No Azure OpenAI credentials — running without AI');
    return;
  }

  try {
    client = new AzureOpenAI({
      apiKey: config.azureOpenaiApiKey,
      endpoint: config.azureOpenaiEndpoint,
      apiVersion: config.azureOpenaiApiVersion,
      deployment: config.azureOpenaiDeployment,
    });
    isLlmAvailable = true;
    console.log('[LLM] Azure OpenAI initialized (deployment:', config.azureOpenaiDeployment + ')');
  } catch (err) {
    console.error('[LLM] Init failed:', err);
    isLlmAvailable = false;
  }
}

/** Ask the LLM to analyze rates and recommend an action */
export async function getAiDecision(
  rates: RateData[],
  portfolio: PortfolioPosition[],
  limits: SafetyLimits
): Promise<{
  action: string;
  reason: string;
  confidence: number;
  params?: Record<string, unknown>;
} | null> {
  if (!isLlmAvailable || !client) return null;

  const prompt = buildAnalysisPrompt(rates, portfolio, limits);

  try {
    const response = await client.chat.completions.create({
      model: config.azureOpenaiDeployment,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON response
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const decision = JSON.parse(cleaned);

    console.log(`[LLM] AI Decision: ${decision.action} — ${decision.reason}`);
    return decision;
  } catch (err) {
    console.error('[LLM] API call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Build the analysis prompt with current market data */
function buildAnalysisPrompt(
  rates: RateData[],
  portfolio: PortfolioPosition[],
  limits: SafetyLimits
): string {
  const totalValue = portfolio.reduce((sum, p) => sum + p.valueUsd, 0);
  const idleValue = portfolio.filter(p => p.type === 'idle').reduce((sum, p) => sum + p.valueUsd, 0);

  return `CURRENT MARKET RATES:
${rates.map(r => `  ${r.asset} on ${r.chain} (${r.protocol}): Supply ${r.supplyApy.toFixed(2)}% APY | Borrow ${r.borrowApy.toFixed(2)}% | Utilization ${r.utilization.toFixed(0)}%`).join('\n')}

CURRENT PORTFOLIO ($${totalValue.toLocaleString()} total, $${idleValue.toLocaleString()} idle):
${portfolio.map(p => `  ${p.asset} on ${p.chain} (${p.protocol}): $${p.valueUsd.toLocaleString()} | APY ${p.apy}% | Type: ${p.type}`).join('\n')}

SAFETY LIMITS:
  Max per transaction: $${limits.maxTransactionUsd}
  Daily cap remaining: $${limits.dailySpendingLimitUsd - limits.dailySpentUsd}
  Max position size: ${limits.maxPositionPct}% of portfolio
  Min yield threshold: ${limits.minYieldThresholdBps} basis points

What action should I take? Analyze the rates, find the best risk-adjusted opportunity, and recommend a specific action.`;
}

/** Check if LLM is available */
export function isLlmReady(): boolean {
  return isLlmAvailable;
}
