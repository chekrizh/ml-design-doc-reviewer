# Contributing

Thank you for your interest in contributing to ML Design Doc Reviewer.

This project is in early design. The first version is being built by the core team, and the contribution process will evolve as the repository gets its initial implementation, evaluation suite, examples, and release workflow.

## Ways to Contribute

The easiest way to contribute is to share ideas, open issues, suggest feature requests, or pick up existing issues when they are available.

Useful contributions may include:

- reporting unclear or incorrect reviewer behavior;
- proposing feature requests and product improvements;
- improving documentation and examples;
- sharing useful references for ML system design review, evaluation, or tutoring;
- adding realistic ML system design documents for examples or evaluation;
- adding evaluation cases for reviewer quality;
- improving prompts, review policies, and output schemas;
- contributing fixes or enhancements through pull requests.

## Before You Start

Before opening a larger pull request, please consider opening an issue or discussion first.

Good topics for early discussion:

- finding schema changes;
- reviewer behavior changes;
- evaluation metrics;
- model/provider choices;
- new document templates;
- changes that affect public APIs or GitHub Action inputs.

## Development Setup

TBD

```bash
# Placeholder
git clone https://github.com/chekrizh/ml-design-doc-reviewer.git
cd ml-design-doc-reviewer
```

## Project Structure

TBD

Expected areas:

- `src/` - application code;
- `examples/` - sample design documents and review outputs;
- `evals/` - golden examples and evaluation configuration;
- `.github/` - GitHub Action and CI workflows;
- `docs/` - additional project documentation.

## Running Tests

TBD

```bash
# Placeholder
make test
```

## Running Evaluations

TBD

```bash
# Placeholder
make eval
```

## Pull Request Guidelines

Please keep pull requests focused and easy to review.

Before opening a PR:

- describe what changed and why;
- include tests or evaluation cases when behavior changes;
- update documentation when public behavior changes;
- avoid unrelated refactors;
- call out known limitations or follow-up work.

## Reviewer Behavior Changes

Changes to reviewer behavior should be treated carefully.

Please include:

- examples of documents affected by the change;
- before/after review output when possible;
- expected impact on false critiques;
- expected impact on direct-answer leakage;
- any new evaluation cases.

## Adding Examples

TBD

Example documents should be realistic enough to exercise ML system design reasoning, but should not include private or proprietary information.

## Adding Evaluation Cases

TBD

Evaluation cases should make it clear:

- what document is being reviewed;
- what issue should be found;
- what should not be said;
- what direct answer leakage would look like;
- what makes the expected feedback useful.

## Code Style

TBD

## Commit Messages

TBD

## Reporting Issues

When reporting an issue, please include:

- what you expected to happen;
- what actually happened;
- the input document or a minimal reproducible example;
- relevant logs or review output;
- environment details if applicable.

## License

By contributing to this project, you agree that your contributions will be licensed under the project license.
