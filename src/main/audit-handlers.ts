import { ipcMain } from 'electron';
import { withAuth } from './ipc-handlers';
import {
  appendAudit,
  listAudit,
  exportAuditCSV,
  flushAuditNow,
  type AuditType,
  type AuditSeverity,
} from './audit-store';

// ============================================================
// AUDIT HANDLERS (channel: 'audit:*')
// Persistent operations log backed by audit-store. The Log page
// reads via audit:list, server-side code emits via the exported
// appendAudit() helper, and CSV export is served by audit:export.
// ============================================================

function coerceType(v: unknown): AuditType {
  if (v === 'research' || v === 'agent' || v === 'api'
      || v === 'file' || v === 'system' || v === 'config') return v;
  return 'system';
}

function coerceSeverity(v: unknown): AuditSeverity | undefined {
  if (v === 'info' || v === 'warn' || v === 'error') return v;
  return undefined;
}

export function registerAuditHandlers(): void {
  ipcMain.handle('audit:list', async (_event, options?: { limit?: number; offset?: number }) => {
    return listAudit(options);
  });

  // Renderer-emitted audit entries (e.g. UI-side actions). Auth-gated so
  // arbitrary code in a compromised page can't pollute the log unauthenticated.
  ipcMain.handle('audit:log', withAuth(async (_userId: number, entry: Record<string, unknown>) => {
    if (!entry || typeof entry !== 'object') {
      return { success: false, error: 'Invalid entry' };
    }
    const message = typeof entry.message === 'string' ? entry.message : '';
    if (!message.trim()) {
      return { success: false, error: 'Missing message' };
    }
    appendAudit({
      type: coerceType(entry.type),
      message,
      agent: typeof entry.agent === 'string' ? entry.agent : undefined,
      research: typeof entry.research === 'string' ? entry.research : undefined,
      tokens: typeof entry.tokens === 'number' ? entry.tokens : undefined,
      severity: coerceSeverity(entry.severity),
    });
    return { success: true };
  }));

  ipcMain.handle('audit:export', async () => {
    try {
      flushAuditNow();
      const csv = exportAuditCSV();
      return { success: true, csv };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
