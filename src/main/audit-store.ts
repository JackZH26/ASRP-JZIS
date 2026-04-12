// ============================================================
// AUDIT STORE — persistent operations log
//
// Persists every meaningful operation (research lifecycle, agent
// lifecycle, file ops, system events, config changes) to a JSON
// file under {workspace}/system/audit-log.json. Reads are served
// from an in-memory cache so the Log page renders instantly even
// with thousands of entries. Writes are atomic and debounced
// (250 ms) so a burst of events doesn't pound the disk.
//
// MAX_ENTRIES caps the file at 5000 most-recent rows on a rolling
// basis (~1 MB at typical message lengths). Anything older is
// truncated when the cap is exceeded.
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getWorkspaceBase, atomicWriteJSON } from './ipc-handlers';

export type AuditType = 'research' | 'agent' | 'api' | 'file' | 'system' | 'config';
export type AuditSeverity = 'info' | 'warn' | 'error';

export interface AuditEntry {
  id: string;
  timestamp: string;        // ISO 8601
  type: AuditType;
  agent: string;            // 'Theorist' | 'Engineer' | 'Reviewer' | 'Assistant' | 'System' | bot display name
  research?: string;        // Short research code (e.g. 'R001'), if applicable
  message: string;
  tokens?: number;
  severity?: AuditSeverity;
}

const MAX_ENTRIES = 5000;
const FLUSH_DEBOUNCE_MS = 250;

let cache: AuditEntry[] | null = null;
let pendingWriteTimer: NodeJS.Timeout | null = null;

function getAuditFile(): string {
  const ws = getWorkspaceBase();
  const dir = path.join(ws, 'system');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'audit-log.json');
}

function loadCache(): AuditEntry[] {
  if (cache !== null) return cache;
  try {
    const fp = getAuditFile();
    if (fs.existsSync(fp)) {
      const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      cache = Array.isArray(raw) ? (raw as AuditEntry[]) : [];
    } else {
      cache = [];
    }
  } catch (e) {
    console.warn('[audit] failed to load audit log, starting empty:', e);
    cache = [];
  }
  return cache;
}

function scheduleFlush(): void {
  if (pendingWriteTimer) return;
  pendingWriteTimer = setTimeout(() => {
    pendingWriteTimer = null;
    try {
      atomicWriteJSON(getAuditFile(), cache || []);
    } catch (e) {
      console.warn('[audit] flush failed:', e);
    }
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Append an audit entry. Newest entries go to the front so the
 * Log page (which paginates from offset 0) shows them first.
 */
export function appendAudit(entry: {
  type: AuditType;
  message: string;
  agent?: string;
  research?: string;
  tokens?: number;
  severity?: AuditSeverity;
}): void {
  const arr = loadCache();
  const full: AuditEntry = {
    id: crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    type: entry.type,
    agent: entry.agent || 'System',
    message: entry.message,
  };
  if (entry.research) full.research = entry.research;
  if (typeof entry.tokens === 'number') full.tokens = entry.tokens;
  if (entry.severity) full.severity = entry.severity;

  arr.unshift(full);
  if (arr.length > MAX_ENTRIES) arr.length = MAX_ENTRIES;
  scheduleFlush();
}

export function listAudit(opts?: { limit?: number; offset?: number }): {
  entries: AuditEntry[];
  total: number;
} {
  const arr = loadCache();
  const offset = Math.max(0, opts?.offset || 0);
  const limit = Math.max(1, Math.min(opts?.limit || 200, MAX_ENTRIES));
  return { entries: arr.slice(offset, offset + limit), total: arr.length };
}

/** Build a CSV dump of all in-cache entries (header + rows). */
export function exportAuditCSV(): string {
  const arr = loadCache();
  const header = 'timestamp,type,agent,research,message,tokens,severity\n';
  const csvEsc = (s: string) => '"' + String(s || '').replace(/"/g, '""') + '"';
  const rows = arr.map(e => [
    e.timestamp,
    e.type,
    e.agent,
    e.research || '',
    csvEsc(e.message),
    typeof e.tokens === 'number' ? String(e.tokens) : '0',
    e.severity || 'info',
  ].join(',')).join('\n');
  return header + rows + '\n';
}

/** Force-flush any pending writes. Call before app quit. */
export function flushAuditNow(): void {
  if (pendingWriteTimer) {
    clearTimeout(pendingWriteTimer);
    pendingWriteTimer = null;
  }
  if (cache !== null) {
    try { atomicWriteJSON(getAuditFile(), cache); } catch { /* ignore */ }
  }
}

/** Reset in-memory cache (e.g. after workspace switch). */
export function resetAuditCache(): void {
  cache = null;
}
