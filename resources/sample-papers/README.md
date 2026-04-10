# Sample Papers

This directory contains sample paper metadata for the three sample research projects shown on the **Papers** page when the "Examples" toggle is enabled.

## Structure

```
sample-papers/
├── R001-number-theory/
│   └── papers.json
├── R002-superconductivity/
│   └── papers.json
└── R003-fundamental-physics/
    └── papers.json
```

Each `papers.json` file contains an array of paper entries with:

- `title` — full paper title
- `filename` — canonical PDF filename
- `date` — publication / preprint date
- `status` — `preprint` | `submitted` | `published`
- `figshare` — figshare DOI (e.g. `10.6084/m9.figshare.31879441`) — opens at `https://doi.org/<doi>`
- `arxiv` — arXiv identifier (e.g. `2603.27613`) — opens at `https://arxiv.org/abs/<id>`
- `version` — paper version label

## How they are displayed

The Papers page (`src/renderer/pages/papers.html`) embeds the same metadata inline as `SAMPLE_PAPER_DIRS` and renders one folder per project under the "PROJECTS" tree, marked with a SAMPLE badge. The figshare and arXiv links are clickable and open in the system browser.

These JSON files are kept here as the canonical source of truth — keep them in sync with the inline `SAMPLE_PAPER_DIRS` constant in `papers.html` if you add or update sample papers.

## Note on PDFs

No actual PDF files are bundled. Sample paper rows link to the figshare DOI / arXiv URL where the full text is hosted.
