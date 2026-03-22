/**
 * MetricCard - displays a single metric with label and value.
 * Used by: Dashboard (page.tsx)
 */
'use client';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'white';
}

const colorMap = {
  green: 'text-emerald-400',
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  white: 'text-white',
};

export default function MetricCard({ label, value, subtitle, color = 'white' }: Props) {
  return (
    <div className="bg-sentinel-card border border-sentinel-border rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
