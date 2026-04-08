import { ipcMain } from 'electron';
import { withAuth } from './ipc-handlers';

// ============================================================
// PAPER HANDLERS (channel: 'papers:*') — [DEMO STUB]
// ============================================================

export function registerPaperHandlers(): void {
  ipcMain.handle('papers:list', async () => {
    // Empty initial state — real data from workspace in Phase 7.5
    return { papers: [] };
  });

  ipcMain.handle('papers:get', async (_event, paperId: string) => {
    return { success: true, paper: { id: paperId, content: '# Paper Content\n\n(stub)' } };
  });

  ipcMain.handle('papers:create', withAuth(async (_userId: number, metadata: Record<string, unknown>) => {
    return { success: true, paperId: `paper-${Date.now()}`, metadata };
  }));

  ipcMain.handle('papers:update', withAuth(async (_userId: number, paperId: string, data: Record<string, unknown>) => {
    return { success: true, paperId, data };
  }));

  ipcMain.handle('papers:export', async (_event, paperId: string, format: string) => {
    return { success: true, message: `Exported ${paperId} as ${format} (stub)` };
  });
}
