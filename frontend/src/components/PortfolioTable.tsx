/**
 * PortfolioTable - shows current portfolio positions.
 * Used by: Dashboard (page.tsx)
 */
'use client';

interface Position {
  chain: string;
  protocol: string;
  asset: string;
  amount: string;
  valueUsd: number;
  apy: number;
  type: 'lending' | 'liquidity' | 'idle';
}

interface Props {
  positions: Position[];
}

const typeColors: Record<string, string> = {
  lending: 'text-emerald-400 bg-emerald-900/30',
  liquidity: 'text-blue-400 bg-blue-900/30',
  idle: 'text-yellow-400 bg-yellow-900/30',
};

const chainColors: Record<string, string> = {
  ethereum: 'text-blue-300',
  polygon: 'text-purple-300',
  arbitrum: 'text-sky-300',
};

export default function PortfolioTable({ positions }: Props) {
  return (
    <div className="bg-sentinel-card border border-sentinel-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-sentinel-border">
        <h3 className="text-sm font-semibold text-gray-300">Portfolio Positions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase border-b border-sentinel-border">
              <th className="text-left px-4 py-2">Asset</th>
              <th className="text-left px-4 py-2">Chain</th>
              <th className="text-left px-4 py-2">Protocol</th>
              <th className="text-right px-4 py-2">Value</th>
              <th className="text-right px-4 py-2">APY</th>
              <th className="text-left px-4 py-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={i} className="border-b border-sentinel-border/50 hover:bg-gray-800/30">
                <td className="px-4 py-2.5 font-medium text-white">{p.asset}</td>
                <td className={`px-4 py-2.5 ${chainColors[p.chain] || 'text-gray-400'}`}>
                  {p.chain}
                </td>
                <td className="px-4 py-2.5 text-gray-400">{p.protocol}</td>
                <td className="px-4 py-2.5 text-right text-white">
                  ${p.valueUsd.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={p.apy > 0 ? 'text-emerald-400' : 'text-gray-500'}>
                    {p.apy > 0 ? `${p.apy.toFixed(2)}%` : '-'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[p.type] || ''}`}>
                    {p.type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
