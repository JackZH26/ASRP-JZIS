// ============================================================
// Auto-Updater — ASRP Desktop
// Uses electron-updater for automatic update checks/installs.
// ============================================================

import { app, BrowserWindow, dialog } from 'electron';
import { EventEmitter } from 'events';

export interface UpdaterStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  ready: boolean;
  version: string | null;
  progress: number;
  error: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoUpdaterLib = any;

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

class AppAutoUpdater extends EventEmitter {
  private lib: AutoUpdaterLib = null;
  private status: UpdaterStatus = {
    checking: false, available: false, downloading: false,
    ready: false, version: null, progress: 0, error: null,
  };
  private initialized = false;
  private getWindow: (() => BrowserWindow | null) | null = null;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private manualCheck = false;
  private userDeferredUpdate = false;

  initialize(getWindow: () => BrowserWindow | null): void {
    if (this.initialized) return;
    this.initialized = true;
    this.getWindow = getWindow;

    try {
      const updaterPkg = require('electron-updater') as { autoUpdater: AutoUpdaterLib };
      this.lib = updaterPkg.autoUpdater;
    } catch {
      console.log('[Updater] electron-updater not available');
      return;
    }

    // CRITICAL: autoDownload=false, we control download timing
    this.lib.autoDownload = false;
    // CRITICAL: this ensures update installs when app quits normally
    this.lib.autoInstallOnAppQuit = true;

    // ── Events ──

    this.lib.on('checking-for-update', () => {
      this.status.checking = true;
      this.status.error = null;
      this._send('updater:status', this.getStatus());
    });

    this.lib.on('update-available', (info: { version: string }) => {
      this.status.checking = false;
      this.status.available = true;
      this.status.version = info.version;
      this._send('updater:status', this.getStatus());

      if (this.manualCheck) {
        // User clicked "Check for Updates" — auto-download
        this.manualCheck = false;
        this.downloadUpdate().catch(() => {});
      } else {
        // Startup check — ask user
        const win = this.getWindow?.() ?? undefined;
        dialog.showMessageBox(win as BrowserWindow, {
          type: 'info',
          title: 'Update Available',
          message: `ASRP Desktop v${info.version} is available`,
          detail: `Current: v${app.getVersion()}`,
          buttons: ['Download Now', 'Later'],
          defaultId: 0,
        }).then(({ response }) => {
          if (response === 0) {
            this.downloadUpdate().catch(() => {});
          } else {
            this.userDeferredUpdate = true;
          }
        });
      }
      this._updateMenu();
    });

    this.lib.on('update-not-available', () => {
      this.status.checking = false;
      this.status.available = false;
      this._send('updater:status', this.getStatus());
      if (this.manualCheck) {
        this.manualCheck = false;
        const win = this.getWindow?.() ?? undefined;
        dialog.showMessageBox(win as BrowserWindow, {
          type: 'info', title: 'Up to Date',
          message: `v${app.getVersion()} is the latest version.`,
          buttons: ['OK'],
        });
      }
    });

    this.lib.on('download-progress', (progress: { percent: number }) => {
      this.status.downloading = true;
      this.status.progress = Math.round(progress.percent);
      this._send('updater:status', this.getStatus());
    });

    this.lib.on('update-downloaded', (info: { version: string }) => {
      this.status.downloading = false;
      this.status.ready = true;
      this.status.version = info.version;
      this.status.progress = 100;
      this._send('updater:status', this.getStatus());

      console.log('[Updater] Update downloaded:', info.version);

      if (!this.userDeferredUpdate) {
        const win = this.getWindow?.() ?? undefined;
        dialog.showMessageBox(win as BrowserWindow, {
          type: 'info',
          title: 'Update Ready',
          message: `v${info.version} is ready to install`,
          detail: 'The app will quit, install the update, and relaunch.',
          buttons: ['Restart Now', 'Later'],
          defaultId: 0,
        }).then(({ response }) => {
          if (response === 0) this.installUpdate();
        });
      }
      this._updateMenu();
    });

    this.lib.on('error', (err: Error) => {
      this.status.checking = false;
      this.status.downloading = false;
      this.status.error = err.message;
      this._send('updater:status', this.getStatus());
      console.error('[Updater] Error:', err.message);
      if (this.manualCheck) {
        this.manualCheck = false;
        const win = this.getWindow?.() ?? undefined;
        dialog.showMessageBox(win as BrowserWindow, {
          type: 'error', title: 'Update Error',
          message: 'Update check failed', detail: err.message, buttons: ['OK'],
        });
      }
    });

    // Check on startup (10s delay)
    setTimeout(() => this.checkForUpdates().catch(() => {}), 10000);
    // Periodic check
    this.periodicTimer = setInterval(() => this.checkForUpdates().catch(() => {}), CHECK_INTERVAL_MS);

    // Cleanup timer on quit
    app.on('before-quit', () => {
      if (this.periodicTimer) clearInterval(this.periodicTimer);
    });
  }

