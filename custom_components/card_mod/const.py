"""Constants for the card-mod integration."""

from pathlib import Path

DOMAIN = "card_mod"

# Where the integration serves the built frontend files, and the file that is
# registered. The yaml_parser chunk next to it is imported relatively by
# card-mod.js and carries a content hash in its name.
URL_BASE = "/card_mod"
FRONTEND_DIR = Path(__file__).parent / "frontend"
FRONTEND_FILE = "card-mod.js"

# Any URL loading card-mod from elsewhere: the Marketplace / HACS plugin, or a
# file copied by hand. A second copy under another URL patches everything twice.
FOREIGN_CARD_MOD_SUFFIX = "/card-mod.js"

ISSUE_DUPLICATE = "duplicate_card_mod"
