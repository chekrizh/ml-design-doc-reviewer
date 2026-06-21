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

The implementation is not available yet. The project is expected to support two primary usage modes.

### Docker API

TBD

### GitHub Action

TBD

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

This repository is currently a project scaffold. The implementation is not available yet.

Planned initial surfaces:

- Dockerized API for reviewing design documents;
- GitHub Action for pull request review;
- structured JSON output for automation;
- human-readable Markdown report;


## Installation

Not available yet.

```bash
TBD
```

## Usage

Not available yet.

```bash
TBD
```

## Dataset Preparation

The `src/prepare_data` package builds the evaluation dataset. **Heavy artifacts are hosted on [Hugging Face](https://huggingface.co/datasets/chekrizh/ml-disdoc-eval)** — a git clone contains only lightweight config files (~300 KB).

### What stays in git

| Path | Description |
|------|-------------|
| `data/sample_manifest.csv` | Stratified 100-case sample |
| `data/error_topology.csv` | Controlled error taxonomy |
| `data/dataset_revision.txt` | Pinned HF dataset revision |
| `data/disdoc_examples/` | Few-shot reference design docs |
| `prompts/` | Normalization prompts |

### Download dataset from Hugging Face

```bash
uv sync --python 3.12
cp .env.example .env

# Download raw / normalized / flawed docs + images (~100 MB)
uv run prepare-data download-dataset

# Optional: also fetch the upstream Evidently AI catalog CSV for re-sampling
uv run prepare-data download-dataset --include-source-catalog
```

Configure `HF_DATASET_REPO` and `HF_DATASET_REVISION` in `.env` (defaults in `.env.example`).

**Critic-only users** can download just the flawed split:

```bash
huggingface-cli download chekrizh/ml-disdoc-eval flawed --repo-type dataset --revision v1.0.0
```

### Prerequisites (full pipeline)

- Python 3.12
- [uv](https://docs.astral.sh/uv/)
- `brew install tesseract` (OCR step)
- OpenRouter API key (normalization step)
- Hugging Face token (upload only; download works for public datasets)

### Regenerate locally (maintainers)

```bash
# 1. Stratified sample (requires source catalog CSV)
uv run prepare-data sample

# 2. Fetch articles, OCR images
uv run prepare-data fetch
uv run prepare-data enrich-images
uv run prepare-data ocr-images

# 3. Normalize via OpenRouter
uv run prepare-data normalize

# 4. Inject controlled errors
uv run prepare-data inject-errors

# 5. Publish snapshot to Hugging Face
HF_TOKEN=... uv run prepare-data upload-dataset
```

Use `--force` with `fetch`, `normalize`, or `all` to re-process existing outputs.

The normalization prompt lives in [`prompts/normalize_to_disdoc.md`](prompts/normalize_to_disdoc.md).

### Output layout (after download or local prep)

| Path | Description |
|------|-------------|
| `data/raw_documents/` | Raw markdown exports, `.meta.json`, images |
| `data/normalized_disdocs/` | Canonical 14-section ML design documents |
| `data/flawed_disdocs/` | Docs with injected errors + `injection_log.csv` |

## Architecture

TBD

## License

This project is licensed under the Apache License 2.0.
