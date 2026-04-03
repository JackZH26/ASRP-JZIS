# Agent Skill & Plugin Configuration

Each agent has a curated set of skills optimized for their role. Skills are auto-installed when an agent is initialized.

## Installation

```bash
# Install all skills for a specific agent role
./agents/skills/install.sh <role>

# Install all skills for all agents
./agents/skills/install.sh all
```

## Skill Sources

- **OpenClaw built-in skills:** Bundled with OpenClaw
- **ClawHub skills:** Installed via `clawhub install <skill>`
- **Custom skills:** Project-specific, in workspace/skills/
- **Python packages:** Installed via pip
- **System tools:** Installed via apt/brew
