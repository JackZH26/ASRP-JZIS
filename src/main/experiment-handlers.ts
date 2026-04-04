import { ipcMain } from 'electron';

// ============================================================
// RESEARCH HANDLERS (channel: 'experiments:*') — [STUB]
// ============================================================

export function registerExperimentHandlers(): void {
  // Issue #36: Use relative dates instead of hardcoded domain-specific dates
  const relDate = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  ipcMain.handle('experiments:list', async () => {
    // Empty initial state — real data from workspace in Phase 7.5
    return { experiments: [] };
  });

  ipcMain.handle('experiments:get', async (_event, expId: string) => {
    return { success: true, experiment: { id: expId, data: {} } };
  });

  ipcMain.handle('experiments:register', async (_event, hypothesis: string, metadata: Record<string, unknown>) => {
    const id = `EXP-${new Date().toISOString().slice(0, 10)}-${String(Math.floor(Math.random() * 900) + 100)}`;
    return { success: true, id, hypothesis, metadata };
  });

  ipcMain.handle('experiments:update-status', async (_event, expId: string, status: string) => {
    return { success: true, expId, status };
  });
}
