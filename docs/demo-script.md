# Demo Script for Judges

## Elevator Pitch (30 seconds)

"DeFi Sentinel is an autonomous agent that optimizes yield across DeFi protocols using Tether's WDK for self-custodial wallet management. It monitors rates across Aave on Ethereum, Polygon, and Arbitrum, then autonomously rebalances capital to maximize returns — all with built-in safety guardrails. Your keys never leave your machine."

## Problem Statement (1 minute)

DeFi users face a constant dilemma: yield rates shift across chains and protocols every hour, but no one can monitor them 24/7. The result? Billions in idle capital sitting in wallets earning nothing, while better opportunities exist just one chain away. Manual rebalancing is tedious, gas-expensive, and error-prone.

What's needed is an autonomous system that acts like a personal portfolio manager — one that watches the markets, makes informed decisions, and executes safely without you having to lift a finger.

## Live Demo Flow

### Step 1: Show the Dashboard (30s)
1. Open `http://localhost:3000`
2. Point out: "The agent is currently **stopped**. Here's the portfolio — notice idle capital in the wallet"
3. Show the **Safety Limits** bar — "These are our guardrails"

### Step 2: Check Rates (30s)
1. Scroll to **Live Yield Rates** panel
2. "These are live Aave V3 rates across three chains. Notice Arbitrum USDT has the highest supply APY at ~6.2%"

### Step 3: Start the Agent (1 min)
1. Click **Start Agent**
2. "The agent just ran its first decision cycle"
3. Watch the **Activity Log** populate:
   - "It found idle capital and is deploying it to the highest-yielding opportunity"
4. Point out the metrics updating in real-time

### Step 4: Show Autonomous Behavior (1 min)
1. Wait for 2-3 cycles (30s each)
2. "The agent is checking rates every 30 seconds, comparing against our current positions"
3. "If it finds a yield improvement above 50 basis points, it triggers a rebalance"
4. Show the portfolio table updating as positions shift

### Step 5: Safety Features (30s)
1. Click **Emergency Stop**
2. "One click — everything stops immediately"
3. "We have per-transaction limits, daily spending caps, and concentration risk checks"
4. Click **Reset & Start** to resume

### Step 6: WDK Integration (30s)
1. Point to the API response: "All wallet operations go through Tether WDK"
2. "Self-custodial — the seed phrase stays on this machine. No server ever holds our keys"

## Technical Differentiator

1. **Full WDK integration** — wallets, swaps, and lending all through Tether's SDK
2. **Multi-layered safety** — not just a bot, but an agent with guardrails (spending limits, confidence thresholds, emergency stop)
3. **Real-time dashboard** — WebSocket-powered live view of every decision the agent makes
4. **Chain-agnostic strategy** — evaluates opportunities across Ethereum, Polygon, and Arbitrum simultaneously

## Q&A Prep

**Q: How does the agent decide when to rebalance?**
A: It compares current position APYs against the best available opportunities. If the improvement exceeds our threshold (default 50 bps) and passes safety checks, it executes.

**Q: What happens if gas prices spike?**
A: The per-transaction USD limit acts as a natural gas cost guard. The agent won't execute if the total cost (including gas) exceeds the limit.

**Q: How is this different from existing yield aggregators like Yearn?**
A: Yield aggregators are smart contracts — they pool funds and require trust. DeFi Sentinel is a local agent with self-custodial wallets via WDK. You keep full control of your keys and can stop the agent anytime.

**Q: Can this handle real money?**
A: Yes, with WDK and a funded wallet on mainnet. The safety limits are specifically designed for production use — configurable caps, emergency stop, and rate limiting.

**Q: Why not use an LLM for the strategy?**
A: Financial execution needs deterministic behavior. Our rule-based engine ensures predictable outcomes. An LLM could be added for market analysis, but execution should be rules-based for safety.
