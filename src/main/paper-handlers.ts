import { ipcMain } from 'electron';

// ============================================================
// PAPER HANDLERS (channel: 'papers:*') — [DEMO STUB]
// ============================================================

export function registerPaperHandlers(): void {
  // Issue #36: Use relative dates so stubs don't become confusingly historical
  const relDate = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  ipcMain.handle('papers:list', async () => {
    // Empty initial state — real data from workspace in Phase 7.5
    return { papers: [] };
  });

  ipcMain.handle('papers:get', async (_event, paperId: string) => {
    return { success: true, paper: { id: paperId, content: '# Paper Content\n\n(stub)' } };
  });

  ipcMain.handle('papers:create', async (_event, metadata: Record<string, unknown>) => {
    return { success: true, paperId: `paper-${Date.now()}`, metadata };
  });

  ipcMain.handle('papers:update', async (_event, paperId: string, data: Record<string, unknown>) => {
    return { success: true, paperId, data };
  });

  ipcMain.handle('papers:export', async (_event, paperId: string, format: string) => {
    return { success: true, message: `Exported ${paperId} as ${format} (stub)` };
  });
}
