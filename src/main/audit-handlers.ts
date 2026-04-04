import { ipcMain } from 'electron';

// ============================================================
// AUDIT HANDLERS (channel: 'audit:*') — [DEMO STUB]
// ============================================================

export function registerAuditHandlers(): void {
  // Issue #36: Use relative timestamps
  const relTime = (minutesAgo: number): string => {
    const t = new Date(Date.now() - minutesAgo * 60 * 1000);
    return t.toTimeString().slice(0, 5);
  };

  ipcMain.handle('audit:list', async (_event, options: { limit?: number; offset?: number }) => {
    // Empty initial state — real audit log from workspace in Phase 7.5
    return { entries: [], total: 0 };
  });

  ipcMain.handle('audit:log', async (_event, entry: Record<string, unknown>) => {
    return { success: true, entry };
  });

  ipcMain.handle('audit:export', async () => {
    return { success: true, message: 'Audit export stub' };
  });
}
