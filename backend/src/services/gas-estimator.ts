/**
 * Gas Estimator Service - estimates transaction costs before execution.
 * Used by: strategy-engine.ts, sentinel-agent.ts
 *
 * Fetches real gas prices from chain RPCs and estimates whether
 * a yield action is profitable after gas costs.
 */

const GAS_CACHE: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 30_000;

// Approximate gas units for common DeFi operations
const GAS_ESTIMATES: Record<string, number> = {
  erc20_approve: 46_000,
  aave_supply: 250_000,
  aave_withdraw: 300_000,
  swap: 180_000,
  transfer: 65_000,
};

const RPC_URLS: Record<string, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
};

// Native token USD prices (updated from CoinGecko in wdk-service)
const NATIVE_PRICES: Record<string, number> = {
  ethereum: 2000,
  polygon: 0.5,
  arbitrum: 2000,
};

/** Fetch current gas price for a chain */
async function getGasPrice(chain: string): Promise<number> {
  const cached = GAS_CACHE[chain];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  const rpc = RPC_URLS[chain];
  if (!rpc) return 30; // default 30 gwei

  try {
    const resp = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
    });
    const data = await resp.json();
    const gweiPrice = Number(BigInt(data.result || '0x0')) / 1e9;

    GAS_CACHE[chain] = { price: gweiPrice, timestamp: Date.now() };
    return gweiPrice;
  } catch {
    return 30;
  }
}

/** Update native token price (called from wdk-service) */
export function updateNativePrice(chain: string, priceUsd: number): void {
  NATIVE_PRICES[chain] = priceUsd;
}

/** Estimate gas cost in USD for an operation */
export async function estimateGasCostUsd(
  chain: string,
  operation: keyof typeof GAS_ESTIMATES
): Promise<{ gasUnits: number; gasPriceGwei: number; costUsd: number }> {
  const gasUnits = GAS_ESTIMATES[operation] || 200_000;
  const gasPriceGwei = await getGasPrice(chain);
  const nativePrice = NATIVE_PRICES[chain] || 2000;

  // Cost = gasUnits * gasPriceGwei * 1e-9 * nativePriceUsd
  const costUsd = gasUnits * gasPriceGwei * 1e-9 * nativePrice;

  return { gasUnits, gasPriceGwei, costUsd: Math.round(costUsd * 100) / 100 };
}

/** Check if a yield action is profitable after gas costs */
export async function isProfitableAfterGas(
  chain: string,
  operation: keyof typeof GAS_ESTIMATES,
  amountUsd: number,
  apyPercent: number,
  holdDays = 30
): Promise<{ profitable: boolean; gasCostUsd: number; expectedYieldUsd: number; netUsd: number }> {
  const { costUsd: gasCostUsd } = await estimateGasCostUsd(chain, operation);
  const expectedYieldUsd = (amountUsd * apyPercent) / 100 / 365 * holdDays;
  const netUsd = expectedYieldUsd - gasCostUsd;

  return {
    profitable: netUsd > 0,
    gasCostUsd,
    expectedYieldUsd: Math.round(expectedYieldUsd * 100) / 100,
    netUsd: Math.round(netUsd * 100) / 100,
  };
}
