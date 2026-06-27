import ast
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _parse_module(relative_path: str) -> ast.Module:
    source = (PROJECT_ROOT / relative_path).read_text(encoding="utf-8")
    return ast.parse(source)


def _is_os_getenv_call(node: ast.AST) -> bool:
    return (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "getenv"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "os"
    )


def _is_string_default(node: ast.AST) -> bool:
    if isinstance(node, ast.Constant):
        return isinstance(node.value, str)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        return node.func.id in {"str", "_read_dataset_revision_file"}
    return False


def test_prepare_data_config_uses_string_getenv_defaults() -> None:
    module = _parse_module("src/prepare_data/config.py")

    non_string_defaults = []
    for node in ast.walk(module):
        if not _is_os_getenv_call(node) or len(node.args) < 2:
            continue
        default = node.args[1]
        if not _is_string_default(default):
            non_string_defaults.append(ast.unparse(node))

    assert non_string_defaults == []
