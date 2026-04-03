import { ipcMain, app, shell, dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as authService from './auth-service';
import * as keyManager from './key-manager';
import * as openclawBridge from './openclaw-bridge';
import { ollamaManager } from './ollama-manager';
import { autoUpdater } from './auto-updater';
import { runSelfTest } from './self-test';

const APP_ROOT = path.join(__dirname, '..', '..');
const RESOURCES_PATH = path.join(APP_ROOT, 'resources');

// ============================================================
// IPC Handler Registration
// ============================================================

export function registerIpcHandlers(): void {
  // Initialize key manager with the auth DB
  const authDb = authService.getAuthDb();
  keyManager.initKeyManager(authDb);

  registerAuthHandlers();
  registerKeyHandlers();
  registerSetupHandlers();
  registerSystemHandlers();
  registerAgentHandlers();
  registerFileHandlers();
  registerPaperHandlers();
  registerExperimentHandlers();
  registerAuditHandlers();
  registerSettingsHandlers();
  registerOpenClawHandlers();
  registerAssistantHandlers();
  registerOllamaHandlers();
  registerUpdaterHandlers();
  registerSelfTestHandlers();
}

// ============================================================
// AUTH HANDLERS (channel: 'auth:*')
// ============================================================

function registerAuthHandlers(): void {
  ipcMain.handle('auth:register', async (_event, name: string, email: string, password: string) => {
    return authService.register(name, email, password);
  });

  ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
    return authService.login(email, password);
  });

  ipcMain.handle('auth:logout', async () => {
    return { success: true };
  });

  ipcMain.handle('auth:user', async (_event, token: string) => {
    const user = authService.getUser(token);
    return user;
  });

  ipcMain.handle('auth:setup-complete', async (_event, userId: number) => {
    try {
      authService.markSetupComplete(userId);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });
}

// ============================================================
// KEY HANDLERS (channel: 'keys:*')
// ============================================================

function registerKeyHandlers(): void {
  ipcMain.handle('keys:assign-trial', async (_event, userId: number) => {
    return keyManager.assignTrialKey(userId);
  });

  ipcMain.handle('keys:get', async (_event, userId: number) => {
    const key = keyManager.getUserKey(userId);
    return { key };
  });

  ipcMain.handle('keys:validate', async (_event, key: string) => {
    return keyManager.validateKey(key);
  });
}

// ============================================================
// SETUP HANDLERS (channel: 'setup:*')
// ============================================================

