# DeFi Sentinel

> Autonomous DeFi yield optimization agent powered by Tether WDK — finds the best yields, rebalances positions, and manages risk across multiple chains with zero human input.

## Problem

DeFi users leave billions in idle capital across wallets and protocols. Yield rates shift constantly across chains and lending markets, but manually monitoring and rebalancing positions is time-consuming, error-prone, and requires 24/7 attention. Most users miss better opportunities simply because they're not watching.

## Solution

**DeFi Sentinel** is an autonomous AI agent that:

1. **Monitors** lending rates across Aave V3 on Ethereum, Polygon, and Arbitrum in real-time
2. **Analyzes** yield opportunities using a rule-based strategy engine with confidence scoring
3. **Executes** swaps, lending supplies, and cross-protocol rebalances via Tether WDK self-custodial wallets
4. **Protects** capital with configurable safety guardrails: per-transaction limits, daily spending caps, concentration risk checks, and an emergency stop button

All wallets are **self-custodial** via WDK — your keys never leave your machine.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Engine | Node.js + TypeScript |
| Wallet & DeFi | Tether WDK (EVM wallets, Velora swaps, Aave lending) |
| Backend API | Express.js + WebSocket |
| Frontend | Next.js 14 + TailwindCSS |
| Chains | Ethereum, Polygon, Arbitrum (via WDK) |

## Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd defi-sentinel

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Configure environment
cp .env.example .env
# Edit .env — add your WDK seed phrase (or leave blank for auto-generated)

# 4. Start backend (port 3001)
cd backend && npm run dev

# 5. Start frontend (port 3000) — in another terminal
cd frontend && npm run dev

# 6. Open http://localhost:3000
```

## How It Works

```
[Rate Monitor] → Fetches Aave rates every 30s
       ↓
[Strategy Engine] → Evaluates portfolio vs opportunities
       ↓
[Decision] → hold / supply / swap / rebalance
       ↓
[Safety Check] → Spending limits, concentration risk, rate limits
       ↓
[WDK Execution] → Self-custodial wallet executes on-chain
       ↓
[Dashboard] → Real-time WebSocket updates to frontend
```

## Safety Features

- **Per-transaction limit**: Max $100 per action (configurable)
- **Daily spending cap**: Max $500/day (configurable)
- **Concentration risk**: No position exceeds 40% of portfolio
- **Rate limiting**: Max 20 actions per hour
- **Emergency stop**: One-click kill switch on dashboard
- **Confidence threshold**: Only executes decisions with >70% confidence

## Architecture

See [docs/architecture.md](docs/architecture.md)

## Demo

See [docs/demo-script.md](docs/demo-script.md) for the full judge demo flow.

## Hackathon

**Hackathon Galáctica: WDK Edition 1** by Tether
- Track: Autonomous DeFi Agent
- Built: March 2026

## License

MIT
