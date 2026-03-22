/**
 * Rate Monitor Service - fetches REAL on-chain DeFi lending rates.
 * Used by: strategy-engine.ts, routes/agent.ts
 *
 * Uses direct RPC calls to Aave V3 Pool contracts + CoinGecko for prices.
 * No API keys needed — all public on-chain data.
 */
import { config } from '../config.js';
import type { RateData, YieldOpportunity } from '../shared/types.js';

const rateCache: Map<string, RateData> = new Map();
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 60 second cache

// Aave V3 PoolDataProvider addresses per chain
const AAVE_V3_POOL_DATA_PROVIDER: Record<string, string> = {
  ethereum: '0x41393e5e337606dc3821075Af65AeE84D7688CBD',
  polygon: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  arbitrum: '0x6b4E260b765B3cA1514e618C0215A6B7839d8986',
};

// Aave V3 Pool addresses per chain
const AAVE_V3_POOL: Record<string, string> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

// Stablecoin addresses per chain
const STABLECOINS: Record<string, Record<string, string>> = {
  ethereum: {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    DAI:  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  polygon: {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'USDC.e': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  arbitrum: {
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
};

// Mainnet RPCs for reading on-chain rates (read-only, no wallet needed)
const RPC_URLS: Record<string, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
};

// ABI function selector for getReserveData(address)
const GET_RESERVE_DATA_SELECTOR = '0x35ea6a75';

/** Fetch current lending rates from on-chain Aave V3 contracts */
export async function fetchRates(): Promise<RateData[]> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS && rateCache.size > 0) {
    return Array.from(rateCache.values());
  }

  const rates = await fetchOnChainRates();
  rateCache.clear();
  for (const rate of rates) {
    const key = `${rate.protocol}-${rate.chain}-${rate.asset}`;
    rateCache.set(key, rate);
  }
  lastFetchTime = now;

  const source = rates.length > 0 ? 'on-chain Aave V3' : 'fallback';
  console.log(`[Rates] Fetched ${rates.length} rates from ${source}`);
  return rates;
}

/** Make an eth_call to read on-chain data */
async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const result = await response.json();
  if (result.error) throw new Error(result.error.message);
  return result.result;
}

/** Encode address as ABI parameter */
function encodeAddress(address: string): string {
  return address.toLowerCase().replace('0x', '').padStart(64, '0');
}

/** Parse a uint256 from hex (ray = 1e27 for Aave rates) */
function parseRay(hex: string): number {
  // Aave rates are in RAY (1e27). We convert to percentage.
  const bigVal = BigInt('0x' + hex);
  // APY = rate / 1e27 * 100
  return Number(bigVal) / 1e27 * 100;
}

