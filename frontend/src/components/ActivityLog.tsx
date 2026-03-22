/**
 * ActivityLog - shows recent agent actions in a feed.
 * Used by: Dashboard (page.tsx)
 */
'use client';

interface Action {
  id: string;
  timestamp: number;
  type: 'swap' | 'supply' | 'withdraw' | 'rebalance' | 'alert';
  chain: string;
  description: string;
  amountUsd: number;
  txHash?: string;
  status: 'pending' | 'success' | 'failed' | 'simulated';
}

interface Props {
  actions: Action[];
}

const typeIcons: Record<string, string> = {
  swap: '\u21C4',
  supply: '\u2197',
  withdraw: '\u2199',
  rebalance: '\u21BB',
  alert: '\u26A0',
};

const statusColors: Record<string, string> = {
  success: 'text-emerald-400',
  simulated: 'text-blue-400',
  pending: 'text-yellow-400',
  failed: 'text-red-400',
};

export default function ActivityLog({ actions }: Props) {
  return (
    <div className="bg-sentinel-card border border-sentinel-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-sentinel-border">
        <h3 className="text-sm font-semibold text-gray-300">Agent Activity</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {actions.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-500 text-sm">
            No actions yet. Start the agent to begin monitoring.
          </p>
        ) : (
          <div className="divide-y divide-sentinel-border/50">
            {actions.map((action) => (
              <div key={action.id} className="px-4 py-3 hover:bg-gray-800/30">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{typeIcons[action.type] || '?'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-snug">{action.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs ${statusColors[action.status]}`}>
                        {action.status}
                      </span>
                      <span className="text-xs text-gray-500">{action.chain}</span>
                      {action.amountUsd > 0 && (
                        <span className="text-xs text-gray-400">
                          ${action.amountUsd.toLocaleString()}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {action.txHash && (
                      <p className="text-xs text-gray-600 mt-0.5 font-mono truncate">
                        tx: {action.txHash}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
