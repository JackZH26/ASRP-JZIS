# ASRP — Agent Science Research Platform

**English** | [中文](README.zh-CN.md) | [Deutsch](README.de.md)

> Encode scientific methodology into AI agent workflows.

**ASRP** is an open-source framework for AI-agent collaborative scientific research. It provides tools, protocols, and a desktop application to make human-agent research collaborations **reproducible, auditable, and self-correcting**.

## Why ASRP?

In March 2026, a researcher and two AI agents produced 20 theoretical physics and mathematics papers in 16 days, submitting 14 to peer-reviewed journals including Physical Review D, Physical Review B, Foundations of Physics, and Experimental Mathematics. 7 papers are currently under review. Critical experiments were self-corrected mid-process when agents discovered methodological errors.

**Speed without rigor is noise. ASRP adds the rigor.**

## Download

**ASRP Desktop** — standard GUI application, no command line needed.

| Platform | Download | Requirements |
|----------|----------|-------------|
| **Windows** | [ASRP_Setup.exe](https://github.com/JackZH26/ASRP-JZIS/releases/latest/download/ASRP_Setup.exe) | Windows 10+ |
| **macOS** | [ASRP_Setup.dmg](https://github.com/JackZH26/ASRP-JZIS/releases/latest/download/ASRP_Setup.dmg) | macOS 12+ |
| **Linux** | [ASRP.AppImage](https://github.com/JackZH26/ASRP-JZIS/releases/latest/download/ASRP_Desktop.AppImage) | Ubuntu 20.04+ |

Or visit [asrp.jzis.org/setup](https://asrp.jzis.org/setup.html) for guided installation.

## Core Principles

1. **Experiment Registration** — Pre-register hypotheses before running experiments. No post-hoc storytelling.
2. **Independent Cross-Validation** — Different agents must reproduce results before they enter a paper.
3. **Audit Trails** — Every decision, every data point, every error correction is logged.
4. **Token Budget Management** — Right model for the right task. Opus for reasoning, Sonnet for code, Flash for search.
5. **Separation of Discovery and Verification** — The agent that proposes a hypothesis is not the one that validates it.

## Agent Roles

| Role | Responsibility | Recommended Model |
|------|---------------|-------------------|
| **Theorist** | Hypothesis generation, theoretical reasoning, paper writing | Claude Opus |
| **Engineer** | Code, computation, data pipelines | Claude Sonnet |
| **Reviewer** | Independent peer review, cross-validation (read-only access) | Claude Opus |
| **Librarian** | Literature search, reference management | Gemini Flash |
| **ITDoctor** | System monitoring, backups, agent lifecycle management | Gemini Flash |
| **Assistant** | Setup guidance, daily help, onboarding (local Gemma 27B or cloud) | Gemma 27B / Sonnet |

## ASRP Desktop

A full-featured desktop application with Mint Apple design.

**Key Features:**
- 🔐 Login / Register with local authentication
- 🧙 4-step Setup Wizard with auto API key provisioning
- 📊 Real-time Dashboard (agent status, token usage, research progress)
- 💬 Assistant Chat Panel (Cmd/Ctrl+J, local or cloud model)
- 🤖 Agent Management (SOUL editor, model switching, logs, restart)
- 📁 File Manager (directory tree, preview, edit, search, PDF viewer)
- 📄 Paper Pipeline (6-stage workflow, version diff, review records, submission tracking)
- 🔬 Experiment Registry with audit trail and CSV export
- 🦙 Ollama Integration (optional local Gemma 27B for zero-cost assistant queries)

See [`desktop/`](desktop/) for source code and development instructions.

## Project Structure

```
ASRP-JZIS/
├── desktop/               # Desktop application (Electron + TypeScript)
│   ├── src/main/          # Main process (auth, IPC, Ollama, OpenClaw bridge)
│   ├── src/renderer/      # UI (Mint Apple design system, 9 pages)
│   └── src/preload/       # Secure IPC bridge
├── core/                  # Core framework
│   ├── registry/          # Experiment pre-registration system
│   ├── validator/         # Independent cross-validation protocols
│   ├── audit/             # Decision audit trails
│   └── budget/            # Token & compute budget management
├── agents/                # Agent role templates (SOUL definitions)
│   ├── theorist.md        # Hypothesis generation + reasoning
│   ├── engineer.md        # Code + computation
│   ├── reviewer.md        # Independent peer review
│   ├── librarian.md       # Literature search + management
│   ├── itdoctor.md        # System operations + monitoring
│   └── assistant-soul.md  # Setup + help assistant
├── benchmarks/            # Standard test suites
├── examples/              # Complete case studies
├── setup/                 # Web-based setup wizard
└── docs/                  # Documentation
```

## Relationship to OpenClaw

ASRP is not a general-purpose agent platform — it's a **science-specific skill layer** that can run on top of [OpenClaw](https://github.com/openclaw/openclaw) or any LLM agent framework.

| | OpenClaw | ASRP |
|---|---|---|
| **Scope** | General-purpose AI agent | Science research workflows |
| **Users** | Developers, power users | Researchers, students, labs |
| **Key Feature** | Tool orchestration | Scientific method enforcement |

## Status

🔵 **Alpha (v0.1.0)** — Desktop application functional with demo data. Core framework operational. Agent integration in progress.

## Case Study: 20 Papers in 16 Days

See [`examples/portfolio/`](examples/portfolio/) for the complete analysis of our founding case study, including:
- Fine-structure constant α (4 papers)
- Riemann Hypothesis (2 papers)
- Superconductivity (3 papers)
- Membrane models (2 papers)
- Quark-lepton-prime mapping (1 paper)
- Mathematical physics (8 papers)

14 papers submitted to peer-reviewed journals. 7 currently under review.

**Cost: ~$10/day in API fees. Time per paper: ~0.8 days.**

## Community

Join our Discord to discuss research, share ideas, and get help:

👉 [**Join ASRP Discord**](https://discord.gg/DFmwBkDTB)

## License

Apache 2.0

## Author

[JZIS — JZ Institute of Science](https://www.jzis.org/)
