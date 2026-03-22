/**
 * Audit Log Service - persistent record of all agent actions and decisions.
 * Used by: agent-controller.ts, routes/agent.ts
 *
 * Stores a complete audit trail of every decision the agent makes,
 * including AI reasoning, transaction details, and safety limit checks.
 */

export interface AuditEntry {
  id: string;
  timestamp: string;
  category: 'decision' | 'execution' | 'safety' | 'system';
  action: string;
  details: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

const auditLog: AuditEntry[] = [];
const MAX_ENTRIES = 2000;

/** Record an audit entry */
export function recordAudit(
  category: AuditEntry['category'],
  action: string,
  details: Record<string, unknown>,
  success = true,
  errorMessage?: string
): AuditEntry {
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    category,
    action,
    details,
    success,
    errorMessage,
  };

  auditLog.push(entry);
  if (auditLog.length > MAX_ENTRIES) auditLog.shift();

  const icon = success ? '\x1b[32m+\x1b[0m' : '\x1b[31m!\x1b[0m';
  console.log(`[Audit] ${icon} [${category}] ${action}`);

  return entry;
}

/** Get audit entries with optional filtering */
export function getAuditLog(options?: {
  category?: AuditEntry['category'];
  limit?: number;
  since?: string;
}): AuditEntry[] {
  let entries = [...auditLog];

  if (options?.category) {
    entries = entries.filter((e) => e.category === options.category);
  }

  if (options?.since) {
    const sinceDate = new Date(options.since).getTime();
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= sinceDate);
  }

  const limit = options?.limit || 100;
  return entries.slice(-limit).reverse();
}

/** Get audit statistics */
export function getAuditStats(): {
  totalEntries: number;
  byCategory: Record<string, number>;
  successRate: number;
  last24h: number;
} {
  const now = Date.now();
  const oneDayAgo = now - 86_400_000;

  const byCategory: Record<string, number> = {};
  let successCount = 0;
  let last24h = 0;

  for (const entry of auditLog) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    if (entry.success) successCount++;
    if (new Date(entry.timestamp).getTime() >= oneDayAgo) last24h++;
  }

  return {
    totalEntries: auditLog.length,
    byCategory,
    successRate: auditLog.length > 0 ? successCount / auditLog.length : 1,
    last24h,
  };
}
