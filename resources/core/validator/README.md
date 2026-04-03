# Cross-Validation Protocol

## Principle

No significant scientific claim proceeds to publication without independent verification by a different agent or method.

## Validation Levels

### Level 1: Reproduction (minimum)
- Same code, same parameters, different agent instance
- Verifies: no non-deterministic bugs, correct parameter passing
- Required for: all numerical results

### Level 2: Independent Implementation
- Different code, same algorithm, same parameters
- Verifies: no implementation bugs
- Required for: core results that appear in paper abstracts

### Level 3: Alternative Method
- Different algorithm or approach, same physical question
- Verifies: result is not method-dependent
- Required for: novel or surprising claims (e.g., "negative DD")

## Workflow

```
1. Primary agent completes experiment → writes results to workspace/data/
2. Primary agent creates validation request → workspace/messages/
3. Validator agent reads request + original experiment registration
4. Validator runs independent check (Level 1, 2, or 3 as specified)
5. Validator writes validation report → workspace/data/<exp_id>/validation/
6. If results match: proceed to next stage
7. If results differ: flag discrepancy, escalate to human PI
```

## Validation Report Format

```json
{
  "experiment_id": "EXP-2026-04-02-001",
  "validator": "reviewer",
  "validation_level": 2,
  "method_used": "Independent Python implementation of DD calculation",
  "original_result": {"DD_d1": -0.041},
  "validated_result": {"DD_d1": -0.039},
  "match": true,
  "tolerance": 0.005,
  "notes": "Results agree within numerical tolerance",
  "timestamp": "2026-04-02T10:00:00Z"
}
```

## When Cross-Validation is Mandatory

- [ ] Any result that will appear in a paper abstract
- [ ] Any result that contradicts established knowledge
- [ ] Any result where the sign matters (positive vs negative)
- [ ] Any result that depends on convergence of iterative methods
- [ ] Any claim of "first observation" or "novel discovery"
