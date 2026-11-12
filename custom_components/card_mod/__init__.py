"""Serve card-mod and load it before the dashboards render.

card-mod patches Home Assistant frontend elements. Loaded as a dashboard
resource, it arrives after the cards have painted and their styles visibly pop
in; loaded as a frontend module (``extra_module_url``) it is there before the
first card. A plugin cannot register itself as a frontend module, and a
hand-written ``extra_module_url`` entry carries no version, so browsers keep
the previous card-mod for as long as their cache lasts after an update.

This integration ships the built files, serves them under ``/card_mod/`` and
registers ``card-mod.js?v=<version>-<content hash>`` twice, under the same URL:
as a frontend module for the browser, and as a dashboard resource for Google
Cast, which does not load frontend modules. One URL means one ES module, so
card-mod is never loaded twice; a new build means a new URL, so browsers fetch
it on the next page load after a restart.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
import hashlib
import logging
from pathlib import Path

from homeassistant.components.frontend import (
    DATA_EXTRA_MODULE_URL,
    add_extra_js_url,
    remove_extra_js_url,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.resources import ResourceStorageCollection
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers import config_validation as cv, issue_registry as ir
from homeassistant.helpers.start import async_at_started
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration
from homeassistant.util.hass_dict import HassKey

from .const import (
    DOMAIN,
    FOREIGN_CARD_MOD_SUFFIX,
    FRONTEND_DIR,
    FRONTEND_FILE,
    ISSUE_DUPLICATE,
    URL_BASE,
)

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

# A static route cannot be removed: register it once per run, even if the
# entry is reloaded or removed and added again.
DATA_STATIC_REGISTERED: HassKey[bool] = HassKey(f"{DOMAIN}_static_registered")

OWN_PATH = f"{URL_BASE}/{FRONTEND_FILE}"


@dataclass
class CardModRuntime:
    """What a loaded entry registered."""

    url: str
    unsubscribe: list[Callable[[], None]] = field(default_factory=list)


type CardModConfigEntry = ConfigEntry[CardModRuntime]


def _path(url: str) -> str:
    """Return a URL without its query string."""
    return url.split("?", 1)[0]


def _is_own(url: str) -> bool:
    """Return if the URL is the card-mod this integration serves."""
    return _path(url) == OWN_PATH


def _is_foreign(url: str) -> bool:
    """Return if the URL loads card-mod from anywhere else."""
    return _path(url).endswith(FOREIGN_CARD_MOD_SUFFIX) and not _is_own(url)


def _digest(path: Path) -> str:
    """Return a short content hash, so a rebuild always changes the URL."""
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration; everything happens in the config entry."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: CardModConfigEntry) -> bool:
    """Serve card-mod and register it as a frontend module and a resource."""
    module = FRONTEND_DIR / FRONTEND_FILE
    if not await hass.async_add_executor_job(module.is_file):
        raise ConfigEntryError(
            f"{module} is missing: this is not a built release of card-mod"
        )

    integration = await async_get_integration(hass, DOMAIN)
    digest = await hass.async_add_executor_job(_digest, module)
    url = f"{OWN_PATH}?v={integration.version}-{digest}"

    if not hass.data.get(DATA_STATIC_REGISTERED):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(FRONTEND_DIR), True)]
        )
        hass.data[DATA_STATIC_REGISTERED] = True

    add_extra_js_url(hass, url)
    runtime = CardModRuntime(url=url)
    entry.runtime_data = runtime
    _LOGGER.debug("Registered frontend module %s", url)

    resources = await _async_resources(hass)
    if resources is not None:
        await _async_sync_resource(resources, url)

        async def _resources_changed(*_args) -> None:
            _check_duplicates(hass, resources)

        runtime.unsubscribe.append(resources.async_add_listener(_resources_changed))

    _check_duplicates(hass, resources)

    # Another integration (or the plugin's own setup) may register a frontend
    # module later in the start-up: look again once everything has started.
    @callback
    def _started(_hass: HomeAssistant) -> None:
        _check_duplicates(hass, resources)

    runtime.unsubscribe.append(async_at_started(hass, _started))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: CardModConfigEntry) -> bool:
    """Stop loading card-mod as a frontend module.

    The dashboard resource stays, so a reload does not churn the resource
    list; removing the entry deletes it.
    """
    runtime = entry.runtime_data
    for unsubscribe in runtime.unsubscribe:
        unsubscribe()
    remove_extra_js_url(hass, runtime.url)
    ir.async_delete_issue(hass, DOMAIN, ISSUE_DUPLICATE)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: CardModConfigEntry) -> None:
    """Delete the dashboard resource this integration created."""
    if (resources := await _async_resources(hass)) is None:
        return
    for item in list(resources.async_items()):
        if _is_own(item.get("url", "")):
            await resources.async_delete_item(item["id"])
            _LOGGER.info("Removed dashboard resource %s", item["url"])


async def _async_resources(hass: HomeAssistant) -> ResourceStorageCollection | None:
    """Return the dashboard resources when they are stored, loaded.

    In YAML mode the resources are part of the configuration and cannot be
    written: card-mod then loads as a frontend module only, Cast excepted.
    """
    if (lovelace := hass.data.get(LOVELACE_DATA)) is None:
        return None
    resources = lovelace.resources
    if not isinstance(resources, ResourceStorageCollection):
        _LOGGER.info(
            "Dashboard resources are in YAML mode: card-mod is loaded as a "
            "frontend module only, add %s as a resource for Cast",
            OWN_PATH,
        )
        return None
    # Loads the storage collection on first use
    await resources.async_get_info()
    return resources


async def _async_sync_resource(resources: ResourceStorageCollection, url: str) -> None:
    """Keep exactly one dashboard resource for card-mod, at the current URL."""
    own = [item for item in resources.async_items() if _is_own(item.get("url", ""))]
    if not own:
        await resources.async_create_item({"res_type": "module", "url": url})
        _LOGGER.info("Added dashboard resource %s", url)
        return

    first, *others = own
    if first["url"] != url:
        await resources.async_update_item(first["id"], {"url": url})
        _LOGGER.info("Updated dashboard resource %s to %s", first["url"], url)
    for item in others:
        await resources.async_delete_item(item["id"])
        _LOGGER.info("Removed duplicate dashboard resource %s", item["url"])


@callback
def _check_duplicates(
    hass: HomeAssistant, resources: ResourceStorageCollection | None
) -> None:
    """Raise a repair while another copy of card-mod is registered."""
    urls: list[str] = []
    if resources is not None:
        urls.extend(item.get("url", "") for item in resources.async_items())
    if (extra_modules := hass.data.get(DATA_EXTRA_MODULE_URL)) is not None:
        urls.extend(extra_modules.urls)
    foreign = sorted({url for url in urls if _is_foreign(url)})

    if not foreign:
        ir.async_delete_issue(hass, DOMAIN, ISSUE_DUPLICATE)
        return

    _LOGGER.warning("card-mod is also loaded from %s", ", ".join(foreign))
    ir.async_create_issue(
        hass,
        DOMAIN,
        ISSUE_DUPLICATE,
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key=ISSUE_DUPLICATE,
        translation_placeholders={"urls": "\n".join(f"- `{u}`" for u in foreign)},
    )