  async checkForUpdatesManual(): Promise<void> {
    this.manualCheck = true;
    return this.checkForUpdates();
  }

  async checkForUpdates(): Promise<void> {
    if (!this.lib) return;
    try { await this.lib.checkForUpdates(); }
    catch (err) { this.status.error = err instanceof Error ? err.message : String(err); }
  }

  async downloadUpdate(): Promise<void> {
    if (!this.lib || !this.status.available) return;
    try {
      this.status.downloading = true;
      this._send('updater:status', this.getStatus());
      await this.lib.downloadUpdate();
    } catch (err) {
      this.status.downloading = false;
      this.status.error = err instanceof Error ? err.message : String(err);
      this._send('updater:status', this.getStatus());
    }
  }

  /**
   * Install downloaded update. The ONLY reliable approach on macOS:
   * 1. Set isQuitting flag (so window close handlers don't block)
   * 2. Call quitAndInstall which internally does app.quit() + install
   * 3. If still alive after 3s, force process.exit()
   */
  installUpdate(): void {
    if (!this.lib || !this.status.ready) {
      console.log('[Updater] installUpdate: not ready');
      return;
    }

    console.log('[Updater] === INSTALLING UPDATE ===');

    // Step 1: Signal that we're quitting (prevents minimize-to-tray)
    this.emit('before-quit-for-update');

    // Step 2: Destroy all windows (not just close — DESTROY)
    try {
      for (const win of BrowserWindow.getAllWindows()) {
        win.removeAllListeners('close');
        win.destroy(); // destroy() is immediate, unlike close()
      }
    } catch (e) {
      console.error('[Updater] Error destroying windows:', e);
    }

    // Step 3: Call quitAndInstall
    // On macOS: extracts zip, replaces .app bundle, relaunches
    // On Windows: runs NSIS installer after quit
    // On Linux: replaces AppImage
    console.log('[Updater] Calling quitAndInstall...');
    try {
      this.lib.quitAndInstall(false, true);
    } catch (err) {
      console.error('[Updater] quitAndInstall threw:', err);
    }

    // Step 4: Nuclear fallback — if still alive after 3s, force exit
    // process.exit() is the absolute last resort. It bypasses ALL
    // event handlers and guarantees the process terminates.
    // autoInstallOnAppQuit should have already queued the install.
    setTimeout(() => {
      console.log('[Updater] Still alive after 3s — force exiting');
      process.exit(0);
    }, 3000);
  }

  getStatus(): UpdaterStatus { return { ...this.status }; }

  private _updateMenu(): void { this.emit('menu-update-needed'); }

  getMenuLabel(): string {
    if (this.status.ready) return `Restart to Update (v${this.status.version})`;
    if (this.status.downloading) return `Downloading... (${this.status.progress}%)`;
    if (this.status.available) return `Download Update (v${this.status.version})`;
    return 'Check for Updates...';
  }

  getMenuAction(): () => void {
    if (this.status.ready) return () => this.installUpdate();
    if (this.status.downloading) return () => {};
    if (this.status.available) return () => { this.downloadUpdate().catch(() => {}); };
    return () => { this.checkForUpdatesManual().catch(() => {}); };
  }

  private _send(channel: string, data: unknown): void {
    try {
      const win = this.getWindow?.();
      if (win && !win.isDestroyed()) win.webContents.send(channel, data);
    } catch { /* window gone */ }
  }
}

export const autoUpdater = new AppAutoUpdater();