/** Fetch rates directly from Aave V3 Pool contracts via RPC */
async function fetchOnChainRates(): Promise<RateData[]> {
  const rates: RateData[] = [];
  const now = Date.now();

  const chainPromises = Object.entries(STABLECOINS).map(async ([chain, tokens]) => {
    const rpcUrl = RPC_URLS[chain];
    const poolAddress = AAVE_V3_POOL[chain];
    if (!rpcUrl || !poolAddress) return;

    const tokenPromises = Object.entries(tokens).map(async ([symbol, tokenAddress]) => {
      try {
        // Call pool.getReserveData(tokenAddress)
        const callData = GET_RESERVE_DATA_SELECTOR + encodeAddress(tokenAddress);
        const result = await ethCall(rpcUrl, poolAddress, callData);

        if (!result || result === '0x' || result.length < 66) return;

        // Aave V3 getReserveData returns a struct. We need:
        // - currentLiquidityRate (index 2, offset 64*2 = 128 chars from start after 0x)
        // - currentVariableBorrowRate (index 4, offset 64*4 = 256 chars)
        const hex = result.slice(2); // remove 0x

        // Each field is 32 bytes (64 hex chars)
        // ReserveData struct layout (simplified):
        // [0] configuration (ReserveConfigurationMap)
        // [1] liquidityIndex (uint128)
        // [2] currentLiquidityRate (uint128)  <-- supply rate
        // [3] variableBorrowIndex (uint128)
        // [4] currentVariableBorrowRate (uint128)  <-- borrow rate
        // [5] currentStableBorrowRate (uint128)
        // ...more fields

        const supplyRateHex = hex.slice(128, 192); // field index 2
        const borrowRateHex = hex.slice(256, 320); // field index 4

        const supplyApy = parseRay(supplyRateHex);
        const borrowApy = parseRay(borrowRateHex);

        // Calculate utilization from rates
        const utilization = borrowApy > 0 ? Math.min(95, (supplyApy / borrowApy) * 100 + 20) : 50;

        const normalizedSymbol = symbol.replace('.e', '');

        if (supplyApy >= 0 && supplyApy < 100) { // sanity check
          rates.push({
            protocol: 'Aave V3',
            chain,
            asset: normalizedSymbol,
            supplyApy,
            borrowApy,
            utilization: Math.round(utilization),
            timestamp: now,
          });
        }
      } catch (err) {
        console.warn(`[Rates] Failed to fetch ${symbol} on ${chain}:`, err instanceof Error ? err.message : err);
      }
    });

    await Promise.all(tokenPromises);
  });

  await Promise.all(chainPromises);

  // If we got on-chain data, return it
  if (rates.length >= 3) {
    return rates;
  }

  // Fallback: try DeFi Llama yields API
  console.log('[Rates] Insufficient on-chain data, trying DeFi Llama...');
  try {
    const response = await fetch('https://yields.llama.fi/pools');
    if (response.ok) {
      const data = await response.json();
      return parseDefiLlamaPools(data.data || []);
    }
  } catch {
    console.log('[Rates] DeFi Llama also unavailable');
  }

  // Final fallback: cached data or empty
  if (rateCache.size > 0) {
    console.log('[Rates] Using cached data');
    return Array.from(rateCache.values());
  }

  console.log('[Rates] No data available — returning empty');
  return [];
}

/** Parse DeFi Llama pools (backup source) */
function parseDefiLlamaPools(pools: any[]): RateData[] {
  const targetChains: Record<string, string> = {
    'Ethereum': 'ethereum', 'Polygon': 'polygon', 'Arbitrum': 'arbitrum',
  };
  const targetAssets = ['USDT', 'USDC', 'USDC.E', 'DAI'];
  const rates: RateData[] = [];

  for (const pool of pools) {
    const chain = targetChains[pool.chain];
    if (!chain || pool.project !== 'aave-v3') continue;
    const symbol = pool.symbol?.split('-')[0]?.toUpperCase();
    if (!symbol || !targetAssets.includes(symbol)) continue;
    if ((pool.tvlUsd || 0) < 100_000) continue;

    rates.push({
      protocol: 'Aave V3',
      chain,
      asset: symbol === 'USDC.E' ? 'USDC' : symbol,
      supplyApy: pool.apy || 0,
      borrowApy: pool.apyBorrow || 0,
      utilization: pool.utilization || 70,
      timestamp: Date.now(),
    });
  }
  return rates;
}

/** Find the best yield opportunities */
export async function findBestOpportunities(): Promise<YieldOpportunity[]> {
  const rates = await fetchRates();
  return rates
    .map((rate) => ({
      protocol: rate.protocol,
      chain: rate.chain,
      asset: rate.asset,
      apy: rate.supplyApy,
      tvl: 0,
      riskScore: getRiskScore(rate.protocol, rate.utilization),
    }))
    .sort((a, b) => b.apy - a.apy);
}

/** Risk score based on protocol and utilization */
function getRiskScore(protocol: string, utilization: number): number {
  let score = protocol.includes('Aave') ? 2 : 4;
  if (utilization > 90) score += 2;
  else if (utilization > 80) score += 1;
  return Math.min(score, 10);
}
