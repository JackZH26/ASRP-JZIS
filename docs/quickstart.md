# ASRP Quick Start Guide

## Prerequisites

- Bash shell (Linux/macOS/WSL)
- Python 3.8+ (for JSON processing and experiment scripts)
- An LLM API key (Anthropic, Google, or OpenAI)
- Git (recommended)

## Installation

```bash
git clone https://github.com/JackZH26/agent-science-research-platform.git
cd agent-science-research-platform
```

Add the CLI to your PATH:
```bash
export PATH="$PATH:$(pwd)/bin"
# Or add to ~/.bashrc for permanent access:
echo 'export PATH="$PATH:'$(pwd)'/bin"' >> ~/.bashrc
```

## Step 1: Initialize Your Workspace

```bash
mkdir my-research && cd my-research
asrp init
```

This creates:
```
my-research/
├── config.yaml          # Agent configuration
├── .env                 # API keys (edit this!)
├── .gitignore           # Security: excludes secrets
└── workspace/
    ├── data/            # Experimental data
    ├── registry/        # Pre-registered experiments
    ├── papers/          # Paper drafts
    ├── audit/           # Decision audit trail
    ├── messages/        # Inter-agent communication
    ├── literature/      # Reference materials
    └── logs/            # Execution logs
```

**Important:** Edit `.env` and add at least one API key.

## Step 2: Pre-Register Your First Experiment

```bash
asrp register
```

You'll be prompted for:
- **Hypothesis** (must be falsifiable!)
- **Method** (how you'll test it)
- **Expected result** (what you predict)
- **Success/failure criteria** (quantitative)

This creates a JSON file in `workspace/registry/`.

## Step 3: Run the Experiment

Use your AI agent (OpenClaw, Claude, etc.) to execute the experiment.

**Key rule:** Follow the pre-registered method. Don't change the hypothesis after seeing results.

Save results to `workspace/data/<experiment_id>/`.

## Step 4: Update the Registration

Edit `workspace/registry/EXP-YYYY-MM-DD-NNN.json`:
- Set `status` to `"completed"` or `"failed"`
- Fill in `actual_result`
- Set `outcome` to `"confirmed"`, `"refuted"`, or `"inconclusive"`
- Document any `errors_found`
- Write `lessons_learned`

## Step 5: Cross-Validate

```bash
asrp validate EXP-2026-04-02-001
```

This shows the validation checklist. For significant results, have a second agent independently reproduce the key finding.

## Step 6: Check Status

```bash
asrp status    # Workspace overview
asrp audit     # View decision trail
asrp doctor    # Health check
asrp report    # Generate summary
```

## Example: Complete Walkthrough

```bash
# Initialize
mkdir demo && cd demo
asrp init

# Register experiment
asrp register
# → Hypothesis: "LDA overestimates binding energy of 2-electron atoms by > 1%"
# → Method: "Compare exact vs LDA energy using iDEA code"
# → Expected: "E_LDA < E_exact (more negative)"
# → Success: "|E_LDA - E_exact| / |E_exact| > 0.01"
# → Failure: "Energy difference < 0.5%"

# Run experiment (using your AI agent or manually)
pip install iDEA-latest
python3 << 'PY'
import iDEA
s = iDEA.system.systems.atom
gs = iDEA.methods.interacting.solve(s, k=0)
lda = iDEA.methods.lda.solve(s, k=0, silent=True)
E_exact = gs.energy
E_lda = iDEA.methods.lda.total_energy(s, lda)
error_pct = abs((E_lda - E_exact) / E_exact) * 100
print(f"E_exact = {E_exact:.6f} Ha")
print(f"E_LDA   = {E_lda:.6f} Ha")
print(f"Error   = {error_pct:.1f}%")
# Save results
import json
with open("workspace/data/result.json", "w") as f:
    json.dump({"E_exact": E_exact, "E_lda": E_lda, "error_pct": error_pct}, f, indent=2)
PY

# Update registration with results
# (edit the JSON file)

# Validate
asrp validate EXP-2026-04-02-001

# Check everything
asrp status
asrp audit
asrp doctor
```

## Next Steps

- Read `docs/methodology.md` for the full scientific workflow
- Read `docs/architecture.md` for multi-agent setup
- See `examples/dd-study/` for a complete case study with error correction
- See `examples/portfolio/` for the 20-papers-in-16-days analysis
