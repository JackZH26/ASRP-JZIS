# Decision Audit Trail

## Purpose

Every significant decision in a research project should be recorded with context. This creates an auditable chain from initial hypothesis to final publication.

## What to Log

- Hypothesis adoption or abandonment
- Methodology choices (why this method over alternatives)
- Parameter selections
- Error discoveries and corrections
- Paper submission decisions
- Review responses

## Log Format

Append-only JSON Lines file: `workspace/audit/audit.jsonl`

```json
{"timestamp": "2026-04-01T09:00:00Z", "agent": "theorist", "type": "hypothesis", "action": "proposed", "details": "Prime-spaced wells produce negative DD", "rationale": "BC system connection to DFT"}
{"timestamp": "2026-04-01T14:30:00Z", "agent": "reviewer", "type": "methodology", "action": "flagged", "details": "Lattice spans not equal across comparison groups", "severity": "critical"}
{"timestamp": "2026-04-01T15:00:00Z", "agent": "theorist", "type": "hypothesis", "action": "revised", "details": "Spacing asymmetry → negative DD (not prime-specific)", "rationale": "Control experiment with anti-prime lattice"}
{"timestamp": "2026-04-01T21:30:00Z", "agent": "reviewer", "type": "methodology", "action": "flagged", "details": "Using LDA KS gap instead of exact KS gap", "severity": "critical"}
{"timestamp": "2026-04-01T22:00:00Z", "agent": "engineer", "type": "result", "action": "corrected", "details": "d=1.0 DD flips from -0.041 to +0.084 with exact KS gap", "rationale": "Exact potential inversion via iDEA reverse engineering"}
```

## Rules

1. **Append-only** — never delete or modify existing entries
2. **Timestamped** — UTC, ISO 8601
3. **Agent attributed** — which agent made or triggered the decision
4. **Severity rated** — for error entries: info / warning / critical
5. **ITDoctor enforces** — periodic integrity check on audit file
