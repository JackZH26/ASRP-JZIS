// ============================================================
// Workspace shared-dirs — SRW cross-agent file access
// ============================================================
//
// Problem this module solves:
//   Each OpenClaw agent runs with its own workspace dir
//   ({wsRoot}/agent-{name}/). When Theorist writes
//   `workflows/{id}/intake.json` relative to her CWD, it lands inside
//   `agent-wall-e/workflows/...` — invisible to Engineer, Reviewer, and
//   the desktop app's scheduler which all look at `{wsRoot}/workflows/`.
//
// Fix (SRW-v3.1):
//   Promote `workflows/`, `literature/`, `messages/` to real shared
//   directories at the workspace root, and replace each agent's
//   per-agent subdir with a symlink (Windows: junction). All three
//   agents + the desktop app now read/write the same physical tree,
//   while per-agent SOUL.md / IDENTITY.md / state/ stay isolated.
//
// Cross-platform:
//   - macOS / Linux: fs.symlinkSync(target, link, 'dir')
//   - Windows:       fs.symlinkSync(target, link, 'junction')  ← no admin/Dev Mode needed
//
// Self-heal:
//   `selfHealAgentWorkspaces()` is called on app/gateway startup. It
//   scans every `~/.openclaw-asrp-*` profile, reads its `openclaw.json`
//   to find the agent's actual workspace path, merges any pre-existing
//   real subdir content into the shared root (newest file wins), then
//   replaces the real subdir with a symlink. Safe to run repeatedly.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';

/** Subdirs that must be shared across all agents + the desktop scheduler. */
export const SHARED_SUBDIRS = ['workflows', 'literature', 'messages'] as const;

