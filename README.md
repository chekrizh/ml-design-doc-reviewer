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
- deterministic ranking of the most important remarks;
- structured JSON output for automation;


## Installation

```bash
uv sync
```

## Usage

```bash
export OPENAI_API_KEY=...
uv run critic review design-doc.md
```

## Architecture

The baseline keeps the review loop deliberately small:

1. `critic.cli` reads the design document as text.
2. `ReviewService` calls `critique()` with the document and checklist.
3. `critique()` renders the prompt, asks the LLM for structured JSON, and validates that every checklist item was scored.
4. `rank_notes()` keeps only incomplete items, orders them by checklist importance, and returns the top-N notes.
5. The service returns a `ReviewResult` JSON object and writes optional lifecycle/inference logs.

No RAG, verifier, chat history, JSON document schema, or partial-document snapshots are part of this baseline.

Inference logs include the submitted document text. Treat `logs/inference.jsonl` as sensitive data.

## License

This project is licensed under the Apache License 2.0.
