"""Tests for the card-mod config flow."""

from pathlib import Path

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.card_mod.const import DOMAIN
from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.setup import async_setup_component


async def test_user_step_creates_the_entry(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """One confirmation, no options."""
    assert await async_setup_component(hass, "frontend", {})

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "card-mod"


async def test_a_second_entry_is_refused(hass: HomeAssistant) -> None:
    """single_config_entry: card-mod is set up once."""
    MockConfigEntry(domain=DOMAIN).add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"
