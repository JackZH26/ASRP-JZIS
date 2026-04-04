// ============================================================
// OpenClaw Manager — Embedded Gateway lifecycle management
// Spawns and manages an OpenClaw gateway as a child process.
// Profile: asrp | Port: 18800
// ============================================================

import { ChildProcess, spawn, execSync } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import * as fs from 'fs';
import { app } from 'electron';
import { EventEmitter } from 'events';

const PROFILE = 'asrp';
const PORT = 18800;
const HEALTH_URL = `http://127.0.0.1:${PORT}/health`;
const MAX_RESTART_ATTEMPTS = 3;
const HEALTH_POLL_INTERVAL_MS = 10000;

export interface OpenClawStatus {
  installed: boolean;
  running: boolean;
  port: number;
  pid: number | null;
  version: string | null;
  uptime: number; // seconds since start
  error: string | null;
}

class OpenClawManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private running = false;
  private startTime = 0;
  private restartCount = 0;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private version: string | null = null;
  private lastError: string | null = null;
  private stopping = false;

  /**
   * Find the openclaw binary path.
   * Checks: node_modules/.bin, global npm, system PATH
   */
  findBinary(): string | null {
    // 1. Local node_modules
    const localBin = path.join(app.getAppPath(), 'node_modules', '.bin', 'openclaw');
    if (fs.existsSync(localBin)) return localBin;

    // 2. System PATH
    try {
      const cmd = process.platform === 'win32' ? 'where openclaw' : 'which openclaw';
      const result = execSync(cmd, { timeout: 5000, stdio: 'pipe' }).toString().trim();
      if (result) return result.split('\n')[0];
    } catch { /* not found */ }

    return null;
  }

  /**
   * Check if OpenClaw is installed
   */
  isInstalled(): boolean {
    return this.findBinary() !== null;
  }

  /**
   * Get OpenClaw version
   */
  detectVersion(): string | null {
    const bin = this.findBinary();
    if (!bin) return null;
    try {
      const result = execSync(`"${bin}" --version`, { timeout: 5000, stdio: 'pipe' }).toString().trim();
      this.version = result;
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get the profile state directory
   */
  getProfileDir(): string {
    return path.join(os.homedir(), `.openclaw-${PROFILE}`);
  }

  /**
   * Get the config file path for the ASRP profile
   */
  getConfigPath(): string {
    return path.join(this.getProfileDir(), 'openclaw.json');
  }

  /**
   * Start the OpenClaw gateway
   */
  async start(): Promise<{ success: boolean; error?: string }> {
    if (this.running) return { success: true };

    const bin = this.findBinary();
    if (!bin) {
      return { success: false, error: 'OpenClaw not installed. Run: npm install -g openclaw' };
    }

    // Ensure profile directory exists
    const profileDir = this.getProfileDir();
    fs.mkdirSync(profileDir, { recursive: true });

    // Check config exists
    const configPath = this.getConfigPath();
    if (!fs.existsSync(configPath)) {
      return { success: false, error: 'OpenClaw config not generated. Complete setup first.' };
    }

    this.stopping = false;
    this.lastError = null;

    try {
      // Spawn: openclaw --profile asrp gateway --port 18800
      this.process = spawn(bin, [
        '--profile', PROFILE,
        'gateway',
        '--port', String(PORT),
      ], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          OPENCLAW_STATE_DIR: profileDir,
          OPENCLAW_CONFIG_PATH: configPath,
        },
      });

      this.startTime = Date.now();

      // Capture stdout/stderr for debugging
      if (this.process.stdout) {
        this.process.stdout.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          if (line) this.emit('log', { level: 'info', message: line });
        });
      }
      if (this.process.stderr) {
        this.process.stderr.on('data', (data: Buffer) => {
          const line = data.toString().trim();
          if (line) this.emit('log', { level: 'error', message: line });
        });
      }

      this.process.on('close', (code) => {
        this.running = false;
        this.process = null;
        this.emit('stopped', { code });

        // Auto-restart on unexpected exit
        if (!this.stopping && code !== 0 && this.restartCount < MAX_RESTART_ATTEMPTS) {
          this.restartCount++;
          this.lastError = `Gateway exited with code ${code}, restarting (attempt ${this.restartCount}/${MAX_RESTART_ATTEMPTS})`;
          this.emit('restarting', { attempt: this.restartCount });
          setTimeout(() => this.start(), 2000);
        } else if (code !== 0) {
          this.lastError = `Gateway exited with code ${code}`;
        }
      });

      this.process.on('error', (err) => {
        this.running = false;
        this.lastError = err.message;
        this.emit('error', err);
      });

      // Wait for health check
      const healthy = await this.waitForHealth(15000);
      if (healthy) {
        this.running = true;
        this.restartCount = 0;
        this.detectVersion();
        this.startHealthPolling();
        this.emit('started', { port: PORT, pid: this.process?.pid });
        return { success: true };
      } else {
        this.lastError = 'Gateway did not become healthy within 15 seconds';
        this.stop();
        return { success: false, error: this.lastError };
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      return { success: false, error: this.lastError };
    }
  }

  /**
   * Stop the gateway
   */
  stop(): void {
    this.stopping = true;
    this.stopHealthPolling();
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch { /* already dead */ }
      this.process = null;
    }
    this.running = false;
  }

  /**
   * Restart the gateway
   */
  async restart(): Promise<{ success: boolean; error?: string }> {
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.restartCount = 0;
    return this.start();
  }

  /**
   * Check if gateway is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current status
   */
  getStatus(): OpenClawStatus {
    return {
      installed: this.isInstalled(),
      running: this.running,
      port: PORT,
      pid: this.process?.pid ?? null,
      version: this.version,
      uptime: this.running ? Math.round((Date.now() - this.startTime) / 1000) : 0,
      error: this.lastError,
    };
  }

  /**
   * Make an HTTP GET request to the gateway API
   */
  async apiGet(apiPath: string, timeoutMs = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const req = http.get({
        hostname: '127.0.0.1',
        port: PORT,
        path: apiPath,
        timeout: timeoutMs,
      }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  /**
   * Wait for gateway health endpoint to respond
   */
  private async waitForHealth(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    const interval = 500;
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await this.apiGet('/health', 2000) as Record<string, unknown>;
        if (res && (res.status === 'ok' || res.ok === true)) return true;
      } catch { /* not ready yet */ }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  /**
   * Periodic health check
   */
  private startHealthPolling(): void {
    this.stopHealthPolling();
    this.healthTimer = setInterval(async () => {
      if (!this.running) return;
      try {
        await this.apiGet('/health', 3000);
      } catch {
        // Gateway stopped responding
        this.running = false;
        this.emit('unhealthy');
      }
    }, HEALTH_POLL_INTERVAL_MS);
  }

  private stopHealthPolling(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  /**
   * Install OpenClaw globally via npm
   */
  async install(): Promise<{ success: boolean; error?: string }> {
    try {
      execSync('npm install -g openclaw', { timeout: 120000, stdio: 'pipe' });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const openclawManager = new OpenClawManager();
