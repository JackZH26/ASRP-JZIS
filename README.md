# ASRP Desktop

> A 3-agent research team that catches errors before they ship.

Desktop application for the **[AI Scientific Research Platform](https://asrp.jzis.org)** — an open-source, Discord-native research environment that pre-registers experiments, cross-validates results, and audits every decision. Runs on your own machine.

Apache 2.0 · macOS · Windows · Linux

---

## Why ASRP?

AI agents can produce a paper a day. Most of those papers won't reproduce. ASRP encodes the scientific method into the workflow itself — hypotheses are pre-registered with falsification criteria, every result is cross-validated by an independent reviewer, and every decision is logged to an immutable audit trail.

## The 3 Agents

| Role | Model | What they do |
|---|---|---|
| **Theorist** | `OPUS · LEAD` | Intake, hypotheses, literature recon, experiment design |
| **Engineer** | `SONNET · BUILD` | Code, simulations, numerical experiments, result checks |
| **Reviewer** | `HAIKU · CRITIC` | Cross-validation, dispatch, daily standups, audit log |

Each agent runs as an independent Discord bot via the embedded **OpenClaw gateway** — you talk to them in `#general` like real teammates. `@mention` the Theorist with your research question and the team takes it from there.

> **Runtime invariant:** sender ≠ mention target. ASRP's self-healing dispatcher prevents Discord self-mention deadlocks, so phase kickoffs and standups always route through the Reviewer.

## SRW-v3 — Standard Research Workflow (7 phases)

1. **Intake** — Theorist Q&A in Discord
2. **Lit Recon** — Web · arXiv · self-search
3. **Opportunities** — Synthesise + self-critique
4. **Direction Pick** — User chooses the path
5. **Plan** — Engineer feasibility review
6. **Schedule** — Time + budget lock-in
7. **Active Loop** — Execute · review · iterate

## Features

- **Setup Wizard** — 5 steps: profile, API keys, agent config, Discord bots, launch (~10 min)
- **Embedded OpenClaw Gateway** — One click spins up 3 Discord bots
- **Research Registry** — Pre-register hypotheses with falsification criteria
- **Papers Pipeline** — 6-stage workflow from draft to submission
- **Challenge Center** — 396 curated problems across Math / Physics / Chemistry / Life Sciences (99 each) to benchmark your agents
- **Local AI (Ollama)** — Hardware detection, headless / VPS mode, run fully offline
- **Token Budget** — Per-task model routing with live cost display
- **Self-Test Suite** — 25 pre-flight checks
- **i18n** — English · 简体中文 · 繁體中文 · Deutsch
- **Auto-Update** — Checks on startup, one-click install
- **Audit Log** — Every decision, every dispatch, immutable

## Quick Start

1. Download from [Releases](https://github.com/JackZH26/ASRP-JZIS/releases/latest)
2. Install and open ASRP Desktop
3. Run the 5-step setup wizard
4. `@mention` Theorist in Discord — your research team is live

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run dist          # All platforms
npm run dist:mac      # macOS (.dmg + .zip)
npm run dist:win      # Windows (.exe)
npm run dist:linux    # Linux (.AppImage)
```

## Architecture

- TypeScript main process + HTML/CSS/JS renderer
- Embedded OpenClaw gateway — 3 independent bot runtimes
- SRW-v3 orchestrator with self-healing dispatcher
- Encrypted API key storage (OS keychain)
- SQLite local state, JWT sessions
- Discord integration via OpenClaw channels
- Local AI via Ollama (optional)

## Links

- **Website:** https://asrp.jzis.org
- **Releases:** https://github.com/JackZH26/ASRP-JZIS/releases
- **JZIS:** https://www.jzis.org
- **Publications:** https://jzis.org/publications/

## License

Apache-2.0 · Copyright © 2026 JZ Institute of Science
