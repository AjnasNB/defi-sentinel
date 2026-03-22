/**
 * WDK Wallet Service - manages self-custodial wallets via Tether WDK.
 * Used by: agent-controller.ts, routes/wallet.ts
 *
 * Integrates with Tether WDK for wallet creation and management.
 * Reads real on-chain ERC-20 balances via RPC + CoinGecko for prices.
 * Executes transactions through WDK when available, simulation mode otherwise.
 */
import { config } from '../config.js';
import type { WalletInfo, TokenBalance } from '../shared/types.js';
import { SUPPORTED_CHAINS, type SupportedChain } from '../shared/constants.js';

let WDK: any = null;
let WalletManagerEvm: any = null;
let wdkInstance: any = null;
let isWdkAvailable = false;
let walletAddress: string = '';

// ERC-20 token addresses per chain (mainnet)
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    DAI:  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  polygon: {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  arbitrum: {
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
};

// Token decimals
const TOKEN_DECIMALS: Record<string, number> = {
  USDT: 6, USDC: 6, DAI: 18, ETH: 18,
};

// Mainnet RPCs for balance reads
const MAINNET_RPCS: Record<string, string> = {
  ethereum: 'https://ethereum-rpc.publicnode.com',
  polygon: 'https://polygon-bor-rpc.publicnode.com',
  arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
};

// ERC-20 balanceOf(address) selector
const BALANCE_OF_SELECTOR = '0x70a08231';

// Price cache
let priceCache: Record<string, number> = {};
let priceCacheTime = 0;

/** Load WDK dynamically */
async function loadWdk(): Promise<void> {
  try {
    const wdkMod = await import('@tetherto/wdk');
    const evmMod = await import('@tetherto/wdk-wallet-evm');
    WDK = wdkMod.default || wdkMod;
    WalletManagerEvm = evmMod.default || evmMod;
    isWdkAvailable = true;
    console.log('[WDK] Loaded successfully');
  } catch {
    console.log('[WDK] Not available - running in simulation mode');
    isWdkAvailable = false;
  }
}

/** Initialize WDK with seed phrase */
export async function initializeWdk(): Promise<void> {
  await loadWdk();

  if (!isWdkAvailable) return;

  try {
    const hasValidSeed = config.wdkSeedPhrase &&
      config.wdkSeedPhrase !== 'your-24-word-seed-phrase-here' &&
      WDK.isValidSeed?.(config.wdkSeedPhrase);

    const seed = hasValidSeed ? config.wdkSeedPhrase : WDK.getRandomSeedPhrase(12);
    if (!hasValidSeed) {
      console.log('[WDK] Generated temporary seed phrase (set WDK_SEED_PHRASE in .env for persistence)');
    }

    wdkInstance = new WDK(seed);

    // Register EVM wallet for Ethereum
    wdkInstance.registerWallet('ethereum', WalletManagerEvm, {
      provider: config.ethRpcUrl,
    });

    // Get wallet address
    try {
      const account = await wdkInstance.getAccount('ethereum', 0);
      walletAddress = account?.address || account?.getAddress?.() || '';
      if (walletAddress) {
        console.log(`[WDK] Wallet address: ${walletAddress}`);
      }
    } catch {
      console.log('[WDK] Could not derive address from WDK');
    }

    console.log('[WDK] Initialized with EVM wallet manager');
  } catch (err) {
    console.error('[WDK] Init failed:', err);
    isWdkAvailable = false;
  }
}

/** Fetch live prices from CoinGecko */
async function fetchPrices(): Promise<Record<string, number>> {
  const now = Date.now();
  if (now - priceCacheTime < 120_000 && Object.keys(priceCache).length > 0) {
    return priceCache;
  }

  try {
    const resp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,tether,usd-coin,dai&vs_currencies=usd'
    );
    const data = await resp.json();
    priceCache = {
      ETH: data.ethereum?.usd || 2000,
      USDT: data.tether?.usd || 1,
      USDC: data['usd-coin']?.usd || 1,
      DAI: data.dai?.usd || 1,
    };
    priceCacheTime = now;
    console.log(`[WDK] Prices updated: ETH=$${priceCache.ETH}`);
  } catch {
    // Fallback prices
    if (Object.keys(priceCache).length === 0) {
      priceCache = { ETH: 2000, USDT: 1, USDC: 1, DAI: 1 };
    }
  }
  return priceCache;
}

/** Make an eth_call */
async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const result = await response.json();
  return result.result || '0x0';
}

/** Get ETH balance via RPC */
async function getEthBalance(rpcUrl: string, address: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });
  const result = await response.json();
  return result.result || '0x0';
}

