// ============================================================
// Auto-Updater — T-083
// Uses electron-updater for automatic update checks/installs.
// Loaded dynamically to avoid hard crash when not installed.
// ============================================================

import { app, BrowserWindow, Notification } from 'electron';
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

type UpdaterEvent =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AutoUpdaterLib = any;

class AppAutoUpdater extends EventEmitter {
  private lib: AutoUpdaterLib = null;
  private status: UpdaterStatus = {
    checking: false,
    available: false,
    downloading: false,
    ready: false,
    version: null,
    progress: 0,
    error: null,
  };
  private initialized = false;

  initialize(getWindow: () => BrowserWindow | null): void {
    if (this.initialized) return;
    this.initialized = true;

    // Try to load electron-updater dynamically
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const updaterPkg = require('electron-updater') as { autoUpdater: AutoUpdaterLib };
      this.lib = updaterPkg.autoUpdater;
    } catch {
      // electron-updater not installed — updater is a no-op
      console.log('[AutoUpdater] electron-updater not available, updates disabled.');
      return;
    }

    this.lib.autoDownload = false;
    this.lib.autoInstallOnAppQuit = true;

    this.lib.on('checking-for-update' as UpdaterEvent, () => {
      this.status.checking = true;
      this.status.error = null;
      this._send(getWindow, 'updater:status', this.getStatus());
    });

    this.lib.on('update-available' as UpdaterEvent, (info: { version: string }) => {
      this.status.checking = false;
      this.status.available = true;
      this.status.version = info.version;
      this._send(getWindow, 'updater:status', this.getStatus());

      // Show notification
      if (Notification.isSupported()) {
        new Notification({
          title: 'ASRP Update Available',
          body: `Version ${info.version} is ready to download.`,
        }).show();
      }
    });

    this.lib.on('update-not-available' as UpdaterEvent, () => {
      this.status.checking = false;
      this.status.available = false;
      this._send(getWindow, 'updater:status', this.getStatus());
    });

    this.lib.on('download-progress' as UpdaterEvent, (progress: { percent: number }) => {
      this.status.downloading = true;
      this.status.progress = Math.round(progress.percent);
      this._send(getWindow, 'updater:status', this.getStatus());
    });

    this.lib.on('update-downloaded' as UpdaterEvent, (info: { version: string }) => {
      this.status.downloading = false;
      this.status.ready = true;
      this.status.version = info.version;
      this.status.progress = 100;
      this._send(getWindow, 'updater:status', this.getStatus());

      if (Notification.isSupported()) {
        new Notification({
          title: 'ASRP Ready to Update',
          body: `Version ${info.version} downloaded. Restart to install.`,
        }).show();
      }
    });

    this.lib.on('error' as UpdaterEvent, (err: Error) => {
      this.status.checking = false;
      this.status.downloading = false;
      this.status.error = err.message;
      this._send(getWindow, 'updater:status', this.getStatus());
      console.error('[AutoUpdater] Error:', err.message);
    });

    // Check for updates after 10s delay on startup
    setTimeout(() => {
      this.checkForUpdates().catch(() => { /* ignore startup check errors */ });
    }, 10000);

    // Prompt to install on quit if update ready
    app.on('before-quit', () => {
      if (this.status.ready && this.lib) {
        this.lib.quitAndInstall(false, true);
      }
    });
  }

  async checkForUpdates(): Promise<void> {
    if (!this.lib) return;
    try {
      await this.lib.checkForUpdates();
    } catch (err) {
      this.status.error = err instanceof Error ? err.message : String(err);
    }
  }

  async downloadUpdate(): Promise<void> {
    if (!this.lib || !this.status.available) return;
    try {
      this.status.downloading = true;
      await this.lib.downloadUpdate();
    } catch (err) {
      this.status.downloading = false;
      this.status.error = err instanceof Error ? err.message : String(err);
    }
  }

  installUpdate(): void {
    if (!this.lib || !this.status.ready) return;
    this.lib.quitAndInstall(false, true);
  }

  getStatus(): UpdaterStatus {
    return { ...this.status };
  }

  private _send(getWindow: () => BrowserWindow | null, channel: string, data: unknown): void {
    try {
      const win = getWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    } catch {
      // window may be gone
    }
  }
}

export const autoUpdater = new AppAutoUpdater();
