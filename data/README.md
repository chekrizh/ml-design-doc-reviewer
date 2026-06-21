# Dataset layout

Heavy evaluation artifacts are **not stored in git**. Download them from Hugging Face:

```bash
uv run prepare-data download-dataset
```

## Tracked in git (lightweight)

| Path | Purpose |
|------|---------|
| `sample_manifest.csv` | Stratified 100-case sample |
| `error_topology.csv` | Controlled error taxonomy |
| `dataset_revision.txt` | Pinned Hugging Face dataset revision |
| `disdoc_examples/` | Few-shot reference design docs |

## Downloaded from Hugging Face

| Local path | Remote prefix |
|------------|---------------|
| `raw_documents/` | `raw/` |
| `normalized_disdocs/` | `normalized/` |
| `flawed_disdocs/` | `flawed/` |
| `evidently_ai_cases/` | `source/evidently_ai_cases/` (optional) |

Set `HF_DATASET_REPO` and `HF_DATASET_REVISION` in `.env` to override defaults.
