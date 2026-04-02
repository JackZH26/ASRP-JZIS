# ASRP Architecture

## Overview

ASRP runs multiple AI agent roles on a single machine with a shared filesystem. This is the default and recommended deployment for individual researchers and small teams.

## System Layout

```
/asrp/                          # ASRP root (configurable)
├── config.yaml                 # Configuration (gitignored)
├── .env                        # API keys (gitignored)
├── workspace/                  # Shared research workspace
│   ├── data/                   # Experimental data
│   ├── registry/               # Pre-registered experiments
│   ├── papers/                 # Paper drafts
│   ├── audit/                  # Decision audit logs (append-only)
│   ├── messages/               # Inter-agent message queue (file-based)
│   ├── literature/             # Reference papers and notes
│   └── logs/                   # Agent execution logs
├── backups/                    # ITDoctor managed backups
└── agents/                     # Agent-specific state
    ├── theorist/
    ├── engineer/
    ├── reviewer/
    ├── librarian/
    └── itdoctor/
```

## Agent Roles

| Role | Responsibility | Workspace Access | Model Tier |
|------|---------------|-----------------|------------|
| **Theorist** | Hypothesis generation, reasoning, paper writing | Read/Write | Opus |
| **Engineer** | Code, computation, data pipelines | Read/Write + Execute | Sonnet |
| **Reviewer** | Independent peer review, cross-validation | **Read-Only** | Opus |
| **Librarian** | Literature search, reference management | Read + Web | Flash |
| **ITDoctor** | Monitoring, backups, agent lifecycle | System-level | Flash |

### Reviewer Isolation Principle

The Reviewer agent has **read-only access** to the workspace. It cannot modify experimental data or influence ongoing experiments. This ensures independent evaluation — the same principle as blind peer review.

## Single-Machine Deployment (Default)

```
┌──────────────────────────────────────────────┐
│                Host Machine                   │
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Theorist  │  │Engineer  │  │Reviewer  │   │
│  │(OpenClaw │  │(OpenClaw │  │(OpenClaw │   │
│  │ agent 1) │  │ agent 2) │  │ agent 3) │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │  (R/O)  │
│  ┌────┴──────────────┴──────────────┴────┐   │
│  │     Shared Filesystem: /asrp/workspace │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌──────────┐  ┌──────────┐                  │
│  │Librarian │  │ITDoctor  │ ← cron/systemd   │
│  └──────────┘  └──────────┘                  │
└──────────────────────────────────────────────┘
```

Each agent runs as a separate OpenClaw instance (or any LLM agent platform). All agents share the same filesystem, making file-based communication natural and zero-config.

### How Agents Communicate

**File-based message passing** (no external dependencies):

```
# Agent A sends a task to Agent B:
workspace/messages/
├── theorist-to-reviewer-2026-04-02T08-30-001.json
├── engineer-to-theorist-2026-04-02T09-15-002.json
└── itdoctor-alert-2026-04-02T10-00-003.json
```

Message format:
```json
{
  "id": "msg-001",
  "from": "theorist",
  "to": "reviewer",
  "type": "review_request",
  "priority": "normal",
  "timestamp": "2026-04-02T08:30:00Z",
  "payload": {
    "paper_path": "workspace/papers/dd-study/paper_v2.tex",
    "review_standard": "PRL",
    "deadline": "2026-04-02T12:00:00Z"
  },
  "status": "pending"
}
```

Receiving agent polls `workspace/messages/` for messages addressed to it. After processing, updates `status` to `"completed"` with response.

### File Locking

For concurrent writes to shared files, use advisory file locking:
- Each agent writes to its own subdirectory (`agents/<role>/scratch/`)
- Only moves finalized files to shared `workspace/` directories
- Registry and audit files use append-only mode with file locks

### Process Management

**Option 1: Systemd (Linux)**
```ini
# /etc/systemd/system/asrp-theorist.service
[Unit]
Description=ASRP Theorist Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/openclaw start --config /asrp/agents/theorist/config.json
Restart=on-failure
RestartSec=30
User=asrp

[Install]
WantedBy=multi-user.target
```

**Option 2: PM2 (Node.js)**
```json
{
  "apps": [
    {"name": "asrp-theorist", "script": "openclaw", "args": "start --config /asrp/agents/theorist/config.json"},
    {"name": "asrp-engineer", "script": "openclaw", "args": "start --config /asrp/agents/engineer/config.json"},
    {"name": "asrp-reviewer", "script": "openclaw", "args": "start --config /asrp/agents/reviewer/config.json"},
    {"name": "asrp-itdoctor", "script": "openclaw", "args": "start --config /asrp/agents/itdoctor/config.json"}
  ]
}
```

**Option 3: Simple shell script**
```bash
#!/bin/bash
# start-asrp.sh
openclaw start --config /asrp/agents/theorist/config.json &
openclaw start --config /asrp/agents/engineer/config.json &
openclaw start --config /asrp/agents/reviewer/config.json &
openclaw start --config /asrp/agents/itdoctor/config.json &
wait
```

## Research Orchestration

### Serial Pipeline (within a research line)

```
Pre-register → Design → Implement → Execute → Validate → Analyze → Write → Review
     │                                                                        │
     └────────────────────── Iterate if review fails ────────────────────────┘
```

Each step produces files in `workspace/` that the next step reads.

### Parallel Execution (across research lines)

```
Line A (Superconductivity): ═══════════════════►
Line B (Riemann Hypothesis): ═══════════════════►
Line C (Fine Structure):     ═══════════════════►
                                                  ├── Cross-reference
                                                  └── Paper writing
```

Independent lines run in parallel. Each has its own subdirectory under `workspace/data/`.

### Fork-Join Cross-Validation

```
               ┌─ Engineer runs experiment ─┐
Hypothesis ────┤                            ├── Compare → Accept/Reject
               └─ Reviewer re-runs independently ─┘
```

Both agents work from the same pre-registered experiment spec. Results compared automatically.

## Security

- **No hardcoded keys/tokens** in any file
- All credentials via `.env` or `config.yaml` (both gitignored)
- `asrp init` wizard for first-time setup
- Reviewer agent: read-only filesystem access
- Audit logs: append-only (enforced by ITDoctor)
- Backups: encrypted at rest (optional)

## Future: Docker Deployment

For teams needing stronger isolation, a Docker Compose configuration is planned. Each agent runs in its own container with shared volumes. See roadmap in project issues.
