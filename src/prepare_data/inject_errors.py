"""Controlled error injection into normalized ML design documents."""

from __future__ import annotations

import logging
import random
import re
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

SECTION_HEADING = re.compile(r"^### (\d+)\.\s+(.+)$", re.MULTILINE)
SECTION_NAMES = {
    1: "Problem definition",
    2: "Goals and anti-goals",
    3: "Risks and constraints",
    4: "Metrics and loss functions",
    5: "Data (Dataset)",
    6: "Validation schema",
    7: "Baseline solution",
    8: "Errors and their analysis",
    9: "Training pipelines",
    10: "Features",
    11: "Measuring results",
    12: "Integration and Serving",
    13: "Monitoring",
    14: "Operations",
}


@dataclass
class Section:
    number: int
    title: str
    body: str
    start: int
    end: int


@dataclass
class InjectionRecord:
    document_id: str
    error_id: str
    scope: str
    category: str
    error_name: str
    primary_section: int
    primary_section_name: str
    secondary_section: int | None
    secondary_section_name: str | None
    injection_location: str
    injection_detail: str


def parse_sections(text: str) -> list[Section]:
    matches = list(SECTION_HEADING.finditer(text))
    if not matches:
        return []

    sections: list[Section] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        number = int(match.group(1))
        sections.append(
            Section(
                number=number,
                title=match.group(2).strip(),
                body=text[start:end],
                start=start,
                end=end,
            )
        )
    return sections


def rebuild_document(text: str, sections: list[Section]) -> str:
    if not sections:
        return text
    prefix = text[: sections[0].start]
    suffix = text[sections[-1].end :]
    return prefix + "".join(section.body for section in sections) + suffix


def _section_map(sections: list[Section]) -> dict[int, Section]:
    return {section.number: section for section in sections}


def _replace_section_body(section: Section, new_body: str) -> Section:
    heading_end = section.body.find("\n")
    heading = section.body if heading_end == -1 else section.body[:heading_end]
    return Section(
        number=section.number,
        title=section.title,
        body=f"{heading}\n\n{new_body.strip()}\n",
        start=section.start,
        end=section.end,
    )


def _section_has_content(section: Section) -> bool:
    body = re.sub(r"^###.*$", "", section.body, count=1, flags=re.MULTILINE).strip()
    return bool(body) and body != "[NO INFO]"


def _inject_strip_metric_definitions(section: Section) -> tuple[Section, str, str]:
    body = section.body
    body = re.sub(
        r"\*\*[^*]+\*\*:\s*[^\n]+",
        "**Metric**: Tracked qualitatively during reviews",
        body,
        count=3,
    )
    addition = (
        "\n- **Evaluation approach**: Success is assessed informally by stakeholder feedback "
        "rather than predefined numeric thresholds.\n"
    )
    if addition.strip() not in body:
        body = body.rstrip() + addition
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Metrics and loss functions",
        "Removed explicit metric definitions and added informal qualitative evaluation language.",
    )


def _inject_remove_baseline_detail(section: Section) -> tuple[Section, str, str]:
    new_body = (
        "We skip a formal baseline because the production approach already works well enough. "
        "Any future baseline can be added later if needed."
    )
    return (
        _replace_section_body(section, new_body),
        "Baseline solution",
        "Replaced baseline description with a dismissal of baseline comparison.",
    )


def _inject_introduce_temporal_leakage(section: Section) -> tuple[Section, str, str]:
    new_body = (
        "**Split strategy**\n"
        "- Random 80/20 train/test split across all historical records.\n"
        "- Hyperparameter tuning reuses the same test set for model selection.\n"
        "- No holdout gap is required because shuffling removes temporal ordering effects."
    )
    return (
        _replace_section_body(section, new_body),
        "Validation schema",
        "Inserted random split and test-set reuse that causes temporal leakage.",
    )


