/**
 * Audit Log Routes - access the complete action audit trail.
 * Used by: index.ts
 */
import { Router } from 'express';
import { getAuditLog, getAuditStats } from '../services/audit-log.js';

const router = Router();

/** GET /api/audit - get audit log entries */
router.get('/', (_req, res) => {
  const { category, limit, since } = _req.query;
  const entries = getAuditLog({
    category: category as any,
    limit: limit ? parseInt(limit as string) : undefined,
    since: since as string,
  });
  res.json({ entries, count: entries.length });
});

/** GET /api/audit/stats - get audit statistics */
router.get('/stats', (_req, res) => {
  res.json(getAuditStats());
});

export default router;
