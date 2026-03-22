import { useState, useEffect, useCallback } from 'react';
import { api, createWsConnection } from '@/lib/api';
import StatusBadge from './StatusBadge';
import MetricCard from './MetricCard';
import PortfolioTable from './PortfolioTable';
import ActivityLog from './ActivityLog';
import RatesPanel from './RatesPanel';

export default function Dashboard() {
  const [state, setState] = useState<any>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [agentData, ratesData] = await Promise.all([
        api.getAgentState(),
        api.getRates(),
      ]);
      setState(agentData);
      setRates(ratesData.rates || []);
      setError(null);
    } catch (err) {
      setError('Cannot connect to backend. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const ws = createWsConnection((event) => {
      if (event.type === 'state_update' && event.data) {
        setState(event.data);
      }
    });

    const interval = setInterval(fetchData, 5000);

    return () => {
      clearInterval(interval);
      ws?.close();
    };
  }, [fetchData]);

  const handleStart = async () => {
    try { const res = await api.startAgent(); setState(res.state); } catch {}
  };
  const handleStop = async () => {
    try { const res = await api.stopAgent(); setState(res.state); } catch {}
  };
  const handleEmergencyStop = async () => {
    try { const res = await api.emergencyStop(); setState(res.state); } catch {}
  };
  const handleReset = async () => {
    try { const res = await api.resetAgent(); setState(res.state); } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to DeFi Sentinel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg mb-2">Connection Error</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-sentinel-card border border-sentinel-border rounded-lg text-sm hover:bg-gray-800 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = state?.metrics || {};

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <img src="/logo.svg" alt="DeFi Sentinel" className="w-10 h-10 rounded-full" />
            DeFi Sentinel
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Autonomous Yield Optimizer &middot; Powered by Tether WDK
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            isRunning={state?.isRunning || false}
            emergencyStop={state?.safetyLimits?.emergencyStop || false}
          />
          {!state?.isRunning ? (
            <button
              onClick={state?.safetyLimits?.emergencyStop ? handleReset : handleStart}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
            >
              {state?.safetyLimits?.emergencyStop ? 'Reset & Start' : 'Start Agent'}
            </button>
          ) : (
            <>
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition"
              >
                Stop
              </button>
              <button
                onClick={handleEmergencyStop}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
              >
                Emergency Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Total Value" value={`$${(metrics.totalValue || 0).toLocaleString()}`} color="white" />
        <MetricCard label="Weighted APY" value={`${(metrics.weightedApy || 0).toFixed(2)}%`} color="green" />
        <MetricCard label="Deployed" value={`${(metrics.deploymentRatio || 0).toFixed(0)}%`} subtitle={`$${(metrics.deployedValue || 0).toLocaleString()} active`} color="blue" />
        <MetricCard label="Actions Today" value={String(state?.totalActions || 0)} subtitle={`$${(state?.safetyLimits?.dailySpentUsd || 0).toFixed(0)} / $${(state?.safetyLimits?.dailySpendingLimitUsd || 0)} limit`} color="yellow" />
      </div>

      {/* Safety Limits Bar */}
      <div className="bg-sentinel-card border border-sentinel-border rounded-lg p-3 mb-6 flex flex-wrap items-center gap-4 text-xs text-gray-400">
        <span>Safety Limits:</span>
        <span>Max Tx: <strong className="text-gray-200">${state?.safetyLimits?.maxTransactionUsd}</strong></span>
        <span>Daily Cap: <strong className="text-gray-200">${state?.safetyLimits?.dailySpendingLimitUsd}</strong></span>
        <span>Min Yield: <strong className="text-gray-200">{state?.safetyLimits?.minYieldThresholdBps} bps</strong></span>
        <span>Max Position: <strong className="text-gray-200">{state?.safetyLimits?.maxPositionPct}%</strong></span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PortfolioTable positions={state?.portfolio || []} />
        <ActivityLog actions={state?.actions || []} />
      </div>

      {/* Rates */}
      <RatesPanel rates={rates} />

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600">
        DeFi Sentinel &middot; Hackathon Gal&aacute;ctica: WDK Edition 1 &middot; Built with Tether WDK
      </div>
    </div>
  );
}
