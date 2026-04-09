# Sample Researches

This directory contains sample research projects that are automatically seeded into ASRP Desktop on first launch when the workspace is empty.

## Structure

Each research project directory contains:

- **research.json** - Research metadata (title, abstract, tags, status, dates)
- **discoveries.json** - Timeline of key discoveries and milestones
- **papers.json** - References to related papers (metadata only, no PDF files)

## Sample Projects

### R001-number-theory
**Number Theory & the Riemann Hypothesis**
- Focus: Connections between Riemann zeta function, golden ratio φ, number fields ℚ(√5), and Bost-Connes system
- 11 discoveries from 2026-03-16 to 2026-04-04
- 7 papers (preprints and submissions to Experimental Mathematics)

### R002-superconductivity
**Mathematical Structure of BCS Theory and Room-Temperature Superconductivity**
- Focus: Zeta function connections in BCS theory, quantum metric diagnostics, room-temperature SC theory
- 9 discoveries from 2026-03-20 to 2026-03-31
- 5 papers (submissions to Physical Review B and preprints)

### R003-fundamental-physics
**Fundamental Physics: Fine-Structure Constant and Membrane Models**
- Focus: Fine-structure constant α, electron/photon membrane models, quark-lepton mass formulas
- 9 discoveries from 2026-03-16 to 2026-03-30
- 6 papers (preprints on fundamental physics)

## Seeding Logic

The seeding is handled by `src/main/experiment-handlers.ts` in the `seedSampleResearches()` function, which:

1. Checks if workspace has existing researches (skips if not empty)
2. Reads all sample project directories
3. Generates proper EXP IDs for each sample research
4. Creates research directories under `{workspace}/researches/{id}/`
5. Copies discoveries.json and papers.json into each research directory
6. Saves all research records to `{workspace}/system/researches.json`

## Note on PDFs

**No actual PDF files are included** to keep the app bundle size manageable. Paper entries reference figshare DOIs where the papers would be published. The app displays paper metadata and can be extended to fetch/download PDFs on demand.

## Author

All sample researches are authored by **Jian Zhou** at **JZ Institute of Science**.
