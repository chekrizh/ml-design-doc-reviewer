<div align="center">

# ML Design Doc Reviewer

**AI reviewer and linter for ML system design docs: finds architectural gaps, inconsistencies, and missing reasoning without giving away the solution.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](#license)
[![Project Status](https://img.shields.io/badge/status-early%20design-orange.svg)](#quick-start)
[![Contributions](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## Overview

ML Design Doc Reviewer is an open-source agent for reviewing ML system design documents.

It helps engineers practice ML system design by surfacing architectural gaps, cross-section inconsistencies, weak trade-offs, unsupported assumptions, and missing reasoning. Instead of generating a finished design, it returns focused critique and guiding questions for the next revision.

The project is currently in early design. The first implementation will focus on a simple review loop over design documents, with evaluation and grounding capabilities added incrementally.

## Quick Start

The current baseline reviews a plain text or Markdown ML design document from the CLI.

```bash
uv run critic review path/to/design-doc.md
```

## Why This Exists

ML system design improves through repeated feedback cycles. Human review is valuable, but it is slow, expensive, and hard to scale. Generic LLM feedback is fast, but often too vague, too confident, or too willing to solve the task for the author.

This project aims to provide a middle ground:

- fast feedback on ML design documents;
- structured findings tied to the submitted document;
- focus on architecture and methodology;
- grounded in real production ML systems;
- measurable review quality through offline evaluation.

## What It Reviews

The reviewer is intended for ML system design documents that cover topics such as:

- problem framing and product goals;
- metrics and loss functions;
- datasets, labeling, and feature design;
- validation strategy and data leakage risks;
- baseline and modeling choices;
- training and serving pipelines;
- deployment, monitoring, and operations;
- trade-offs, constraints, and failure modes.

## Status

This repository is an early baseline implementation.

Current scope:

- text or Markdown document input;
- one LLM call that scores the full critic checklist and writes remarks;
- prompt-level input relevance guardrail;
- document-grounded, pedagogical critique without ready-made solutions;
- deterministic ranking of the most important remarks;
- structured JSON output for automation;

Planned initial surfaces:

- Dockerized FastAPI service for reviewing design documents;
- simple web UI for submitting documents and reading critique;
- structured JSON input in addition to plain text and Markdown;
- image input support in addition to the current text-only flow;
- human-readable Markdown report;
- offline evaluation harness for weighted checklist score, direct-answer violations, and false critique rate;
- golden and synthetic dataset workflow for repeatable critic evaluation;
- experiment observability for prompt, checklist, model, latency, and cost tracking;


## Installation

```bash
uv sync
```

## Usage

```bash
cp .env.example .env
# in .env, set OPENAI_API_KEY=your-key-here
uv run critic review design-doc.md
```

## Dataset Preparation

The `src/prepare_data` source tree is a maintainer-only tool for building the
evaluation dataset. It is not included in the runtime wheel, and its heavier
dependencies are installed only with the `prepare-data` dependency group.

Heavy artifacts are hosted on [Hugging Face](https://huggingface.co/datasets/ml-system-design/ml-design-doc-reviewer-data) — a git clone contains only lightweight config files (~300 KB).

### What stays in git

| Path | Description |
|------|-------------|
| `data/sample_manifest.csv` | Stratified 100-case sample |
| `data/error_topology.csv` | Controlled error taxonomy |
| `data/dataset_revision.txt` | Pinned HF dataset revision |
| `prompts/` | Normalization prompts |

### Download dataset from Hugging Face

```bash
uv sync --python 3.12 --group prepare-data
cp .env.prepare-data.example .env

# Download raw / normalized / flawed docs + images (~100 MB)
uv run --group prepare-data python -m prepare_data.cli download-dataset

# Optional: also fetch the upstream Evidently AI catalog CSV for re-sampling
uv run --group prepare-data python -m prepare_data.cli download-dataset --include-source-catalog
```

Configure `HF_DATASET_REPO` and `HF_DATASET_REVISION` in `.env` (defaults in `.env.prepare-data.example`).

**Critic-only users** can download just the flawed split:

```bash
huggingface-cli download ml-system-design/ml-design-doc-reviewer-data flawed --repo-type dataset --revision v1.0.0
```

### Prerequisites (full pipeline)

- Python 3.12
- [uv](https://docs.astral.sh/uv/)
- `brew install tesseract` (OCR step)
- OpenAI-compatible API key (`OPENAI_API_KEY` + `OPENAI_BASE_URL`; OpenRouter works out of the box)
- Hugging Face token (upload only; download works for public datasets)

### Regenerate locally (maintainers)

```bash
# 1. Stratified sample (requires source catalog CSV)
uv run --group prepare-data python -m prepare_data.cli sample

# 2. Fetch articles, OCR images
uv run --group prepare-data python -m prepare_data.cli fetch
uv run --group prepare-data python -m prepare_data.cli enrich-images
uv run --group prepare-data python -m prepare_data.cli ocr-images

# 3. Normalize via OpenAI-compatible API
uv run --group prepare-data python -m prepare_data.cli normalize

# 4. Inject controlled errors
uv run --group prepare-data python -m prepare_data.cli inject-errors

# 5. Publish snapshot to Hugging Face
HF_TOKEN=... uv run --group prepare-data python -m prepare_data.cli upload-dataset
```

Use `--force` with `fetch`, `normalize`, or `all` to re-process existing outputs.

The normalization prompt lives in [`prompts/normalize_to_disdoc.md`](prompts/normalize_to_disdoc.md).

### Output layout (after download or local prep)

| Path | Description |
|------|-------------|
| `data/raw_documents/` | Raw markdown exports, `.meta.json`, images |
| `data/normalized_disdocs/` | Canonical 14-section ML design documents |
| `data/flawed_disdocs/` | Docs with injected errors + `injection_log.csv` |
| `data/disdoc_examples/` | Few-shot reference design docs for normalization |

## Architecture

The baseline keeps the review loop deliberately small:

1. `critic.cli` reads the design document as text.
2. `ReviewService` calls `critique()` with the document and checklist.
3. `critique()` renders the prompt, asks the LLM for structured JSON, and validates that every checklist item was scored.
4. `rank_notes()` keeps only incomplete items, orders them by checklist importance, and returns the top-N notes.
5. The service returns a `ReviewResult` JSON object and writes optional lifecycle/inference logs.

No RAG, verifier, chat history, JSON document schema, or partial-document snapshots are part of this baseline.

## License

This project is licensed under the Apache License 2.0.
