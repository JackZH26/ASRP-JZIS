# DFT/iDEA Benchmark Problem Set

Standardized test problems for evaluating AI agent accuracy in computational physics research. All problems use the [iDEA code](https://github.com/iDEA-org/iDEA) with known exact solutions.

## Installation

```bash
pip install iDEA-latest numpy scipy matplotlib
```

## Problem Set

### Level 1: Basic (Known answers, straightforward)

**P1: Two-Electron Atom Ground State**
- System: 2e soft-Coulomb atom, 300 grid points
- Task: Compute exact energy, compare with LDA and HF
- Known answer: E_exact ≈ -1.7076 Ha, E_LDA ≈ -1.7476 Ha
- Trap: LDA energy is MORE negative (overbinding), not less
- Agent test: Does the agent correctly identify LDA overbinding?

**P2: Density Normalization**
- System: Same as P1
- Task: Verify ∫n(x)dx = N for exact, LDA, and HF densities
- Known answer: All should integrate to 2.0000 (±0.001)
- Trap: Numerical integration method matters (trapezoid vs Simpson)

**P3: KS Eigenvalue Gap**
- System: 2e atom
- Task: Extract HOMO-LUMO gap from LDA and exact KS potential
- Known answer: LDA gap ≠ exact KS gap
- Trap: Using LDA eigenvalues as "exact" KS eigenvalues (the DD study error)

### Level 2: Intermediate (Requires careful methodology)

**P4: Dissociation Curve**
- System: 2e diatomic molecule, separation d = 1 to 12 a.u.
- Task: Plot E(d) curve, identify equilibrium distance
- Known answer: E → 2×E_atom as d → ∞
- Trap: LDA fails to converge at large d (dissociation catastrophe)

**P5: KS Potential Inversion**
- System: 2e atom
- Task: Reverse-engineer exact KS potential from exact density
- Known answer: v_xc should be smooth, negative, with correct asymptotic behavior
- Trap: Convergence tolerance matters; too loose → incorrect v_xc shape

**P6: Derivative Discontinuity**
- System: 2e atom
- Task: Compute DD = (I-A) - (ε_LUMO - ε_HOMO) using EXACT KS eigenvalues
- Known answer: DD > 0 for single-well systems
- Trap: Must use exact KS potential (from inversion), not LDA KS eigenvalues

### Level 3: Advanced (Requires deep understanding)

**P7: Multi-Well DD Geometry Dependence**
- System: 3-well system [0, d, 15], vary d
- Task: Compute DD(d) curve using exact KS eigenvalues
- Known answer: DD depends on geometry (our DD study case)
- Trap: Non-interacting gap ≠ exact KS gap (the error we caught)

**P8: Fractional Electron Number**
- System: 2e atom at N = 2 ± δ (ensemble DFT)
- Task: Verify piecewise linearity of E(N) 
- Known answer: E(N) is piecewise linear between integers
- Trap: Numerical implementation of fractional N

**P9: Time-Dependent Response**
- System: 2e atom with sudden perturbation
- Task: Propagate and compute dipole response
- Known answer: Matches exact TDDFT frequencies
- Trap: Time step too large → numerical instability

## Scoring

Each problem scored on:
1. **Correctness** (0-3): Wrong / Partially correct / Correct / Correct with insight
2. **Methodology** (0-3): No method / Ad hoc / Systematic / Rigorous with validation
3. **Self-correction** (0-2): No errors found / Errors found but not fixed / Errors found and fixed
4. **Documentation** (0-2): None / Partial / Complete with reproducible code

Maximum score per problem: 10
Maximum total score: 90

## Usage in ASRP Evaluation

Run the same problem set with:
- (A) Single AI agent, no human oversight
- (B) Two AI agents with cross-validation protocol
- (C) Human + AI agent collaborative mode

Compare scores across modes to quantify the value of ASRP protocols.
