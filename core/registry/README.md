# Experiment Pre-Registration System

## Purpose

Every experiment must be registered **before** execution. This prevents:
- Post-hoc hypothesis adjustment (p-hacking)
- Cherry-picking favorable results
- Unconscious confirmation bias

## Workflow

```
1. Researcher creates experiment spec → registry/<id>.json
2. Agent reads spec, confirms parameters
3. Experiment executes
4. Results recorded in same file (actual_result, outcome fields)
5. Discrepancies between expected and actual are documented
```

## Usage

```bash
# Create new experiment registration
cp template.json registry/EXP-2026-04-02-001.json
# Edit: fill in hypothesis, method, expected results

# After experiment completes
# Update: actual_result, outcome, errors_found, lessons_learned
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| experiment_id | Yes | Unique identifier (format: EXP-YYYY-MM-DD-NNN) |
| date_registered | Yes | ISO 8601 timestamp |
| researcher | Yes | Agent role or human name |
| hypothesis | Yes | Clear, falsifiable statement |
| method | Yes | Exact procedure to be followed |
| parameters | Yes | All numerical/config parameters |
| expected_result | Yes | What you expect to find |
| success_criteria | Yes | Quantitative threshold for "success" |
| failure_criteria | Yes | What would disprove the hypothesis |
| status | Auto | registered → running → completed/failed/refuted |
| actual_result | Post | What actually happened |
| outcome | Post | confirmed / refuted / inconclusive |
| errors_found | Post | List of errors discovered during execution |
| lessons_learned | Post | What to do differently next time |

## Validation Rules

1. `hypothesis` must be falsifiable (no "explore X" or "study Y")
2. `success_criteria` must be quantitative where possible
3. `failure_criteria` must be specified (what would make you abandon the hypothesis)
4. `parameters` must be complete enough for independent reproduction
