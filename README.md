<div align="center">

# ML Design Doc Reviewer

**AI reviewer and linter for ML system design docs: finds architectural gaps, inconsistencies, and missing reasoning without giving away the solution.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](#license)
[![Project Status](https://img.shields.io/badge/status-early%20design-orange.svg)](#quick-start)
[![Contributions](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## Overview

ML Design Doc Reviewer is an open-source agent for reviewing ML system design documents. It helps engineers practice ML system design by surfacing architectural gaps, cross-section inconsistencies, weak trade-offs, unsupported assumptions, and missing reasoning — returning focused critique and guiding questions instead of a finished design.

ML system design improves through repeated feedback cycles. Human review is valuable but slow and hard to scale; generic LLM feedback is fast but often vague or too willing to solve the task for the author. 

This project aims for the middle ground: 
- fast feedback on ML design documents;
- structured findings tied to the submitted document;
- focus on architecture and methodology;
- grounded in real production ML systems;
- measurable review quality through offline evaluation.

The project is currently in early design. The first implementation focuses on a simple review loop over design documents, with evaluation and grounding capabilities added incrementally.

## Quick Start

```bash
uv sync
cp .env.example .env
# in .env, set OPENAI_API_KEY=your-key-here

uv run critic review path/to/design-doc.md
```

Input is a plain text or Markdown ML design document.

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

## Architecture

The baseline keeps the review loop deliberately small:

1. `critic.cli` reads the design document as text.
2. `ReviewService` calls `critique()` with the document and checklist.
3. `critique()` renders the prompt, asks the LLM for structured JSON, and validates that every checklist item was scored.
4. `rank_notes()` keeps only incomplete items, orders them by checklist importance, and returns the top-N notes.
5. The service returns a `ReviewResult` JSON object and writes optional lifecycle/inference logs.

No RAG, verifier, chat history, JSON document schema, or partial-document snapshots are part of this baseline.

The offline evaluation loop (see [Offline Evaluation](#offline-evaluation)) is separate from, and not part of, the online review path above.

## Offline Evaluation

```bash
uv run critic assess logs/inference.jsonl --output logs/assessment-eval.jsonl
uv run critic metrics logs/assessment-eval.jsonl --inference-log logs/inference.jsonl
```

`critic assess` runs an Assessor agent (LLM-as-a-Judge) that scores each critic output against a checklist. `critic metrics` aggregates those scores into the Weighted Checklist Score, direct-answer/false-critique/grounded-claim rates, and Cohen's Kappa against golden data.

## Dataset Preparation

The `src/prepare_data` source tree is a maintainer-only tool for building the evaluation dataset. It is not included in the runtime wheel, and its heavier dependencies are installed only with the `prepare-data` dependency group.

Ordinary critic users do not need to install or run it. Maintainer instructions for downloading or regenerating evaluation artifacts live in [`data/README.md`](data/README.md).

## Status & Roadmap

This repository is an early baseline implementation. Current scope:

- text or Markdown document input;
- one LLM call that scores the full critic checklist and writes remarks;
- prompt-level input relevance guardrail;
- document-grounded, pedagogical critique without ready-made solutions;
- deterministic ranking of the most important remarks;
- structured JSON output for automation;
- offline evaluation harness (see [Offline Evaluation](#offline-evaluation)).

Planned next:

- Dockerized FastAPI service and a simple web UI for submitting documents;
- structured JSON and image input, in addition to plain text and Markdown;
- human-readable Markdown report;
- golden and synthetic dataset workflow for repeatable critic evaluation;
- experiment observability for prompt, checklist, model, latency, and cost tracking.

## License

This project is licensed under the Apache License 2.0.
