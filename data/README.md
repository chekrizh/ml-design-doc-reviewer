# Dataset layout

Heavy evaluation artifacts are **not stored in git**. A git clone contains only
lightweight config files and manifests.

**Dataset:** [ml-system-design/ml-design-doc-reviewer-data](https://huggingface.co/datasets/ml-system-design/ml-design-doc-reviewer-data) (revision `v1.0.0`)

The `prepare_data` tool is maintainer-only source code. It is not included in
the runtime wheel, so the commands below are intended to run from a repository
checkout, not from an installed `ml-design-doc-reviewer` package.

## Setup

```bash
uv sync --python 3.12 --group prepare-data
cp .env.prepare-data.example .env.prepare-data
```

Set `HF_TOKEN` in `.env.prepare-data` (create a token at
[https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)).
Downloads require authentication. `OPENAI_API_KEY` can live in
`.env.prepare-data` or fall back to the shared `.env` used by critic. Override
`HF_DATASET_REPO` and `HF_DATASET_REVISION` if needed.

## Download from Hugging Face

```bash
# Download raw / normalized / flawed docs + images.
uv run --group prepare-data python -m prepare_data.cli download-dataset

# Optional: also fetch upstream source catalogs for re-sampling/regeneration.
uv run --group prepare-data python -m prepare_data.cli download-dataset --include-source-catalog
```

## Tracked in git (lightweight)

| Path | Purpose |
|------|---------|
| `sample_manifest.csv` | Stratified 100-case sample |
| `error_topology.csv` | Controlled error taxonomy |
| `dataset_revision.txt` | Pinned Hugging Face dataset revision |
| `../prompts/` | Normalization prompts |

## Downloaded from Hugging Face

| Local path | Remote prefix |
|------------|---------------|
| `disdoc_examples/` | `disdoc_examples/` |
| `raw_documents/` | `raw/` |
| `normalized_disdocs/` | `normalized/` |
| `flawed_disdocs/` | `flawed/` |
| `evidently_ai_cases/` | `source/evidently_ai_cases/` (optional) |
| `byte_byte_go_cases/` | `source/byte_byte_go_cases/` (optional) |

## Regenerate locally

Prerequisites for the full pipeline:

- Python 3.12
- [uv](https://docs.astral.sh/uv/)
- `brew install tesseract` for the OCR step
- OpenAI-compatible API key (`OPENAI_API_KEY` + `OPENAI_BASE_URL`)
- Hugging Face token (`HF_TOKEN`) for download and upload

```bash
# 1. Stratified sample (requires source catalog CSV).
uv run --group prepare-data python -m prepare_data.cli sample

# 2. Fetch articles, download images, and OCR images.
uv run --group prepare-data python -m prepare_data.cli fetch
uv run --group prepare-data python -m prepare_data.cli enrich-images
uv run --group prepare-data python -m prepare_data.cli ocr-images

# 3. Normalize via OpenAI-compatible API.
uv run --group prepare-data python -m prepare_data.cli normalize

# 4. Inject controlled errors.
uv run --group prepare-data python -m prepare_data.cli inject-errors

# 5. Publish snapshot to Hugging Face.
uv run --group prepare-data python -m prepare_data.cli upload-dataset
```

Use `--force` with `fetch`, `normalize`, or `all` to re-process existing outputs.
The normalization prompt lives in
[`../prompts/normalize_to_disdoc.md`](../prompts/normalize_to_disdoc.md).