function registerSetupHandlers(): void {
  ipcMain.handle('setup:save-profile', async (_event, userId: number, profile: authService.UserProfile) => {
    try {
      authService.saveProfile(userId, profile);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('setup:save-keys', async (_event, userId: number, keys: Record<string, string>) => {
    try {
      // Write OpenRouter key to workspace .env
      const userDataPath = app.getPath('userData');
      const workspacePath = path.join(userDataPath, 'workspace');
      if (keys.openrouterKey) {
        keyManager.writeKeyToWorkspace(keys.openrouterKey, workspacePath);
      }
      // Also persist via settings
      const settingsPath = path.join(userDataPath, 'settings.json');
      let settings: Record<string, unknown> = {};
      try {
        if (fs.existsSync(settingsPath)) {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }
      } catch { /* ignore */ }
      settings.openrouterKey = keys.openrouterKey || settings.openrouterKey;
      if (keys.anthropicKey) settings.anthropicKey = keys.anthropicKey;
      if (keys.googleKey) settings.googleKey = keys.googleKey;
      settings.userId = userId;
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('setup:init-agents', async (_event, _userId: number) => {
    // Stub — real OpenClaw integration in Phase 7.5
    return { success: true };
  });

  ipcMain.handle('setup:complete', async (_event, userId: number) => {
    try {
      authService.markSetupComplete(userId);
      // Also set setupComplete flag in settings
      const userDataPath = app.getPath('userData');
      const settingsPath = path.join(userDataPath, 'settings.json');
      let settings: Record<string, unknown> = {};
      try {
        if (fs.existsSync(settingsPath)) {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }
      } catch { /* ignore */ }
      settings.setupComplete = true;
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });
}

// ============================================================
// SYSTEM HANDLERS (channel: 'system:*')
// ============================================================

function registerSystemHandlers(): void {
  // Get app version and info
  ipcMain.handle('system:info', async () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      resourcesPath: RESOURCES_PATH,
    };
  });

  // Get workspace path
  ipcMain.handle('system:workspace', async () => {
    const userDataPath = app.getPath('userData');
    const workspacePath = path.join(userDataPath, 'workspace');
    return { path: workspacePath };
  });

  // Open file/folder in system explorer
  ipcMain.handle('system:open-path', async (_event, targetPath: string) => {
    try {
      await shell.openPath(targetPath);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Select directory dialog
  ipcMain.handle('system:select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled) return { canceled: true, path: null };
    return { canceled: false, path: result.filePaths[0] };
  });

  // Health check
  ipcMain.handle('system:health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}

// ============================================================
// AGENT HANDLERS (channel: 'agents:*')
// ============================================================

function registerAgentHandlers(): void {
  // List all available agents from resources
  ipcMain.handle('agents:list', async () => {
    try {
      const agentsPath = path.join(RESOURCES_PATH, 'agents');
      if (!fs.existsSync(agentsPath)) return { agents: [] };

      const files = fs.readdirSync(agentsPath);
      const agentNames = [...new Set(
        files
          .filter(f => f.endsWith('.md') || f.endsWith('.json'))
          .map(f => f.replace(/-(soul|init|openclaw)\.(md|json)$/, '').replace(/\.md$/, ''))
          .filter(n => n && !n.includes('.'))
      )];

      return { agents: agentNames };
    } catch (err: unknown) {
      return { agents: [], error: String(err) };
    }
  });

  // Get agent definition
  ipcMain.handle('agents:get', async (_event, agentName: string) => {
    try {
      const agentPath = path.join(RESOURCES_PATH, 'agents', `${agentName}.md`);
      if (!fs.existsSync(agentPath)) {
        return { success: false, error: 'Agent not found' };
      }
      const content = fs.readFileSync(agentPath, 'utf-8');
      return { success: true, content };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Get agent status (stub — future: communicate with ASRP backend)
  ipcMain.handle('agents:status', async () => {
    return {
      agents: [
        { name: 'Albert', role: 'Theorist', status: 'idle', model: 'claude-opus-4-6' },
        { name: 'Wall-E', role: 'Engineer', status: 'idle', model: 'claude-sonnet-4-6' },
        { name: 'Critic', role: 'Reviewer', status: 'idle', model: 'claude-opus-4-6' },
        { name: 'Scholar', role: 'Librarian', status: 'idle', model: 'claude-haiku-4-5' },
        { name: 'DocMario', role: 'ITDoctor', status: 'idle', model: 'claude-haiku-4-5' },
      ],
    };
  });

  // Start agent (stub)
  ipcMain.handle('agents:start', async (_event, agentName: string) => {
    return { success: true, message: `Agent ${agentName} start requested (stub)` };
  });

  // Stop agent (stub)
  ipcMain.handle('agents:stop', async (_event, agentName: string) => {
    return { success: true, message: `Agent ${agentName} stop requested (stub)` };
  });
}

// ============================================================
// FILE HANDLERS (channel: 'files:*')
// ============================================================

function registerFileHandlers(): void {
  // List files in workspace
  ipcMain.handle('files:list', async (_event, dirPath: string) => {
    try {
      if (!fs.existsSync(dirPath)) return { files: [], error: 'Path not found' };
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = entries.map(e => ({
        name: e.name,
        path: path.join(dirPath, e.name),
        isDirectory: e.isDirectory(),
        size: e.isFile() ? fs.statSync(path.join(dirPath, e.name)).size : 0,
      }));
      return { files };
    } catch (err: unknown) {
      return { files: [], error: String(err) };
    }
  });

  // Read file contents
  ipcMain.handle('files:read', async (_event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Write file contents
  ipcMain.handle('files:write', async (_event, filePath: string, content: string) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Delete file
  ipcMain.handle('files:delete', async (_event, filePath: string) => {
    try {
      fs.rmSync(filePath, { recursive: true, force: true });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Open file dialog
  ipcMain.handle('files:open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options || {});
    return result;
  });

  // Save file dialog
  ipcMain.handle('files:save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(options || {});
    return result;
  });
}

// ============================================================
// PAPER HANDLERS (channel: 'papers:*')
// ============================================================

function registerPaperHandlers(): void {
  // List papers (stub)
  ipcMain.handle('papers:list', async () => {
    return {
      papers: [
        { id: 'paper-001', title: 'Multi-well double-delta DFT analysis', status: 'draft', created: '2026-04-01' },
        { id: 'paper-002', title: 'LDA binding energy corrections', status: 'submitted', created: '2026-03-28' },
      ],
    };
  });

  // Get paper (stub)
  ipcMain.handle('papers:get', async (_event, paperId: string) => {
    return { success: true, paper: { id: paperId, content: '# Paper Content\n\n(stub)' } };
  });

  // Create paper (stub)
  ipcMain.handle('papers:create', async (_event, metadata: Record<string, unknown>) => {
    return { success: true, paperId: `paper-${Date.now()}`, metadata };
  });

  // Update paper (stub)
  ipcMain.handle('papers:update', async (_event, paperId: string, data: Record<string, unknown>) => {
    return { success: true, paperId, data };
  });

  // Export paper (stub)
  ipcMain.handle('papers:export', async (_event, paperId: string, format: string) => {
    return { success: true, message: `Exported ${paperId} as ${format} (stub)` };
  });
}

// ============================================================
// EXPERIMENT HANDLERS (channel: 'experiments:*')
// ============================================================

function registerExperimentHandlers(): void {
  // List experiments (stub)
  ipcMain.handle('experiments:list', async () => {
    return {
      experiments: [
        { id: 'EXP-2026-04-02-003', hypothesis: 'Multi-well DD with exact KS gap at d=5,6,7', status: 'running', created: '2026-04-02' },
        { id: 'EXP-2026-04-01-002', hypothesis: 'Prime-spaced wells produce negative DD', status: 'refuted', created: '2026-04-01' },
        { id: 'EXP-2026-04-01-001', hypothesis: 'LDA overestimates 2e atom binding by >1%', status: 'confirmed', created: '2026-04-01' },
        { id: 'EXP-2026-03-31-005', hypothesis: 'Electron membrane model consistent with Stodolna 2013', status: 'confirmed', created: '2026-03-31' },
        { id: 'EXP-2026-04-02-004', hypothesis: 'Fibonacci lattice reduces DFT ill-conditioning', status: 'registered', created: '2026-04-02' },
      ],
    };
  });

  // Get experiment details (stub)
  ipcMain.handle('experiments:get', async (_event, expId: string) => {
    return { success: true, experiment: { id: expId, data: {} } };
  });

  // Register new experiment (stub)
  ipcMain.handle('experiments:register', async (_event, hypothesis: string, metadata: Record<string, unknown>) => {
    const id = `EXP-${new Date().toISOString().slice(0, 10)}-${String(Math.floor(Math.random() * 900) + 100)}`;
    return { success: true, id, hypothesis, metadata };
  });

  // Update experiment status (stub)
  ipcMain.handle('experiments:update-status', async (_event, expId: string, status: string) => {
    return { success: true, expId, status };
  });
}

// ============================================================
// AUDIT HANDLERS (channel: 'audit:*')
// ============================================================

function registerAuditHandlers(): void {
  // Get audit trail (stub)
  ipcMain.handle('audit:list', async (_event, options: { limit?: number; offset?: number }) => {
    const limit = options?.limit ?? 50;
    return {
      entries: [
        { time: '10:03', agent: 'Engineer', message: 'EXP-003: Exact KS gap computed for d=3.0, DD=+0.215', severity: 'info' },
        { time: '09:58', agent: 'Reviewer', message: 'EXP-002: DD sign depends on KS gap definition — verify with exact potential', severity: 'warning' },
        { time: '09:45', agent: 'Theorist', message: 'Registered EXP-004: Fibonacci ill-conditioning hypothesis', severity: 'info' },
        { time: '09:30', agent: 'System', message: 'Daily backup completed (workspace: 2.4 MB)', severity: 'info' },
        { time: '09:15', agent: 'Engineer', message: 'EXP-003: iDEA reverse engineering started (tol=1e-6, mu=3.0)', severity: 'info' },
        { time: '09:00', agent: 'System', message: 'Health check: all agents online, disk 23%', severity: 'info' },
      ].slice(0, limit),
      total: 847,
    };
  });

  // Log custom entry (stub)
  ipcMain.handle('audit:log', async (_event, entry: Record<string, unknown>) => {
    return { success: true, entry };
  });

  // Export audit log (stub)
  ipcMain.handle('audit:export', async () => {
    return { success: true, message: 'Audit export stub' };
  });
}

// ============================================================
// SETTINGS HANDLERS (channel: 'settings:*')
// ============================================================

function registerSettingsHandlers(): void {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');

  const defaultSettings = {
    theme: 'light',
    language: 'en',
    workspace: path.join(app.getPath('home'), 'asrp-workspace'),
    openrouterKey: '',
    defaultModel: 'claude-sonnet-4-6',
    budgetDaily: 15,
    notifications: true,
    minimizeToTray: true,
    autoStart: false,
  };

  const loadSettings = (): Record<string, unknown> => {
    try {
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        return { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch {
      // Fall through to defaults
    }
    return { ...defaultSettings };
  };

  // Get settings
  ipcMain.handle('settings:get', async () => {
    return loadSettings();
  });

  // Set settings
  ipcMain.handle('settings:set', async (_event, updates: Record<string, unknown>) => {
    try {
      const current = loadSettings();
      const updated = { ...current, ...updates };
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), 'utf-8');
      return { success: true, settings: updated };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Reset settings to defaults
  ipcMain.handle('settings:reset', async () => {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
      return { success: true, settings: defaultSettings };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });
}

// ============================================================
// OPENCLAW HANDLERS (channel: 'openclaw:*')
// ============================================================

function registerOpenClawHandlers(): void {
  ipcMain.handle('openclaw:agent-statuses', async () => {
    return { agents: openclawBridge.getAgentStatuses() };
  });

  ipcMain.handle('openclaw:workspace-stats', async () => {
    return openclawBridge.getWorkspaceStats();
  });

  ipcMain.handle('openclaw:token-usage', async () => {
    return openclawBridge.getTokenUsage();
  });

  ipcMain.handle('openclaw:research-progress', async () => {
    return openclawBridge.getResearchProgress();
  });

  ipcMain.handle('openclaw:gateway-status', async () => {
    return openclawBridge.getGatewayStatus();
  });

  // Agent lifecycle
  ipcMain.handle('agents:restart', async (_event, agentName: string) => {
    return openclawBridge.restartAgent(agentName);
  });

  // Agent SOUL editor
  ipcMain.handle('agents:get-soul', async (_event, agentName: string) => {
    // Try to load from resources first, fall back to bridge stub
    try {
      const soulPath = path.join(RESOURCES_PATH, 'agents', `${agentName.toLowerCase()}-soul.md`);
      if (fs.existsSync(soulPath)) {
        const content = fs.readFileSync(soulPath, 'utf-8');
        return { success: true, content };
      }
    } catch { /* fall through */ }
    return { success: true, content: openclawBridge.getAgentSoul(agentName) };
  });

  ipcMain.handle('agents:save-soul', async (_event, agentName: string, content: string) => {
    try {
      const soulPath = path.join(RESOURCES_PATH, 'agents', `${agentName.toLowerCase()}-soul.md`);
      fs.mkdirSync(path.dirname(soulPath), { recursive: true });
      fs.writeFileSync(soulPath, content, 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('agents:rename', async (_event, oldName: string, newName: string) => {
    return openclawBridge.renameAgent(oldName, newName);
  });

  ipcMain.handle('agents:set-model', async (_event, agentName: string, model: string) => {
    return openclawBridge.setAgentModel(agentName, model);
  });

  ipcMain.handle('agents:logs', async (_event, agentName: string) => {
    return { logs: openclawBridge.getAgentLogs(agentName) };
  });
}

// ============================================================
// ASSISTANT HANDLERS (channel: 'assistant:*')
// ============================================================

function registerAssistantHandlers(): void {
  const userDataPath = app.getPath('userData');
  const chatHistoryPath = path.join(userDataPath, 'logs', 'assistant-chat.jsonl');

  const ensureHistoryFile = () => {
    fs.mkdirSync(path.dirname(chatHistoryPath), { recursive: true });
    if (!fs.existsSync(chatHistoryPath)) {
      fs.writeFileSync(chatHistoryPath, '', 'utf-8');
    }
  };

  // Get chat model info
  ipcMain.handle('assistant:get-model', async () => {
    // Check if Ollama is available (stub — always returns cloud for now)
    return { model: 'Claude Sonnet 4.6', type: 'cloud' as const };
  });

  // Send message to assistant (stub — returns mock response)
  ipcMain.handle('assistant:chat', async (_event, message: string, context?: string) => {
    try {
      // Context-aware mock responses
      const mockResponses: Record<string, string> = {
        'register': 'To register an experiment, navigate to **Experiments** → click **+ Register Experiment** → fill in your hypothesis and metadata. The system will assign an EXP-ID automatically.',
        'model': 'To switch an agent\'s model, go to **Agents** → click on the agent card → use the **Model** dropdown. Changes take effect after the agent restarts.',
        'pipeline': 'The paper pipeline status shows: 2 papers in workspace (1 submitted, 1 draft). Wall-E is running EXP-003 which feeds into the DD paper.',
        'default': 'I\'m your ASRP research assistant. I can help you navigate the platform, understand experiment results, and manage your agents. What would you like to know?',
      };

      const lowerMsg = message.toLowerCase();
      let reply = mockResponses['default'];
      if (lowerMsg.includes('register') || lowerMsg.includes('experiment')) {
        reply = mockResponses['register'];
      } else if (lowerMsg.includes('model') || lowerMsg.includes('switch')) {
        reply = mockResponses['model'];
      } else if (lowerMsg.includes('pipeline') || lowerMsg.includes('paper') || lowerMsg.includes('status')) {
        reply = mockResponses['pipeline'];
      }

      if (context) {
        reply = `*[Context: ${context}]*\n\n${reply}`;
      }

      // Save both messages to history
      ensureHistoryFile();
      const userEntry = JSON.stringify({ role: 'user', content: message, ts: new Date().toISOString() });
      const assistantEntry = JSON.stringify({ role: 'assistant', content: reply, ts: new Date().toISOString() });
      fs.appendFileSync(chatHistoryPath, userEntry + '\n' + assistantEntry + '\n', 'utf-8');

      return { success: true, reply, model: 'Claude Sonnet 4.6' };
    } catch (err: unknown) {
      return { success: false, reply: 'Error processing message', error: String(err), model: 'unknown' };
    }
  });

  // Load chat history (last 50 messages)
  ipcMain.handle('assistant:history', async () => {
    try {
      ensureHistoryFile();
      const raw = fs.readFileSync(chatHistoryPath, 'utf-8');
      const lines = raw.trim().split('\n').filter(l => l.trim());
      const messages = lines
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean)
        .slice(-50);
      return { messages };
    } catch {
      return { messages: [] };
    }
  });

  // Save a single message
  ipcMain.handle('assistant:save-message', async (_event, role: string, content: string) => {
    try {
      ensureHistoryFile();
      const entry = JSON.stringify({ role, content, ts: new Date().toISOString() });
      fs.appendFileSync(chatHistoryPath, entry + '\n', 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Clear history
  ipcMain.handle('assistant:clear-history', async () => {
    try {
      ensureHistoryFile();
      fs.writeFileSync(chatHistoryPath, '', 'utf-8');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });
}

// ============================================================
// OLLAMA HANDLERS (channel: 'ollama:*')
// ============================================================

function registerOllamaHandlers(): void {
  // Get full Ollama + download status
  ipcMain.handle('ollama:status', async () => {
    try {
      return await ollamaManager.getStatus();
    } catch (err: unknown) {
      return { installed: false, running: false, models: [], downloading: false, downloadProgress: 0, downloadSpeed: '', downloadEta: '', downloadModel: '', error: String(err) };
    }
  });

  // Detect hardware capabilities
  ipcMain.handle('ollama:detect-hardware', async () => {
    try {
      const hardware = ollamaManager.detectHardware();
      const recommendation = ollamaManager.getRecommendation(hardware);
      return { success: true, hardware, recommendation };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Start pulling a model (background, progress pushed via event)
  ipcMain.handle('ollama:pull-model', async (event, modelName: string = 'gemma3:27b') => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);

    // Forward progress events to renderer
    const progressHandler = (data: unknown) => {
      if (senderWindow && !senderWindow.isDestroyed()) {
        senderWindow.webContents.send('ollama:download-progress', data);
      }
    };
    const completeHandler = (data: unknown) => {
      if (senderWindow && !senderWindow.isDestroyed()) {
        senderWindow.webContents.send('ollama:download-complete', data);
      }
      ollamaManager.removeListener('download-progress', progressHandler);
      ollamaManager.removeListener('download-complete', completeHandler);
      ollamaManager.removeListener('download-error', errorHandler);
    };
    const errorHandler = (data: unknown) => {
      if (senderWindow && !senderWindow.isDestroyed()) {
        senderWindow.webContents.send('ollama:download-error', data);
      }
      ollamaManager.removeListener('download-progress', progressHandler);
      ollamaManager.removeListener('download-complete', completeHandler);
      ollamaManager.removeListener('download-error', errorHandler);
    };

    ollamaManager.on('download-progress', progressHandler);
    ollamaManager.on('download-complete', completeHandler);
    ollamaManager.on('download-error', errorHandler);

    // Start pull in background (don't await)
    ollamaManager.pullModel(modelName).catch(() => { /* handled via event */ });

    return { success: true, message: `Pull started for ${modelName}` };
  });

  // Cancel ongoing pull
  ipcMain.handle('ollama:cancel-pull', async () => {
    try {
      ollamaManager.cancelPull();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // List installed models
  ipcMain.handle('ollama:list-models', async () => {
    try {
      const models = await ollamaManager.listModels();
      return { success: true, models };
    } catch (err: unknown) {
      return { success: false, models: [], error: String(err) };
    }
  });

  // Chat via local Ollama
  ipcMain.handle('ollama:chat', async (_event, messages: Array<{ role: string; content: string }>, model?: string) => {
    try {
      const reply = await ollamaManager.chat(
        messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        model
      );
      return { success: true, reply };
    } catch (err: unknown) {
      return { success: false, reply: '', error: String(err) };
    }
  });

  // Delete a model
  ipcMain.handle('ollama:delete-model', async (_event, modelName: string) => {
    try {
      await ollamaManager.deleteModel(modelName);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Start Ollama server
  ipcMain.handle('ollama:start', async () => {
    try {
      await ollamaManager.startOllama();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Stop Ollama server
  ipcMain.handle('ollama:stop', async () => {
    try {
      ollamaManager.stopOllama();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  // Get install instructions
  ipcMain.handle('ollama:install-instructions', async () => {
    return ollamaManager.installOllama();
  });
}

// ============================================================
// UPDATER HANDLERS (channel: 'updater:*')
// ============================================================

function registerUpdaterHandlers(): void {
  ipcMain.handle('updater:status', async () => {
    return autoUpdater.getStatus();
  });

  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('updater:install', async () => {
    try {
      autoUpdater.installUpdate();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  });
}

// ============================================================
// SELF-TEST HANDLER (channel: 'system:self-test')
// ============================================================

function registerSelfTestHandlers(): void {
  ipcMain.handle('system:self-test', async () => {
    try {
      const result = await runSelfTest();
      return { success: true, result };
    } catch (err: unknown) {
      return { success: false, error: String(err), result: null };
    }
  });

  // Log renderer-side errors to disk
  ipcMain.handle('system:log-error', async (_event, errorInfo: Record<string, unknown>) => {
    try {
      const userDataPath = app.getPath('userData');
      const logsPath = path.join(userDataPath, 'logs');
      fs.mkdirSync(logsPath, { recursive: true });
      const logFile = path.join(logsPath, 'error.log');
      const line = JSON.stringify({ ts: new Date().toISOString(), ...errorInfo }) + '\n';
      fs.appendFileSync(logFile, line, 'utf-8');
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  // Deployment mode detection
  ipcMain.handle('system:is-headless', async () => {
    const display = process.env.DISPLAY;
    const isHeadless = process.platform === 'linux' && (!display || display.trim() === '');
    return { headless: isHeadless, display: display || null, platform: process.platform };
  });
}
