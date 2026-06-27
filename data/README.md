# Dataset layout

Heavy evaluation artifacts are **not stored in git**. Download them from Hugging Face:

**Dataset:** [ml-system-design/ml-design-doc-reviewer-data](https://huggingface.co/datasets/ml-system-design/ml-design-doc-reviewer-data) (revision `v1.0.0`)

```bash
uv sync --group prepare-data
uv run --group prepare-data python -m prepare_data.cli download-dataset
```

## Tracked in git (lightweight)

| Path | Purpose |
|------|---------|
| `sample_manifest.csv` | Stratified 100-case sample |
| `error_topology.csv` | Controlled error taxonomy |
| `dataset_revision.txt` | Pinned Hugging Face dataset revision |

## Downloaded from Hugging Face

| Local path | Remote prefix |
|------------|---------------|
| `disdoc_examples/` | `disdoc_examples/` |
| `raw_documents/` | `raw/` |
| `normalized_disdocs/` | `normalized/` |
| `flawed_disdocs/` | `flawed/` |
| `evidently_ai_cases/` | `source/evidently_ai_cases/` (optional) |
| `byte_byte_go_cases/` | `source/byte_byte_go_cases/` |

Set `HF_DATASET_REPO` and `HF_DATASET_REVISION` in `.env` to override defaults.
