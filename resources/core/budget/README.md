# Token & Compute Budget Management

## Purpose

Prevent wasteful use of expensive API calls and compute resources. Right model for the right task.

## Model Allocation Policy

| Task Type | Recommended Model | Max Tokens/Task | Rationale |
|-----------|------------------|-----------------|-----------|
| Literature search | Flash (Gemini) | 30,000 | Speed + web access |
| Code writing | Sonnet (Claude) | 50,000 | Speed/quality balance |
| Data analysis | Sonnet (Claude) | 50,000 | Speed/quality balance |
| Theoretical reasoning | Opus (Claude) | 100,000 | Deep reasoning required |
| Paper writing | Opus (Claude) | 150,000 | Highest quality needed |
| Peer review | Opus (Claude) | 80,000 | Critical analysis |
| System monitoring | Flash (Gemini) | 10,000 | Lightweight checks |

## Budget Tracking

Each experiment registration includes estimated token cost. After completion, actual cost is recorded.

```json
{
  "experiment_id": "EXP-001",
  "budget": {
    "estimated_tokens": 50000,
    "estimated_cost_usd": 1.50,
    "actual_tokens": 43000,
    "actual_cost_usd": 1.29,
    "model_breakdown": {
      "opus": 20000,
      "sonnet": 15000,
      "flash": 8000
    }
  }
}
```

## Cost Optimization Rules

1. **Never use Opus for iterative computation** — use Sonnet or local code
2. **Never use Opus for literature search** — use Flash with web access
3. **Batch similar queries** — one large request beats many small ones
4. **Cache results** — save API responses to avoid redundant calls
5. **Dry run first** — test with 1-2 data points before full parameter scan
6. **Set timeout budgets** — kill tasks that exceed 3× estimated tokens
