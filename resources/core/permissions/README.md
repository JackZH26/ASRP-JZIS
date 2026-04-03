# ASRP Permission Management

## Role-Based Access Control

### Permission Matrix

| Resource | Theorist | Engineer | Reviewer | Librarian | ITDoctor |
|----------|----------|----------|----------|-----------|----------|
| workspace/data/ | R/W | R/W | **R** | R | — |
| workspace/registry/ | R/W | R/W | R | R | R |
| workspace/papers/ | R/W | R | **R** | R | — |
| workspace/audit/ | Append | Append | Append | Append | R/Verify |
| workspace/messages/ | R/W | R/W | R/W | R/W | R |
| workspace/literature/ | R/W | R | R | R/W | — |
| workspace/logs/ | W (own) | W (own) | W (own) | W (own) | R/W (all) |
| config.yaml | — | — | — | — | R/W |
| backups/ | — | — | — | — | R/W |

**R** = Read, **W** = Write, **—** = No access, **Append** = Add only

### Enforcement

In single-machine mode, permissions are enforced by:
1. Agent system prompts (SOUL.md) defining access rules
2. Optional filesystem permissions (Unix groups)
3. Audit log monitoring by ITDoctor

The Reviewer agent has **read-only access** to data and papers, ensuring independent evaluation.

### Escalation

When an agent needs access beyond its role:
1. Creates request in `workspace/messages/`
2. Human PI reviews and approves
3. Logged in audit trail
