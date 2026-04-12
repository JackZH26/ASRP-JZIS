import { ipcMain } from 'electron';
import { withAuth } from './ipc-handlers';
import {
  loadRegistry,
  checkTool,
  checkAllTools,
  installTool,
  type ToolEntry,
  type ToolStatus,
} from './tool-installer';

// ============================================================
// TOOLS HANDLERS (channel: 'tools:*')
// Exposes tool registry, status checks, and install/uninstall
// to the renderer (Tools page).
// ============================================================

export function registerToolsHandlers(): void {
  // List all tools from the registry (no auth — read-only)
  ipcMain.handle('tools:list', async () => {
    const registry = loadRegistry();
    return { categories: registry.categories, tools: registry.tools };
  });

  // Check install status for all tools (no auth — read-only)
  ipcMain.handle('tools:check-all', async () => {
    const statuses = await checkAllTools();
    return { statuses };
  });

  // Check install status for a single tool (no auth — read-only)
  ipcMain.handle('tools:check-one', async (_event, toolId: string) => {
    const registry = loadRegistry();
    const tool = registry.tools.find((t: ToolEntry) => t.id === toolId);
    if (!tool) return { status: { id: toolId, installed: false, error: 'Tool not found in registry' } as ToolStatus };
    const status = await checkTool(tool);
    return { status };
  });

  // Install a tool (auth-gated — mutates system)
  ipcMain.handle('tools:install', withAuth(async (_userId: number, toolId: string) => {
    const registry = loadRegistry();
    const tool = registry.tools.find((t: ToolEntry) => t.id === toolId);
    if (!tool) return { success: false, error: `Tool "${toolId}" not found in registry` };
    const result = await installTool(tool);
    return result;
  }));

  // Batch-install all required tools (auth-gated — called from setup flow)
  ipcMain.handle('tools:install-required', withAuth(async () => {
    const registry = loadRegistry();
    const required = registry.tools.filter((t: ToolEntry) => t.priority === 'required');
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const tool of required) {
      // Skip if already installed
      const status = await checkTool(tool);
      if (status.installed) {
        results.push({ id: tool.id, success: true });
        continue;
      }
      const r = await installTool(tool);
      results.push({ id: tool.id, success: r.success, error: r.error });
    }

    return {
      success: results.every(r => r.success),
      results,
      installed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  }));
}