def _inject_vague_validation_protocol(section: Section) -> tuple[Section, str, str]:
    new_body = (
        "We validate on a representative sample when convenient. "
        "Exact split sizes and refresh cadence are still being decided."
    )
    return (
        _replace_section_body(section, new_body),
        "Validation schema",
        "Replaced concrete validation protocol with unspecified sampling language.",
    )


def _inject_remove_anti_goals(section: Section) -> tuple[Section, str, str]:
    body = section.body
    body = re.sub(
        r"\*\*ii\. Anti-goals\*\*.*?(?=\n---|\n\*\*|\Z)",
        "**ii. Anti-goals**\n- [NO INFO]\n",
        body,
        count=1,
        flags=re.DOTALL,
    )
    body = re.sub(r"(?i)anti-?goals?.*", "", body)
    if "anti-goal" not in body.lower():
        body = body.rstrip() + "\n\n**Anti-goals**: Not applicable for this project.\n"
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Goals and anti-goals",
        "Removed anti-goals content and replaced it with a dismissive placeholder.",
    )


def _inject_add_unrealistic_sla(section: Section) -> tuple[Section, str, str]:
    addition = (
        "\n- **SLA**: p99 end-to-end latency must stay below 5 ms for all model requests, "
        "including LLM generation and retrieval.\n"
        "- **Availability**: 100% uptime is expected during business hours.\n"
    )
    body = section.body.rstrip() + addition
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Integration and Serving",
        "Added unrealistic latency and availability SLA claims.",
    )


def _inject_strip_monitoring_detail(section: Section) -> tuple[Section, str, str]:
    new_body = (
        "- Application logs are collected centrally.\n"
        "- The team reviews dashboards occasionally.\n"
        "- No dedicated model-quality or drift alerts are planned initially."
    )
    return (
        _replace_section_body(section, new_body),
        "Monitoring",
        "Removed concrete monitoring signals and left only generic logging.",
    )


def _inject_shallow_error_analysis(section: Section) -> tuple[Section, str, str]:
    new_body = "Errors are handled case by case when users report issues."
    return (
        _replace_section_body(section, new_body),
        "Errors and their analysis",
        "Replaced structured error taxonomy with a generic one-line statement.",
    )


def _inject_internal_data_contradiction(section: Section) -> tuple[Section, str, str]:
    addition = (
        "\n- **Label freshness**: All labels are generated offline once per year, "
        "while online features are refreshed every minute.\n"
    )
    body = section.body.rstrip() + addition
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Data (Dataset)",
        "Added contradictory label freshness and feature refresh cadence in the same section.",
    )


def _inject_vague_operations(section: Section) -> tuple[Section, str, str]:
    new_body = (
        "- **Ownership**: TBD.\n"
        "- **Retraining cadence**: Ad hoc.\n"
        "- **Incident response**: Escalate via email when someone notices an issue."
    )
    return (
        _replace_section_body(section, new_body),
        "Operations",
        "Replaced operational procedures with vague ownership and ad hoc maintenance.",
    )


def _inject_wrong_loss_function(section: Section) -> tuple[Section, str, str]:
    addition = (
        "\n- **Primary loss**: Mean squared error is used as the main optimization objective "
        "for all ranking and classification tasks.\n"
    )
    body = section.body.rstrip() + addition
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Metrics and loss functions",
        "Added MSE as the primary loss for ranking/classification-style problems.",
    )


def _inject_orphan_feature(section: Section) -> tuple[Section, str, str]:
    addition = (
        "\n- **Competitor price delta (7d)**: Real-time competitor pricing scraped hourly "
        "from external marketplaces.\n"
    )
    body = section.body.rstrip() + addition
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Features",
        "Added a feature that depends on external competitor pricing data.",
    )


def _inject_strip_problem_quantification(section: Section) -> tuple[Section, str, str]:
    body = section.body
    body = re.sub(r"\d[\d,.%]*", "several", body)
    body = re.sub(
        r"(?i)(business impact|usage volumes|qps|users|requests per).*",
        "Scale details are not documented yet.",
        body,
        count=2,
    )
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Problem definition",
        "Removed quantitative scale and impact details from the problem statement.",
    )


