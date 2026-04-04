// ============================================================
// OpenClaw Config Generator
// Generates openclaw.json for the ASRP profile based on
// user's setup (agent configs, API keys, workspace path).
// ============================================================

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { openclawManager } from './openclaw-manager';
import * as safeKeyStore from './safe-key-store';

export interface AgentSetupConfig {
  name: string;
  role: string;
  model: string;
  discordToken: string;
  channelId?: string;
  customName?: string;
}

/**
 * Default SOUL templates for each agent role
 */
const SOUL_TEMPLATES: Record<string, string> = {
  Theorist: `# Albert — Theorist Agent

## Identity
You are Albert, the theoretical physicist of the ASRP research team. You generate rigorous scientific hypotheses, identify gaps in theory, and design experiments with clear falsification criteria.

## Core Values
- Theoretical rigor above all
- A refuted hypothesis is as valuable as a confirmed one
- Register experiments BEFORE running them
- Cite equations and literature where relevant

## Communication Style
Precise, quantitative, and structured. Never speculate without labelling it as speculation.`,

  Engineer: `# Wall-E — Engineer Agent

## Identity
You are Wall-E, the computational engineer of the ASRP research team. You implement, run, and analyse numerical experiments.

## Core Values
- Code correctness over speed
- All results must be reproducible
- Log every run with parameters and outcomes

## Communication Style
Structured output with experiment IDs, parameters, results, and wall-time.`,

  Reviewer: `# Critic — Reviewer Agent

## Identity
You are Critic, the peer reviewer of the ASRP research team. You validate research outputs, challenge assumptions, and ensure scientific integrity.

## Core Values
- Skepticism is a feature, not a bug
- Every claim needs evidence
- Check methodology before celebrating results

## Communication Style
Direct and critical. Flag issues clearly with severity levels.`,

  Librarian: `# Scholar — Librarian Agent

## Identity
You are Scholar, the literature specialist of the ASRP research team. You handle literature search, citation management, and knowledge synthesis.

## Core Values
- Primary sources over secondary
- Citation accuracy is non-negotiable
- Summarize, don't just list

## Communication Style
Concise summaries with proper citations and relevance scores.`,

  ITDoctor: `# DocMario — IT Doctor Agent

## Identity
You are DocMario, the system health monitor of the ASRP research team. You maintain infrastructure, monitor resources, and fix technical issues.

## Core Values
- Prevention over cure
- Monitor silently, alert loudly
- Document every fix

## Communication Style
Status reports with clear action items. Use severity levels: INFO, WARN, ERROR, CRITICAL.`,
};

/**
 * Generate OpenClaw config and write to the ASRP profile directory.
 */
export function generateConfig(
  agents: AgentSetupConfig[],
  guildId: string,
  workspacePath: string,
): { success: boolean; configPath: string; error?: string } {
  try {
    const profileDir = openclawManager.getProfileDir();
    fs.mkdirSync(profileDir, { recursive: true });

    // Get the primary bot token (first agent's token)
    const primaryToken = agents[0]?.discordToken || '';
    if (!primaryToken) {
      return { success: false, configPath: '', error: 'No Discord bot token provided' };
    }

    // Get OpenRouter API key for model access
    const openrouterKey = safeKeyStore.getKey('openrouterKey') || '';

    // Build the config object
    // OpenClaw currently supports one Discord token per instance.
    // We use the first agent's token as the primary connection.
    // All 5 agents share the same gateway but have different SOUL.md files.
    const config: Record<string, unknown> = {
      agents: {
        defaults: {
          workspace: workspacePath,
          model: openrouterKey ? 'anthropic/claude-sonnet-4-6' : 'google/gemini-2.5-flash',
        },
      },
      channels: {
        discord: {
          enabled: true,
          token: primaryToken,
          groupPolicy: 'allowlist',
          guilds: {
            [guildId]: {
              enabled: true,
            },
          },
        },
      },
      gateway: {
        port: 18800,
      },
    };

    // Add OpenRouter key if available
    if (openrouterKey) {
      (config as Record<string, Record<string, unknown>>).providers = {
        openrouter: {
          apiKey: openrouterKey,
        },
      };
    }

    // Add Anthropic key if available
    const anthropicKey = safeKeyStore.getKey('anthropicKey');
    if (anthropicKey) {
      const providers = (config as Record<string, Record<string, unknown>>).providers || {};
      providers.anthropic = { apiKey: anthropicKey };
      (config as Record<string, Record<string, unknown>>).providers = providers;
    }

    // Add Google key if available
    const googleKey = safeKeyStore.getKey('googleKey');
    if (googleKey) {
      const providers = (config as Record<string, Record<string, unknown>>).providers || {};
      providers.google = { apiKey: googleKey };
      (config as Record<string, Record<string, unknown>>).providers = providers;
    }

    // Write config
    const configPath = path.join(profileDir, 'openclaw.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Write SOUL.md files for each agent
    const wsDir = workspacePath || path.join(os.homedir(), 'asrp-workspace');
    fs.mkdirSync(wsDir, { recursive: true });

    for (const agent of agents) {
      const soulContent = SOUL_TEMPLATES[agent.role] || `# ${agent.name} — ${agent.role}\n\nNo template available for this role.`;
      const soulPath = path.join(wsDir, `SOUL-${agent.name}.md`);
      // Only write if not already customized
      if (!fs.existsSync(soulPath)) {
        fs.writeFileSync(soulPath, soulContent, 'utf-8');
      }
    }

    // Write a main SOUL.md that references all agents
    const mainSoulPath = path.join(wsDir, 'SOUL.md');
    if (!fs.existsSync(mainSoulPath)) {
      const agentList = agents.map(a => `- **${a.customName || a.name}** (${a.role}): See SOUL-${a.name}.md`).join('\n');
      const mainSoul = `# ASRP Research Team\n\nThis workspace is managed by the ASRP agent team:\n\n${agentList}\n\nEach agent has its own SOUL file defining its identity and behavior.\n`;
      fs.writeFileSync(mainSoulPath, mainSoul, 'utf-8');
    }

    return { success: true, configPath };
  } catch (err) {
    return { success: false, configPath: '', error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Check if a valid config already exists
 */
export function hasConfig(): boolean {
  const configPath = path.join(openclawManager.getProfileDir(), 'openclaw.json');
  try {
    if (!fs.existsSync(configPath)) return false;
    JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return true;
  } catch {
    return false;
  }
}
