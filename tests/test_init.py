"""Tests for the card-mod integration setup."""

from hashlib import sha256
from pathlib import Path

from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

from custom_components.card_mod.const import DOMAIN, ISSUE_DUPLICATE
from homeassistant.components.frontend import DATA_EXTRA_MODULE_URL
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.loader import async_get_integration
from homeassistant.setup import async_setup_component

PLUGIN_URL = "/local/community/lovelace-card-mod/card-mod.js?v=1316268191-v4.4.0"


async def _expected_url(hass: HomeAssistant, frontend_dir: Path) -> str:
    version = (await async_get_integration(hass, DOMAIN)).version
    digest = sha256((frontend_dir / "card-mod.js").read_bytes()).hexdigest()[:8]
    return f"/card_mod/card-mod.js?v={version}-{digest}"


async def _setup_frontend(hass: HomeAssistant, config: dict | None = None) -> None:
    assert await async_setup_component(hass, "frontend", config or {})
    await hass.async_block_till_done()


async def _setup_entry(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title="card-mod")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


def _extra_modules(hass: HomeAssistant) -> frozenset[str]:
    return hass.data[DATA_EXTRA_MODULE_URL].urls


def _resource_urls(hass: HomeAssistant) -> list[str]:
    return [item["url"] for item in hass.data[LOVELACE_DATA].resources.async_items()]


async def test_registers_module_and_resource_under_one_url(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """The frontend module and the Cast resource share one versioned URL."""
    await _setup_frontend(hass)
    entry = await _setup_entry(hass)

    url = await _expected_url(hass, frontend_dir)
    assert entry.state is ConfigEntryState.LOADED
    assert url in _extra_modules(hass)
    assert _resource_urls(hass) == [url]
    assert not ir.async_get(hass).async_get_issue(DOMAIN, ISSUE_DUPLICATE)


async def test_serves_the_build(
    hass: HomeAssistant, frontend_dir: Path, hass_client: ClientSessionGenerator
) -> None:
    """card-mod.js and the chunk it imports are served under /card_mod/."""
    await _setup_frontend(hass)
    await _setup_entry(hass)
    client = await hass_client()

    response = await client.get(await _expected_url(hass, frontend_dir))
    assert response.status == 200
    assert await response.text() == "export const cardMod = 1;\n"

    response = await client.get("/card_mod/yaml_parser-0123abcd.js")
    assert response.status == 200


async def test_rewrites_an_outdated_resource_and_drops_extras(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """After an update, the existing resource follows the new URL."""
    await _setup_frontend(hass)
    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_get_info()
    await resources.async_create_item(
        {"res_type": "module", "url": "/card_mod/card-mod.js?v=4.3.0-deadbeef"}
    )
    await resources.async_create_item(
        {"res_type": "module", "url": "/card_mod/card-mod.js?v=4.2.0-cafebabe"}
    )
    await resources.async_create_item(
        {"res_type": "module", "url": "/local/other-card.js"}
    )

    await _setup_entry(hass)

    assert sorted(_resource_urls(hass)) == sorted(
        [await _expected_url(hass, frontend_dir), "/local/other-card.js"]
    )


async def test_repair_while_the_plugin_resource_remains(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """Another card-mod resource raises a repair, cleared once it is deleted."""
    await _setup_frontend(hass)
    resources = hass.data[LOVELACE_DATA].resources
    await resources.async_get_info()
    plugin = await resources.async_create_item(
        {"res_type": "module", "url": PLUGIN_URL}
    )

    await _setup_entry(hass)
    issue = ir.async_get(hass).async_get_issue(DOMAIN, ISSUE_DUPLICATE)
    assert issue is not None
    assert PLUGIN_URL in issue.translation_placeholders["urls"]

    await resources.async_delete_item(plugin["id"])
    await hass.async_block_till_done()
    assert not ir.async_get(hass).async_get_issue(DOMAIN, ISSUE_DUPLICATE)


async def test_repair_for_a_hand_written_extra_module(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """A card-mod entry under frontend: extra_module_url is a second copy too."""
    await _setup_frontend(
        hass,
        {"frontend": {"extra_module_url": ["/local/card-mod.js"]}},
    )
    await _setup_entry(hass)

    issue = ir.async_get(hass).async_get_issue(DOMAIN, ISSUE_DUPLICATE)
    assert issue is not None
    assert "/local/card-mod.js" in issue.translation_placeholders["urls"]


async def test_unload_keeps_the_resource_and_remove_deletes_it(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """Unload stops the frontend module; removing the entry cleans up."""
    await _setup_frontend(hass)
    entry = await _setup_entry(hass)
    url = await _expected_url(hass, frontend_dir)

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert url not in _extra_modules(hass)
    assert _resource_urls(hass) == [url]

    # Loaded again (a reload), still a single resource and a static route
    # that is not registered twice.
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert url in _extra_modules(hass)
    assert _resource_urls(hass) == [url]

    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert url not in _extra_modules(hass)
    assert _resource_urls(hass) == []


async def test_yaml_resources_get_the_frontend_module_only(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """Resources in YAML cannot be written; the frontend module still loads."""
    await _setup_frontend(hass, {"lovelace": {"resource_mode": "yaml"}})
    entry = await _setup_entry(hass)

    assert entry.state is ConfigEntryState.LOADED
    assert await _expected_url(hass, frontend_dir) in _extra_modules(hass)
    assert _resource_urls(hass) == []


async def test_refuses_to_start_without_a_build(
    hass: HomeAssistant, frontend_dir: Path
) -> None:
    """A source checkout without npm run build fails visibly."""
    (frontend_dir / "card-mod.js").unlink()
    await _setup_frontend(hass)
    entry = await _setup_entry(hass)

    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert not any("card_mod" in url for url in _extra_modules(hass))
