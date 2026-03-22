/**
 * Environment configuration loader.
 * Used by: index.ts, all services.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (local dev) or backend root (deployed)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',

  // WDK
  wdkSeedPhrase: process.env.WDK_SEED_PHRASE || '',
  ethRpcUrl: process.env.ETH_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  polygonRpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com',
  arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arbitrum-sepolia-rpc.publicnode.com',

  // Azure OpenAI
  azureOpenaiApiKey: process.env.AZURE_OPENAI_API_KEY || '',
  azureOpenaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  azureOpenaiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1',
  azureOpenaiApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',

  // Agent
  agentIntervalMs: parseInt(process.env.AGENT_INTERVAL_MS || '30000', 10),
  maxTransactionUsd: parseFloat(process.env.MAX_TRANSACTION_USD || '100'),
  dailySpendingLimitUsd: parseFloat(process.env.DAILY_SPENDING_LIMIT_USD || '500'),
  minYieldThresholdBps: parseFloat(process.env.MIN_YIELD_THRESHOLD_BPS || '50'),
} as const;
