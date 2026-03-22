/**
 * Portfolio Tracker Service - tracks portfolio value over time.
 * Used by: agent-controller.ts, routes/agent.ts
 *
 * Records portfolio snapshots at intervals for historical tracking
 * and performance measurement.
 */

export interface PortfolioSnapshot {
  timestamp: string;
  totalValueUsd: number;
  deployedValueUsd: number;
  idleValueUsd: number;
  weightedApy: number;
  positionCount: number;
  chainBreakdown: Record<string, number>;
}

const snapshots: PortfolioSnapshot[] = [];
const MAX_SNAPSHOTS = 1440; // 24h at 1min intervals

/** Record a portfolio snapshot */
export function recordSnapshot(data: Omit<PortfolioSnapshot, 'timestamp'>): void {
  snapshots.push({
    ...data,
    timestamp: new Date().toISOString(),
  });

  if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
}

/** Get portfolio history */
export function getPortfolioHistory(limit = 100): PortfolioSnapshot[] {
  return snapshots.slice(-limit);
}

/** Get portfolio performance metrics */
export function getPerformanceMetrics(): {
  currentValue: number;
  valueChange24h: number;
  valueChangePct: number;
  peakValue: number;
  avgApy: number;
  snapshotCount: number;
} {
  if (snapshots.length === 0) {
    return {
      currentValue: 0,
      valueChange24h: 0,
      valueChangePct: 0,
      peakValue: 0,
      avgApy: 0,
      snapshotCount: 0,
    };
  }

  const current = snapshots[snapshots.length - 1];
  const dayAgo = Date.now() - 86_400_000;
  const dayAgoSnapshot = snapshots.find(
    (s) => new Date(s.timestamp).getTime() >= dayAgo
  );

  const previousValue = dayAgoSnapshot?.totalValueUsd || current.totalValueUsd;
  const valueChange24h = current.totalValueUsd - previousValue;
  const valueChangePct =
    previousValue > 0 ? (valueChange24h / previousValue) * 100 : 0;

  const peakValue = Math.max(...snapshots.map((s) => s.totalValueUsd));
  const avgApy =
    snapshots.reduce((sum, s) => sum + s.weightedApy, 0) / snapshots.length;

  return {
    currentValue: current.totalValueUsd,
    valueChange24h: Math.round(valueChange24h * 100) / 100,
    valueChangePct: Math.round(valueChangePct * 100) / 100,
    peakValue,
    avgApy: Math.round(avgApy * 100) / 100,
    snapshotCount: snapshots.length,
  };
}