/** Get real on-chain ERC-20 balance */
async function getTokenBalance(rpcUrl: string, tokenAddress: string, holderAddress: string, decimals: number): Promise<string> {
  const paddedAddress = holderAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  const callData = BALANCE_OF_SELECTOR + paddedAddress;
  const result = await ethCall(rpcUrl, tokenAddress, callData);
  const rawBalance = BigInt(result || '0x0');
  const divisor = BigInt(10 ** decimals);
  const whole = rawBalance / divisor;
  const remainder = rawBalance % divisor;
  const remainderStr = remainder.toString().padStart(decimals, '0').slice(0, 2);
  return `${whole}.${remainderStr}`;
}

/** Get wallet info for a chain */
export async function getWallet(chain: SupportedChain = 'ethereum'): Promise<WalletInfo> {
  const address = walletAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28';
  return {
    address,
    blockchain: chain,
    balances: await getBalances(chain),
  };
}

/** Get real on-chain token balances */
export async function getBalances(chain: SupportedChain = 'ethereum'): Promise<TokenBalance[]> {
  const address = walletAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28';
  const rpcUrl = MAINNET_RPCS[chain];
  const tokens = TOKEN_ADDRESSES[chain] || {};
  const prices = await fetchPrices();
  const balances: TokenBalance[] = [];

  try {
    // Get native ETH/MATIC balance
    const nativeSymbol = chain === 'polygon' ? 'MATIC' : 'ETH';
    const ethBalHex = await getEthBalance(rpcUrl, address);
    const ethBal = Number(BigInt(ethBalHex)) / 1e18;
    const ethPrice = prices['ETH'] || 2000;

    balances.push({
      token: nativeSymbol,
      symbol: nativeSymbol,
      balance: ethBal.toFixed(6),
      balanceUsd: ethBal * ethPrice,
    });

    // Get ERC-20 balances
    for (const [symbol, tokenAddr] of Object.entries(tokens)) {
      try {
        const decimals = TOKEN_DECIMALS[symbol] || 6;
        const balance = await getTokenBalance(rpcUrl, tokenAddr, address, decimals);
        const numBalance = parseFloat(balance);
        const price = prices[symbol] || 1;

        balances.push({
          token: symbol,
          symbol,
          balance,
          balanceUsd: numBalance * price,
        });
      } catch {
        balances.push({ token: symbol, symbol, balance: '0', balanceUsd: 0 });
      }
    }
  } catch (err) {
    console.error(`[WDK] Balance fetch failed for ${chain}:`, err);
    // Return zeros rather than fake data
    return [
      { token: 'ETH', symbol: 'ETH', balance: '0', balanceUsd: 0 },
      ...Object.keys(tokens).map(s => ({ token: s, symbol: s, balance: '0', balanceUsd: 0 })),
    ];
  }

  return balances;
}

/** Execute a swap via WDK */
export async function executeSwap(
  chain: SupportedChain,
  fromToken: string,
  toToken: string,
  amount: string
): Promise<{ txHash: string; status: string }> {
  if (isWdkAvailable && wdkInstance) {
    try {
      const account = await wdkInstance.getAccount(chain, 0);
      const swapProtocol = account.getSwapProtocol?.('velora');
      if (swapProtocol) {
        const result = await swapProtocol.swap({ fromToken, toToken, amount });
        return { txHash: result.hash, status: 'executed' };
      }
    } catch (err) {
      console.error('[WDK] Swap failed:', err);
    }
  }

  // WDK not available — log intent but don't fake a tx hash
  console.log(`[WDK] Swap intent: ${amount} ${fromToken} → ${toToken} on ${chain} (WDK swap not available)`);
  return {
    txHash: `pending_wdk_swap_${Date.now().toString(16)}`,
    status: 'pending_wdk',
  };
}

/** Execute a lending supply via WDK */
export async function executeLendingSupply(
  chain: SupportedChain,
  asset: string,
  amount: string
): Promise<{ txHash: string; status: string }> {
  if (isWdkAvailable && wdkInstance) {
    try {
      const account = await wdkInstance.getAccount(chain, 0);
      const lendingProtocol = account.getLendingProtocol?.('aave');
      if (lendingProtocol) {
        const result = await lendingProtocol.supply({ asset, amount });
        return { txHash: result.hash, status: 'executed' };
      }
    } catch (err) {
      console.error('[WDK] Lending supply failed:', err);
    }
  }

  console.log(`[WDK] Supply intent: ${amount} ${asset} to Aave on ${chain} (WDK lending not available)`);
  return {
    txHash: `pending_wdk_supply_${Date.now().toString(16)}`,
    status: 'pending_wdk',
  };
}

/** Check if WDK is loaded */
export function isWdkReady(): boolean {
  return isWdkAvailable && wdkInstance !== null;
}
