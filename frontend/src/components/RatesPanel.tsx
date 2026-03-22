/**
 * RatesPanel - displays current DeFi yield rates.
 * Used by: Dashboard (page.tsx)
 */
'use client';

interface Rate {
  protocol: string;
  chain: string;
  asset: string;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
}

interface Props {
  rates: Rate[];
}

export default function RatesPanel({ rates }: Props) {
  return (
    <div className="bg-sentinel-card border border-sentinel-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-sentinel-border">
        <h3 className="text-sm font-semibold text-gray-300">Live Yield Rates</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase border-b border-sentinel-border">
              <th className="text-left px-4 py-2">Asset</th>
              <th className="text-left px-4 py-2">Chain</th>
              <th className="text-right px-4 py-2">Supply APY</th>
              <th className="text-right px-4 py-2">Borrow APY</th>
              <th className="text-right px-4 py-2">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r, i) => (
              <tr key={i} className="border-b border-sentinel-border/50 hover:bg-gray-800/30">
                <td className="px-4 py-2 font-medium text-white">{r.asset}</td>
                <td className="px-4 py-2 text-gray-400">{r.chain}</td>
                <td className="px-4 py-2 text-right text-emerald-400 font-medium">
                  {r.supplyApy.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right text-red-400">
                  {r.borrowApy.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          r.utilization > 85 ? 'bg-red-500' : r.utilization > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${r.utilization}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs w-10 text-right">
                      {r.utilization.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
