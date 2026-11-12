"""Fixtures for the card-mod integration tests."""

from collections.abc import Generator
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Let Home Assistant load custom_components/card_mod."""
    return


@pytest.fixture
def frontend_dir(tmp_path: Path) -> Generator[Path]:
    """Serve a small fake build instead of whatever npm last produced."""
    (tmp_path / "card-mod.js").write_text("export const cardMod = 1;\n")
    (tmp_path / "yaml_parser-0123abcd.js").write_text("export {};\n")
    with patch("custom_components.card_mod.FRONTEND_DIR", tmp_path):
        yield tmp_path
