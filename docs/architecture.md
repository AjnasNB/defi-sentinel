# Architecture

## System Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js)"]
        Dashboard[Dashboard UI]
        WS_Client[WebSocket Client]
    end

    subgraph Backend["Backend (Express + WDK)"]
        API[REST API]
        WSS[WebSocket Server]
        Controller[Agent Controller]

        subgraph Agent["Sentinel Agent"]
            RateMonitor[Rate Monitor]
            StrategyEngine[Strategy Engine]
            RiskManager[Risk Manager / Safety]
        end

        subgraph WDK["Tether WDK"]
            WalletMgr[Wallet Manager]
            SwapProto[Swap Protocol - Velora]
            LendProto[Lending Protocol - Aave]
        end
    end

    subgraph Chains["Blockchains"]
        ETH[Ethereum]
        POLY[Polygon]
        ARB[Arbitrum]
    end

    subgraph Protocols["DeFi Protocols"]
        Aave[Aave V3]
        Velora[Velora DEX]
    end

    Dashboard -->|HTTP| API
    WS_Client -->|WebSocket| WSS
    API --> Controller
    Controller --> Agent
    RateMonitor -->|Fetch rates| Protocols
    StrategyEngine -->|Evaluate| RiskManager
    RiskManager -->|Execute| WDK
    WalletMgr -->|Sign & Send| Chains
    SwapProto --> Velora
    LendProto --> Aave

    style Frontend fill:#1e293b,stroke:#334155,color:#e2e8f0
    style Backend fill:#0f172a,stroke:#1e293b,color:#e2e8f0
    style Agent fill:#064e3b,stroke:#10b981,color:#e2e8f0
    style WDK fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
```

## Data Flow

1. **Rate Monitor** polls Aave V3 rates every 30 seconds across ETH/Polygon/Arbitrum
2. **Strategy Engine** compares current portfolio positions against best available yields
3. **Risk Manager** validates the proposed action against safety limits
4. **WDK** executes the transaction via self-custodial wallet (sign locally, submit to chain)
5. **WebSocket** pushes real-time updates to the dashboard

## Key Design Decisions

- **Self-custodial**: WDK ensures private keys never leave the host machine
- **Rule-based strategy**: Deterministic decision-making (no LLM dependency for execution) ensures predictable behavior
- **Simulation mode**: Graceful fallback when WDK packages aren't installed, enabling demo without real funds
- **Safety-first**: Multiple layers of protection (per-tx limit, daily cap, concentration check, rate limit, emergency stop)