/** Ensure the shared dirs exist at the workspace root as real directories. */
export function ensureSharedRootDirs(wsRoot: string): void {
  for (const name of SHARED_SUBDIRS) {
    try {
      fs.mkdirSync(path.join(wsRoot, name), { recursive: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Recursively merge contents of `src` into `dst`. When the same file exists
 * in both, the one with the newer mtime wins. Does NOT delete `src`; callers
 * do that separately after the merge so we never destroy data on a failure.
 */
function mergeDir(src: string, dst: string): void {
  if (!fs.existsSync(src)) return;
  try {
    fs.mkdirSync(dst, { recursive: true });
  } catch {
    /* ignore */
  }
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(src, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const sp = path.join(src, e.name);
    const dp = path.join(dst, e.name);
    try {
      if (e.isSymbolicLink()) {
        // Skip — we never want to chase the link and duplicate a tree.
        continue;
      }
      if (e.isDirectory()) {
        mergeDir(sp, dp);
      } else if (e.isFile()) {
        if (!fs.existsSync(dp)) {
          fs.copyFileSync(sp, dp);
        } else {
          const ss = fs.statSync(sp);
          const ds = fs.statSync(dp);
          if (ss.mtimeMs > ds.mtimeMs) fs.copyFileSync(sp, dp);
        }
      }
    } catch {
      /* ignore per-entry errors */
    }
  }
}

function rmrfSafe(p: string): void {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/** Convert `p` to its canonical realpath, or return `p` unchanged on failure. */
function safeRealpath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

/** Create (or repair) a symlink for one shared subdir inside one agent workspace. */
function linkOneSharedDir(wsRoot: string, agentWorkspace: string, name: string): void {
  const sharedTarget = path.join(wsRoot, name);
  const linkPath = path.join(agentWorkspace, name);

  // Shared target must exist as a real directory.
  try {
    fs.mkdirSync(sharedTarget, { recursive: true });
  } catch {
    /* ignore */
  }

  // Inspect whatever is currently at linkPath.
  let exists = false;
  let isSymlink = false;
  let isDir = false;
  try {
    const lst = fs.lstatSync(linkPath);
    exists = true;
    isSymlink = lst.isSymbolicLink();
    isDir = !isSymlink && lst.isDirectory();
  } catch {
    /* does not exist */
  }

  if (exists && isSymlink) {
    // Already a symlink — verify it points at our shared target; if so, done.
    if (safeRealpath(linkPath) === safeRealpath(sharedTarget)) return;
    try {
      fs.unlinkSync(linkPath);
    } catch {
      /* ignore */
    }
  } else if (exists && isDir) {
    // Real directory — migrate its contents into shared root, then remove.
    mergeDir(linkPath, sharedTarget);
    rmrfSafe(linkPath);
  } else if (exists) {
    // Regular file or other weirdness — back up and remove.
    try {
      fs.renameSync(linkPath, `${linkPath}.bak-${Date.now()}`);
    } catch {
      try {
        fs.unlinkSync(linkPath);
      } catch {
        /* ignore */
      }
    }
  }

  // Ensure parent exists, then create the symlink.
  try {
    fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  } catch {
    /* ignore */
  }
  try {
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(sharedTarget, linkPath, type);
  } catch (err) {
    console.warn(`[shared-dirs] symlink failed for ${linkPath}: ${String(err)}`);
  }
}

/**
 * Ensure shared dirs exist at `wsRoot` and are symlinked into `agentWorkspace`.
 * Called from `openclaw-config-generator.generateAllConfigs` during setup.
 */
export function linkSharedDirsForAgent(wsRoot: string, agentWorkspace: string): void {
  try {
    fs.mkdirSync(agentWorkspace, { recursive: true });
  } catch {
    /* ignore */
  }
  ensureSharedRootDirs(wsRoot);
  for (const name of SHARED_SUBDIRS) {
    linkOneSharedDir(wsRoot, agentWorkspace, name);
  }
}

/**
 * Heuristically derive the shared workspace root from one agent's CWD and the
 * configured `settings.workspace`. Handles both layouts we've shipped:
 *  - Legacy:  `{wsRoot}/agent-{name}/`
 *  - New:     `{wsRoot}/system/agent-{role}/`
 */
function deriveSharedRoot(agentWs: string, settingsWorkspace: string | null): string {
  if (settingsWorkspace) {
    const abs = path.resolve(settingsWorkspace);
    const a = path.resolve(agentWs);
    if (a === abs || a.startsWith(abs + path.sep)) return abs;
  }
  let root = path.dirname(agentWs);
  if (path.basename(root) === 'system') root = path.dirname(root);
  return root;
}

export interface SelfHealReport {
  linked: number;
  migrated: number;
  errors: string[];
}

/**
 * Startup self-heal. Idempotent & cheap — safe to call on every gateway
 * start. Scans all `~/.openclaw-asrp-*` profile dirs, reads each agent's
 * `openclaw.json` for its real workspace, migrates legacy per-agent
 * `workflows/literature/messages` subdirs into the shared root, and
 * replaces them with symlinks.
 */
export function selfHealAgentWorkspaces(): SelfHealReport {
  const report: SelfHealReport = { linked: 0, migrated: 0, errors: [] };

  // Read settings.workspace (preferred shared root).
  let settingsWorkspace: string | null = null;
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (typeof settings.workspace === 'string' && settings.workspace) {
        settingsWorkspace = settings.workspace;
      }
    }
  } catch {
    /* ignore */
  }

  // Scan profile dirs.
  let homeEntries: string[] = [];
  try {
    homeEntries = fs.readdirSync(os.homedir());
  } catch {
    return report;
  }
  const profiles = homeEntries.filter(e => e.startsWith('.openclaw-asrp-'));

  for (const prof of profiles) {
    const configPath = path.join(os.homedir(), prof, 'openclaw.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const agentWs: string | undefined = cfg?.agents?.defaults?.workspace;
      if (!agentWs) continue;
      try {
        fs.mkdirSync(agentWs, { recursive: true });
      } catch {
        /* ignore */
      }

      const root = deriveSharedRoot(agentWs, settingsWorkspace);

      // Count real (non-symlink) subdirs before migration for reporting.
      for (const name of SHARED_SUBDIRS) {
        const p = path.join(agentWs, name);
        try {
          const lst = fs.lstatSync(p);
          if (!lst.isSymbolicLink() && lst.isDirectory()) report.migrated++;
        } catch {
          /* ignore */
        }
      }

      linkSharedDirsForAgent(root, agentWs);
      report.linked++;
    } catch (err) {
      report.errors.push(`${prof}: ${String(err)}`);
    }
  }

  if (report.linked > 0 || report.migrated > 0) {
    console.log(
      `[shared-dirs] self-heal: linked=${report.linked} migrated=${report.migrated} errors=${report.errors.length}`,
    );
  }
  return report;
}
