/**
 * StatusBadge - shows agent running/stopped/emergency status.
 * Used by: Dashboard (page.tsx)
 */
'use client';

interface Props {
  isRunning: boolean;
  emergencyStop: boolean;
}

export default function StatusBadge({ isRunning, emergencyStop }: Props) {
  if (emergencyStop) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-900/50 text-red-400 border border-red-800">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        EMERGENCY STOP
      </span>
    );
  }

  if (isRunning) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-800">
        <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
        Running
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-gray-400 border border-gray-700">
      <span className="w-2 h-2 rounded-full bg-gray-500" />
      Stopped
    </span>
  );
}
