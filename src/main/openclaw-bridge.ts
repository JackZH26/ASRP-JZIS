// ============================================================
// OpenClaw Bridge — manages OpenClaw Gateway process lifecycle
// For now: stub that returns realistic mock data.
// Real OpenClaw integration comes in Phase 7.5.
// ============================================================

export interface AgentStatus {
  name: string;
  role: string;
  status: 'running' | 'idle' | 'stopped' | 'error';
  model: string;
  sessions: number;
  tokenUsage: { input: number; output: number; cost: number };
  uptime: number; // seconds
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
  rh: number; // Reproducibility & Honesty
  sc: number; // Scientific Contribution
  bc: number; // Broader Context
}

export interface GatewayStatus {
  running: boolean;
  pid: number | null;
  uptime: number;
}

// ---- Mock data (realistic ASRP context) ----

// Initial empty state — real data comes from OpenClaw gateway in Phase 7.5
const INITIAL_AGENTS: AgentStatus[] = [];

const INITIAL_WORKSPACE_STATS: WorkspaceStats = {
  experiments: 0,
  confirmed: 0,
  refuted: 0,
  papers: 0,
};

const INITIAL_TOKEN_USAGE: TokenUsage = {
  models: [],
  dailyTotal: 0,
  dailyBudget: 15.00,
  pct: 0,
};

const INITIAL_RESEARCH_PROGRESS: ResearchProgress = {
  rh: 0,
  sc: 0,
  bc: 0,
};

// ---- Public API ----

export function getAgentStatuses(): AgentStatus[] {
  // In production, query the running OpenClaw gateway over IPC/socket.
  return INITIAL_AGENTS;
}

export function getWorkspaceStats(): WorkspaceStats {
  return INITIAL_WORKSPACE_STATS;
}

export function getTokenUsage(): TokenUsage {
  return INITIAL_TOKEN_USAGE;
}

export function getResearchProgress(): ResearchProgress {
  return INITIAL_RESEARCH_PROGRESS;
}

export function getGatewayStatus(): GatewayStatus {
  return { running: false, pid: null, uptime: 0 };
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
  const souls: Record<string, string> = {
    Albert: `# Albert — Theorist Agent SOUL

## Identity
You are Albert, the theoretical physicist of the ASRP team. Your role is to generate rigorous scientific hypotheses, identify gaps in theory, and design experiments that can distinguish between competing models.

## Core Values
- Theoretical rigor above all. Verify every assumption.
- A refuted hypothesis is as valuable as a confirmed one.
- Register experiments BEFORE running them.

## Responsibilities
1. Daily hypothesis generation (minimum 1 candidate/day)
2. Experiment design with clear falsification criteria
3. Literature gap identification
4. Collaboration with Engineer on numerical verification

## Communication Style
Precise, quantitative, cite equations where relevant. Never speculate without labelling it as speculation.`,
    'Wall-E': `# Wall-E — Engineer Agent SOUL

## Identity
You are Wall-E, the computational engineer of the ASRP team. You implement, run, and analyse numerical experiments using the iDEA codebase.

## Core Values
- Code correctness over speed.
- All results must be reproducible from a clean environment.
- Log every run with parameters and outcomes.

## Responsibilities
1. Implement simulations as specified by Theorist
2. Run parameter sweeps and collect convergence data
3. Process and format results for Reviewer
4. Maintain clean workspace and dependency environment

## Communication Style
Structured log-format output. Always include: experiment ID, parameters, result, wall-time.`,
  };
  return souls[agentName] || `# ${agentName} — SOUL\n\n(No SOUL file found. Create one to define this agent's identity and values.)\n`;
}

export function saveAgentSoul(_agentName: string, _content: string): { success: boolean } {
  // Stub — real implementation writes to SOUL.md in agent workspace
  return { success: true };
}

export function renameAgent(_oldName: string, _newName: string): { success: boolean } {
  return { success: true };
}

export function setAgentModel(_agentName: string, _model: string): { success: boolean } {
  return { success: true };
}
