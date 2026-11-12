"""Config flow for card-mod: nothing to configure, one entry."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN


class CardModConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add card-mod. single_config_entry in the manifest refuses a second one."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Confirm, then create the entry."""
        if user_input is not None:
            return self.async_create_entry(title="card-mod", data={})
        return self.async_show_form(step_id="user")
