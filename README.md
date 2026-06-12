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

The `src/prepare_data` package builds the first evaluation dataset from the [Evidently AI ML/LLM use cases catalog](data/evidently_ai_cases/800%20ML%20and%20LLM%20use%20cases.csv).

### Prerequisites

- Python 3.12
- [uv](https://docs.astral.sh/uv/) package manager
- `ffmpeg` optional (yt-dlp downloads native audio; ffmpeg only needed for format conversion)
- OpenRouter API key (for the normalization step)

### Setup

```bash
uv sync --python 3.12
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY
```

### Pipeline

```bash
# 1. Stratified sample of 100 cases (Industry × Technology × content type × year)
uv run prepare-data sample

# 2. Download articles / transcribe videos (Whisper) → data/raw_documents/
uv run prepare-data fetch

# 3. Normalize raw docs into canonical design docs via OpenRouter → data/normalized_disdocs/
uv run prepare-data normalize

# 4. Inject controlled errors into normalized docs → data/flawed_disdocs/
uv run prepare-data inject-errors

# Or run all steps sequentially
uv run prepare-data all
```

Use `--force` with `fetch`, `normalize`, or `all` to re-process existing outputs.

The normalization prompt lives in [`prompts/normalize_to_disdoc.md`](prompts/normalize_to_disdoc.md). Reference design docs are in [`data/disdoc_examples/`](data/disdoc_examples/).

### Output layout

| Path | Description |
|------|-------------|
| `data/sample_manifest.csv` | Stratified sample with metadata |
| `data/raw_documents/` | Raw markdown exports and `.meta.json` sidecars |
| `data/normalized_disdocs/` | Canonical 14-section ML design documents |
| `data/error_topology.csv` | Catalog of sectional and cross-sectional error types |
| `data/flawed_disdocs/` | Normalized docs with injected errors + `injection_log.csv` |

## Architecture

TBD

## License

This project is licensed under the Apache License 2.0.
