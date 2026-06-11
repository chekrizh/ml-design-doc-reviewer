# Image understanding options for ML design doc dataset

This document compares approaches for extracting information from images embedded in engineering blog posts (architecture diagrams, metrics charts, tables-as-screenshots, pipeline flowcharts).

**Scope today:** images are downloaded and referenced in raw documents with special tokens. `[IMAGE_DESCRIPTION: PENDING_OCR]` is a placeholder until an OCR/VLM step is chosen.

---

## Task requirements

| Requirement | Weight |
|-------------|--------|
| Architecture diagrams (boxes, arrows, component names) | Critical |
| Charts and metric plots (axis labels, legend, numbers) | High |
| Tables rendered as images | High |
| Decorative photos / logos | Low (should skip) |
| Batch cost for ~50–100 articles, ~5–15 images each | High |
| Reproducibility / offline runs | Medium |
| Latency for interactive re-runs | Low |

---

## Option 1: Tesseract OCR

**What it is:** Classic open-source OCR engine (`pytesseract` wrapper).

| Pros | Cons |
|------|------|
| Free, runs fully offline | Weak on diagrams and non-horizontal text |
| Fast on CPU for plain text screenshots | Poor layout understanding (no “this is a flowchart”) |
| Mature, easy to dockerize | Needs preprocessing (deskew, binarize) for charts |
| Good for simple alt-text-like strings | SVG/raster diagrams with icons often fail |

**Fit for this project:** Useful as a cheap baseline for text-heavy screenshots only. **Not sufficient alone** for ML system design diagrams where spatial relationships matter.

---

## Option 2: EasyOCR

**What it is:** Deep-learning OCR (CRAFT detector + CRNN recognizer), 80+ languages.

| Pros | Cons |
|------|------|
| Better than Tesseract on varied fonts and angles | Still OCR-only: no semantic “architecture” understanding |
| Offline after model download | Heavier than Tesseract (~1–2 GB models) |
| Reasonable on chart axis labels | Struggles with dense diagrams, small labels, color-on-color |
| Python-native API | Slower on CPU; GPU helps |

**Fit:** Better text extraction from charts than Tesseract, but still **does not explain** what a diagram means. Best as a **secondary text harvester** paired with a VLM.

---

## Option 3: DeepSeek OCR (and similar doc-OCR APIs)

**What it is:** Document-oriented OCR models (e.g. DeepSeek-OCR, PaddleOCR, DocTR) tuned for structured documents.

| Pros | Cons |
|------|------|
| Strong on tables and document layout | API/hosting may be paid or self-host GPU |
| Can output reading order and blocks | Still limited semantic reasoning |
| Good for “table as image” in blog posts | Less proven on hand-drawn architecture sketches |
| May beat generic OCR on markdown-like output | Vendor lock-in if API-only |

**Fit:** Strong for **table/chart text recovery**. For architecture diagrams, layout parsing helps but **semantic description** still needs a VLM or LLM pass on OCR output.

---

## Option 4: Vision-Language Models (VLMs)

**Examples:** GPT-4o / Gemini 2.5 Pro (vision), Claude 3.5/4 Sonnet (vision), Qwen2-VL, LLaVA, InternVL, Pixtral.

| Pros | Cons |
|------|------|
| Understands diagrams holistically (components, flows) | API cost per image |
| Can summarize “User → API Gateway → Lambda → Model” | Non-deterministic; needs prompt + validation |
| Handles charts + legends in one pass | Local open models need GPU VRAM |
| Natural fit for `[IMAGE_DESCRIPTION: ...]` tokens | May hallucinate labels not visible |

**Fit:** **Best match** for turning blog diagrams into design-doc facts. Aligns with existing OpenRouter stack.

---

## Option 5: Hybrid pipeline (recommended architecture)

```
HTML → download image
     → filter (size, URL heuristics)     [implemented]
     → optional: light OCR (EasyOCR) for numeric text
     → VLM caption + structured extract   [next step]
     → wrap in [IMAGE_DESCRIPTION: ...]
     → normalize_to_disdoc uses descriptions
```

| Stage | Tool | Role |
|-------|------|------|
| Download + filter | Custom (`images.py`) | Artifacts on disk |
| Fast text pass | EasyOCR or Tesseract | Supplement VLM with exact numbers/strings |
| Semantic extract | Gemini 2.5 Flash/Pro or GPT-4o-mini vision | Diagram summary + bullet facts |
| Quality gate | Same VLM or second pass | Reject `PENDING_OCR` / empty / “decorative image” |

---

## Cost and ops (rough, 100 articles × 8 images)

| Approach | Est. cost | Offline | Diagram quality |
|----------|-----------|---------|-----------------|
| Tesseract only | $0 | Yes | Poor |
| EasyOCR only | $0 | Yes | Poor–fair (text only) |
| DeepSeek OCR API | $ low–medium | Depends | Fair–good (text/layout) |
| VLM via OpenRouter (Flash-class) | ~$2–15 | No | **Good–excellent** |
| VLM (Pro-class) | ~$15–50 | No | Excellent |
| Hybrid OCR + Flash VLM | ~$3–20 | Partial | **Best balance** |

---

## Verdict

**Primary recommendation: Vision-Language Model via OpenRouter** (e.g. `google/gemini-2.5-flash` for bulk, `google/gemini-2.5-pro` for hard diagrams), with a **structured prompt** that asks for:

1. Image type (architecture / chart / table / screenshot / decorative)
2. Verbatim text visible in the image
3. Bullet list of technical facts for the design doc
4. Confidence flag if illegible

**Secondary (optional): EasyOCR** offline pass to cross-check numbers and axis labels before or after VLM — not Tesseract unless zero GPU and minimal dependencies matter.

**Not recommended as sole solution:** Tesseract or any OCR-only stack for this dataset, because the value is in **system architecture and metrics context**, not raw character recognition.

**DeepSeek OCR:** Worth a benchmark on 10–20 sample images if you want offline table extraction; otherwise OpenRouter VLM is simpler and stronger for diagrams.

---

## Special tokens (implemented in raw docs)

```
[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_000/img_001.png]
[IMAGE_ALT: Hermes V2 architecture]
[IMAGE_SOURCE_URL: https://...]
[IMAGE_DESCRIPTION: PENDING_OCR]
```

After enrichment, replace `PENDING_OCR` with VLM/OCR output. Normalization prompt already instructs the model how to use these blocks.
