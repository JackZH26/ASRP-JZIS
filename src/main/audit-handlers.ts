import { ipcMain } from 'electron';
import { withAuth } from './ipc-handlers';

// ============================================================
// AUDIT HANDLERS (channel: 'audit:*') — [DEMO STUB]
// ============================================================

export function registerAuditHandlers(): void {
  ipcMain.handle('audit:list', async (_event, _options?: { limit?: number; offset?: number }) => {
    // Empty initial state — real audit log from workspace in Phase 7.5
    return { entries: [], total: 0 };
  });

  ipcMain.handle('audit:log', withAuth(async (_userId: number, entry: Record<string, unknown>) => {
    return { success: true, entry };
  }));

  ipcMain.handle('audit:export', async () => {
    return { success: true, message: 'Audit export stub' };
  });
}
