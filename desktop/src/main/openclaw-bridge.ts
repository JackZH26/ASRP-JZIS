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

const MOCK_AGENTS: AgentStatus[] = [
  {
    name: 'Albert',
    role: 'Theorist',
    status: 'idle',
    model: 'claude-opus-4-6',
    sessions: 0,
    tokenUsage: { input: 45200, output: 12400, cost: 2.80 },
    uptime: 14432,
    recentLogs: [
      '[10:03:14] Hypothesis generation cycle complete',
      '[09:45:02] Registered EXP-004: Fibonacci ill-conditioning',
      '[09:30:00] Daily planning session started',
      '[09:28:11] Reviewed 3 candidate hypotheses, selected 1',
    ],
  },
  {
    name: 'Wall-E',
    role: 'Engineer',
    status: 'running',
    model: 'claude-sonnet-4-6',
    sessions: 1,
    tokenUsage: { input: 22100, output: 8300, cost: 1.10 },
    uptime: 14432,
    recentLogs: [
      '[10:03:02] EXP-003: iDEA run #7, d=5.0, DD=+0.198',
      '[09:58:45] EXP-003: Convergence reached tol=1e-8',
      '[09:15:30] EXP-003: Reverse-engineering started (mu=3.0)',
      '[09:10:00] Workspace scan complete, 0 errors',
    ],
  },
  {
    name: 'Critic',
    role: 'Reviewer',
    status: 'idle',
    model: 'claude-opus-4-6',
    sessions: 0,
    tokenUsage: { input: 8100, output: 3100, cost: 0.55 },
    uptime: 14432,
    recentLogs: [
      '[09:58:10] EXP-002 review: DD sign ambiguity flagged',
      '[09:40:00] Cross-validation of EXP-001 passed',
      '[08:55:00] Methodology check completed for 2 experiments',
    ],
  },
  {
    name: 'Scholar',
    role: 'Librarian',
    status: 'idle',
    model: 'claude-haiku-4-5',
    sessions: 0,
    tokenUsage: { input: 15200, output: 5400, cost: 0.20 },
    uptime: 14432,
    recentLogs: [
      '[09:50:00] Fetched 4 papers on derivative discontinuity',
      '[09:35:00] Citation database updated (847 entries)',
      '[08:30:00] Literature scan: double-delta + exact KS',
    ],
  },
  {
    name: 'DocMario',
    role: 'ITDoctor',
    status: 'idle',
    model: 'claude-haiku-4-5',
    sessions: 0,
    tokenUsage: { input: 5100, output: 2100, cost: 0.10 },
    uptime: 14432,
    recentLogs: [
      '[09:30:05] Health check: all agents online, disk 23%',
      '[09:29:58] Daily backup completed (workspace: 2.4 MB)',
      '[09:00:00] Environment scan complete, 0 issues',
    ],
  },
  {
    name: 'Newton',
    role: 'Analyst',
    status: 'stopped',
    model: 'claude-sonnet-4-6',
    sessions: 0,
    tokenUsage: { input: 0, output: 0, cost: 0.00 },
    uptime: 0,
    recentLogs: [
      '[yesterday] Agent stopped by user request',
    ],
  },
];

const MOCK_WORKSPACE_STATS: WorkspaceStats = {
  experiments: 5,
  confirmed: 2,
  refuted: 1,
  papers: 2,
};

const MOCK_TOKEN_USAGE: TokenUsage = ((): TokenUsage => {
  const opus  = { name: 'Opus 4.6',   input: 53200, output: 15500, cost: 3.35, budget: 10.00, pct: 34 };
  const sonnet= { name: 'Sonnet 4.5', input: 22100, output: 8300,  cost: 1.10, budget:  3.00, pct: 37 };
  const haiku = { name: 'Haiku 4.5',  input: 20300, output: 7500,  cost: 0.30, budget:  2.00, pct: 15 };
  const dailyTotal = opus.cost + sonnet.cost + haiku.cost;
  const dailyBudget = 15.00;
  return {
    models: [opus, sonnet, haiku],
    dailyTotal,
    dailyBudget,
    pct: Math.round((dailyTotal / dailyBudget) * 100),
  };
})();

const MOCK_RESEARCH_PROGRESS: ResearchProgress = {
  rh: 65, // Reproducibility & Honesty
  sc: 76, // Scientific Contribution
  bc: 16, // Broader Context / citations
};

// ---- Public API ----

export function getAgentStatuses(): AgentStatus[] {
  // In production, query the running OpenClaw gateway over IPC/socket.
  return MOCK_AGENTS;
}

export function getWorkspaceStats(): WorkspaceStats {
  return MOCK_WORKSPACE_STATS;
}

export function getTokenUsage(): TokenUsage {
  return MOCK_TOKEN_USAGE;
}

export function getResearchProgress(): ResearchProgress {
  return MOCK_RESEARCH_PROGRESS;
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
  const agent = MOCK_AGENTS.find(a => a.name === _agentName);
  return agent ? agent.recentLogs : [];
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