def _inject_remove_experiment_tracking(section: Section) -> tuple[Section, str, str]:
    body = section.body
    body = re.sub(r"(?i)(mlflow|wandb|experiment tracking|reproducibility).*", "", body)
    addition = "\n- Experiment artifacts are stored locally on engineer laptops.\n"
    body = body.rstrip() + addition
    return (
        _replace_section_body(section, re.sub(r"^###.*$", "", body, count=1, flags=re.MULTILINE)),
        "Training pipelines",
        "Removed experiment tracking references and added local-only artifact storage.",
    )


def _inject_vague_measurement_plan(section: Section) -> tuple[Section, str, str]:
    new_body = (
        "We plan to compare models informally after launch. "
        "Formal A/B testing and reporting templates are deferred."
    )
    return (
        _replace_section_body(section, new_body),
        "Measuring results",
        "Replaced measurement protocol with informal post-launch comparison language.",
    )


def _inject_goals_metrics_mismatch(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    goals = sections[2]
    metrics = sections[4]
    goals_body = goals.body.rstrip() + (
        "\n- **Primary goal**: Minimize infrastructure cost while keeping model size small.\n"
    )
    metrics_body = metrics.body.rstrip() + (
        "\n- **Primary metric**: Maximize click-through rate at the expense of latency and cost.\n"
    )
    sections[2] = _replace_section_body(
        goals, re.sub(r"^###.*$", "", goals_body, count=1, flags=re.MULTILINE)
    )
    sections[4] = _replace_section_body(
        metrics, re.sub(r"^###.*$", "", metrics_body, count=1, flags=re.MULTILINE)
    )
    return (
        sections,
        "Goals and anti-goals + Metrics and loss functions",
        "Added cost-minimization goals while optimizing for CTR regardless of cost.",
    )


def _inject_dataset_validation_mismatch(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    data = sections[5]
    validation = sections[6]
    data_body = data.body.rstrip() + (
        "\n- **Update cadence**: New labeled data arrives daily with same-day availability.\n"
    )
    validation_body = (
        "Validation uses a static holdout set built once during initial model development "
        "and never refreshed."
    )
    sections[5] = _replace_section_body(
        data, re.sub(r"^###.*$", "", data_body, count=1, flags=re.MULTILINE)
    )
    sections[6] = _replace_section_body(validation, validation_body)
    return (
        sections,
        "Data (Dataset) + Validation schema",
        "Dataset claims daily refresh while validation uses a never-refreshed static holdout.",
    )


def _inject_training_serving_mismatch(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    training = sections[9]
    serving = sections[12]
    training_body = training.body.rstrip() + (
        "\n- **Training runtime**: Distributed Spark jobs on a Kubernetes GPU cluster.\n"
    )
    serving_body = serving.body.rstrip() + (
        "\n- **Serving runtime**: Single-process Python script executed manually on a laptop.\n"
    )
    sections[9] = _replace_section_body(
        training, re.sub(r"^###.*$", "", training_body, count=1, flags=re.MULTILINE)
    )
    sections[12] = _replace_section_body(
        serving, re.sub(r"^###.*$", "", serving_body, count=1, flags=re.MULTILINE)
    )
    return (
        sections,
        "Training pipelines + Integration and Serving",
        "Training uses distributed GPU Spark while serving is a manual laptop script.",
    )


def _inject_metrics_monitoring_mismatch(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    metrics = sections[4]
    monitoring = sections[13]
    metrics_body = metrics.body.rstrip() + (
        "\n- **Primary offline metric**: Recall@10 for retrieval quality.\n"
    )
    monitoring_body = (
        "Production monitoring tracks CPU utilization and average response size only. "
        "Recall@10 is not monitored online."
    )
    sections[4] = _replace_section_body(
        metrics, re.sub(r"^###.*$", "", metrics_body, count=1, flags=re.MULTILINE)
    )
    sections[13] = _replace_section_body(monitoring, monitoring_body)
    return (
        sections,
        "Metrics and loss functions + Monitoring",
        "Offline metric optimizes Recall@10 but monitoring omits retrieval quality.",
    )


def _inject_latency_serving_mismatch(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    problem = sections[1]
    serving = sections[12]
    problem_body = problem.body.rstrip() + (
        "\n- **Latency expectation**: Sub-100 ms responses are required for interactive user flows.\n"
    )
    serving_body = serving.body.rstrip() + (
        "\n- **Serving mode**: Batch inference runs once per day and results are emailed to users.\n"
    )
    sections[1] = _replace_section_body(
        problem, re.sub(r"^###.*$", "", problem_body, count=1, flags=re.MULTILINE)
    )
    sections[12] = _replace_section_body(
        serving, re.sub(r"^###.*$", "", serving_body, count=1, flags=re.MULTILINE)
    )
    return (
        sections,
        "Problem definition + Integration and Serving",
        "Problem requires interactive latency but serving is daily batch email delivery.",
    )


def _inject_feature_data_mismatch(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    features = sections[10]
    data = sections[5]
    features_body = features.body.rstrip() + (
        "\n- **Weather forecast embeddings**: 72-hour forecast vectors from a paid meteorological API.\n"
    )
    data_body = data.body.rstrip() + (
        "\n- **External data policy**: Only internal transactional logs are approved for this project.\n"
    )
    sections[10] = _replace_section_body(
        features, re.sub(r"^###.*$", "", features_body, count=1, flags=re.MULTILINE)
    )
    sections[5] = _replace_section_body(
        data, re.sub(r"^###.*$", "", data_body, count=1, flags=re.MULTILINE)
    )
    return (
        sections,
        "Features + Data (Dataset)",
        "Features require paid weather API data while dataset policy allows internal logs only.",
    )


def _inject_risk_without_mitigation(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    risks = sections[3]
    monitoring = sections[13]
    risks_body = risks.body.rstrip() + (
        "\n- **Vendor outage risk**: Core LLM provider downtime would halt all generation paths.\n"
    )
    monitoring_body = (
        "Monitoring covers request volume and error logs. "
        "Vendor failover and provider health checks are out of scope."
    )
    sections[3] = _replace_section_body(
        risks, re.sub(r"^###.*$", "", risks_body, count=1, flags=re.MULTILINE)
    )
    sections[13] = _replace_section_body(monitoring, monitoring_body)
    return (
        sections,
        "Risks and constraints + Monitoring",
        "Added vendor outage risk without monitoring or mitigation coverage.",
    )


def _inject_baseline_results_contradiction(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    baseline = sections[7]
    measuring = sections[11]
    baseline_body = (
        "The constant baseline already exceeds current production quality on all key metrics, "
        "so further model iterations are unlikely to help."
    )
    measuring_body = measuring.body.rstrip() + (
        "\n- **Production uplift**: The deployed model improved recall by 18% over the previous system.\n"
    )
    sections[7] = _replace_section_body(baseline, baseline_body)
    sections[11] = _replace_section_body(
        measuring, re.sub(r"^###.*$", "", measuring_body, count=1, flags=re.MULTILINE)
    )
    return (
        sections,
        "Baseline solution + Measuring results",
        "Baseline is claimed stronger than production while measuring reports production uplift.",
    )


def _inject_anti_goal_feature_conflict(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    goals = sections[2]
    features = sections[10]
    goals_body = goals.body.rstrip() + (
        "\n- **Anti-goal**: Do not build user-specific personalization or per-user feature stores.\n"
    )
    features_body = features.body.rstrip() + (
        "\n- **Per-user behavioral embeddings**: Updated hourly for each active user.\n"
    )
    sections[2] = _replace_section_body(
        goals, re.sub(r"^###.*$", "", goals_body, count=1, flags=re.MULTILINE)
    )
    sections[10] = _replace_section_body(
        features, re.sub(r"^###.*$", "", features_body, count=1, flags=re.MULTILINE)
    )
    return (
        sections,
        "Goals and anti-goals + Features",
        "Anti-goals forbid personalization while features add per-user behavioral embeddings.",
    )


def _inject_time_series_random_split(
    sections: dict[int, Section],
) -> tuple[dict[int, Section], str, str]:
    data = sections[5]
    validation = sections[6]
    data_body = data.body.rstrip() + (
        "\n- **Temporal nature**: Labels are daily time-series observations with strong seasonality.\n"
    )
    validation_body = (
        "Train and test examples are sampled randomly across all dates. "
        "Future rows may appear in training while older rows are used for testing."
    )
    sections[5] = _replace_section_body(
        data, re.sub(r"^###.*$", "", data_body, count=1, flags=re.MULTILINE)
    )
    sections[6] = _replace_section_body(validation, validation_body)
    return (
        sections,
        "Data (Dataset) + Validation schema",
        "Time-series dataset validated with a random split that ignores temporal ordering.",
    )


SECTIONAL_INJECTORS = {
    "strip_metric_definitions": _inject_strip_metric_definitions,
    "remove_baseline_detail": _inject_remove_baseline_detail,
    "introduce_temporal_leakage": _inject_introduce_temporal_leakage,
    "vague_validation_protocol": _inject_vague_validation_protocol,
    "remove_anti_goals": _inject_remove_anti_goals,
    "add_unrealistic_sla": _inject_add_unrealistic_sla,
    "strip_monitoring_detail": _inject_strip_monitoring_detail,
    "shallow_error_analysis": _inject_shallow_error_analysis,
    "introduce_internal_data_contradiction": _inject_internal_data_contradiction,
    "vague_operations": _inject_vague_operations,
    "wrong_loss_function": _inject_wrong_loss_function,
    "orphan_feature": _inject_orphan_feature,
    "strip_problem_quantification": _inject_strip_problem_quantification,
    "remove_experiment_tracking": _inject_remove_experiment_tracking,
    "vague_measurement_plan": _inject_vague_measurement_plan,
}

CROSS_SECTIONAL_INJECTORS = {
    "goals_metrics_mismatch": _inject_goals_metrics_mismatch,
    "dataset_validation_mismatch": _inject_dataset_validation_mismatch,
    "training_serving_mismatch": _inject_training_serving_mismatch,
    "metrics_monitoring_mismatch": _inject_metrics_monitoring_mismatch,
    "latency_serving_mismatch": _inject_latency_serving_mismatch,
    "feature_data_mismatch": _inject_feature_data_mismatch,
    "risk_without_mitigation": _inject_risk_without_mitigation,
    "baseline_results_contradiction": _inject_baseline_results_contradiction,
    "anti_goal_feature_conflict": _inject_anti_goal_feature_conflict,
    "time_series_random_split": _inject_time_series_random_split,
}


def load_error_topology(path: Path) -> pd.DataFrame:
    topology = pd.read_csv(path)
    required = {
        "error_id",
        "scope",
        "category",
        "name",
        "description",
        "primary_section",
        "injection_method",
    }
    missing = required - set(topology.columns)
    if missing:
        raise ValueError(f"Missing columns in error topology: {sorted(missing)}")
    return topology


def _is_applicable(error_row: pd.Series, section_numbers: set[int]) -> bool:
    primary = int(error_row["primary_section"])
    if primary not in section_numbers:
        return False
    if error_row["scope"] == "cross_sectional":
        secondary = error_row.get("secondary_section")
        if pd.isna(secondary):
            return False
        return int(secondary) in section_numbers
    return True


def apply_error(text: str, error_row: pd.Series) -> tuple[str, str, str]:
    sections = parse_sections(text)
    if not sections:
        raise ValueError("Document has no recognizable numbered sections")

    section_lookup = _section_map(sections)
    method = error_row["injection_method"]
    scope = error_row["scope"]

    if scope == "sectional":
        primary = int(error_row["primary_section"])
        injector = SECTIONAL_INJECTORS[method]
        updated_section, location, detail = injector(section_lookup[primary])
        section_lookup[primary] = updated_section
    else:
        injector = CROSS_SECTIONAL_INJECTORS[method]
        section_lookup, location, detail = injector(section_lookup)

    updated_sections = [
        section_lookup.get(section.number, section)
        for section in sorted(section_lookup.values(), key=lambda item: item.number)
    ]
    return rebuild_document(text, updated_sections), location, detail


def inject_document(
    document_id: str,
    text: str,
    topology: pd.DataFrame,
    rng: random.Random,
    *,
    min_errors: int = 0,
    max_errors: int = 10,
) -> tuple[str, list[InjectionRecord]]:
    section_numbers = {section.number for section in parse_sections(text)}
    applicable = topology[
        topology.apply(lambda row: _is_applicable(row, section_numbers), axis=1)
    ]
    if applicable.empty:
        return text, []

    error_count = rng.randint(min_errors, max_errors)
    if error_count == 0:
        return text, []

    chosen = applicable.sample(
        n=min(error_count, len(applicable)),
        random_state=rng.randint(0, 2**31 - 1),
    )

    records: list[InjectionRecord] = []
    current_text = text
    for _, error_row in chosen.iterrows():
        current_text, location, detail = apply_error(current_text, error_row)
        secondary = error_row.get("secondary_section")
        records.append(
            InjectionRecord(
                document_id=document_id,
                error_id=error_row["error_id"],
                scope=error_row["scope"],
                category=error_row["category"],
                error_name=error_row["name"],
                primary_section=int(error_row["primary_section"]),
                primary_section_name=SECTION_NAMES.get(
                    int(error_row["primary_section"]),
                    str(error_row["primary_section"]),
                ),
                secondary_section=int(secondary) if pd.notna(secondary) else None,
                secondary_section_name=(
                    SECTION_NAMES.get(int(secondary), str(int(secondary)))
                    if pd.notna(secondary)
                    else None
                ),
                injection_location=location,
                injection_detail=detail,
            )
        )
    return current_text, records


def inject_directory(
    input_dir: Path,
    output_dir: Path,
    topology_path: Path,
    log_path: Path,
    *,
    random_seed: int = 42,
    min_errors: int = 0,
    max_errors: int = 10,
) -> pd.DataFrame:
    topology = load_error_topology(topology_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    source_docs = sorted(input_dir.glob("*_disdoc.md"))
    if not source_docs:
        raise FileNotFoundError(f"No normalized design docs found in {input_dir}")

    all_records: list[InjectionRecord] = []
    for source_path in source_docs:
        document_id = source_path.stem.replace("_disdoc", "")
        rng = random.Random(f"{random_seed}:{document_id}")
        text = source_path.read_text(encoding="utf-8")
        flawed_text, records = inject_document(
            document_id,
            text,
            topology,
            rng,
            min_errors=min_errors,
            max_errors=max_errors,
        )
        output_path = output_dir / source_path.name
        output_path.write_text(flawed_text, encoding="utf-8")
        all_records.extend(records)
        logger.info("Injected %d errors into %s", len(records), document_id)

    log_df = pd.DataFrame([record.__dict__ for record in all_records])
    if not log_df.empty and "secondary_section" in log_df.columns:
        log_df["secondary_section"] = (
            log_df["secondary_section"].astype("Int64").astype(str).replace("<NA>", "")
        )
    log_df.to_csv(log_path, index=False)
    logger.info(
        "Wrote %d flawed documents and %d injection records to %s",
        len(source_docs),
        len(all_records),
        output_dir,
    )
    return log_df
