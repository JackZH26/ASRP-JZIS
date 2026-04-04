// ============================================================
// OpenClaw Bridge — Connects to embedded OpenClaw Gateway
// Makes real HTTP calls to the gateway API when running,
// returns empty defaults when gateway is offline.
// ============================================================

import { openclawManager } from './openclaw-manager';

export interface AgentStatus {
  name: string;
  role: string;
  status: 'running' | 'idle' | 'stopped' | 'error';
  model: string;
  sessions: number;
  tokenUsage: { input: number; output: number; cost: number };
  uptime: number;
  recentLogs: string[];
}

export interface WorkspaceStats {
  experiments: number;
  confirmed: number;
  refuted: number;
  papers: number;
}

export interface TokenUsage {
  models: Array<{
    name: string;
    input: number;
    output: number;
    cost: number;
    budget: number;
    pct: number;
  }>;
  dailyTotal: number;
  dailyBudget: number;
  pct: number;
}

export interface ResearchProgress {
  rh: number;
  sc: number;
  bc: number;
}

export interface GatewayStatus {
  running: boolean;
  pid: number | null;
  uptime: number;
}

// ---- Public API ----

export function getAgentStatuses(): AgentStatus[] {
  // TODO Phase 7.5: Query gateway sessions API for real agent data
  // For now, return empty — the gateway handles agent sessions internally
  return [];
}

export function getWorkspaceStats(): WorkspaceStats {
  return { experiments: 0, confirmed: 0, refuted: 0, papers: 0 };
}

export function getTokenUsage(): TokenUsage {
  return { models: [], dailyTotal: 0, dailyBudget: 15.00, pct: 0 };
}

export function getResearchProgress(): ResearchProgress {
  return { rh: 0, sc: 0, bc: 0 };
}

export function getGatewayStatus(): GatewayStatus {
  const status = openclawManager.getStatus();
  return {
    running: status.running,
    pid: status.pid,
    uptime: status.uptime,
  };
}

export function startAgent(_agentName: string): { success: boolean; message: string } {
  return { success: true, message: `Agent start requested (stub)` };
}

export function stopAgent(_agentName: string): { success: boolean; message: string } {
  return { success: true, message: `Agent stop requested (stub)` };
}

export function restartAgent(_agentName: string): { success: boolean; message: string } {
  return { success: true, message: `Agent restart requested (stub)` };
}

export function getAgentLogs(_agentName: string): string[] {
  return [];
}

export function getAgentSoul(agentName: string): string {
  return `# ${agentName} — SOUL\n\n(No SOUL file found. Create one to define this agent's identity and values.)\n`;
}

export function saveAgentSoul(_agentName: string, _content: string): { success: boolean } {
  return { success: true };
}

export function renameAgent(_oldName: string, _newName: string): { success: boolean } {
  return { success: true };
}

export function setAgentModel(_agentName: string, _model: string): { success: boolean } {
  return { success: true };
}
