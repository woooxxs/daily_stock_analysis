"""Configuration file manager with atomic read/write behavior."""

from __future__ import annotations

import errno
import hashlib
import io
import logging
import os
import re
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple, Union

from dotenv import dotenv_values

_ASSIGNMENT_PATTERN = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$")
_COMMENTED_ASSIGNMENT_PATTERN = re.compile(r"^\s*#\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$")
_FALLBACK_REWRITE_ERRNOS = {errno.EBUSY, errno.EXDEV}

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ConfigLineEntry:
    """Structured representation of a config assignment line."""

    key: str
    value: str
    is_commented: bool
    line_index: int
    raw_line: str


@dataclass(frozen=True)
class ConfigUpdate:
    """Single config update item with optional enabled state."""

    key: str
    value: str
    enabled: Optional[bool] = None


ConfigUpdateInput = Union[ConfigUpdate, Tuple[str, str], Tuple[str, str, Optional[bool]]]


class ConfigManager:
    """Manage `.env` read/write operations with optimistic versioning."""

    def __init__(self, env_path: Optional[Path] = None):
        self._env_path = env_path or self._resolve_env_path()
        self._lock = threading.RLock()

    @property
    def env_path(self) -> Path:
        """Return active `.env` path."""
        return self._env_path

    def read_config_map(self) -> Dict[str, str]:
        """Read key-value mapping from `.env` file."""
        entries = self.read_config_entries()
        return {
            key: entry.value
            for key, entry in entries.items()
            if not entry.is_commented
        }

    def read_config_entries(self) -> Dict[str, ConfigLineEntry]:
        """Read the last occurrence of each config key, including commented lines."""
        lines = self._read_lines()
        return self._find_last_key_entries(lines)

    def get_config_version(self) -> str:
        """Return deterministic version string based on file state."""
        if not self._env_path.exists():
            return "missing:0"

        content = self._env_path.read_bytes()
        file_stat = self._env_path.stat()
        content_hash = hashlib.sha256(content).hexdigest()
        return f"{file_stat.st_mtime_ns}:{content_hash}"

    def get_updated_at(self) -> Optional[str]:
        """Return `.env` last update time in ISO8601 format."""
        if not self._env_path.exists():
            return None

        file_stat = self._env_path.stat()
        updated_at = datetime.fromtimestamp(file_stat.st_mtime, tz=timezone.utc)
        return updated_at.isoformat()

    def apply_updates(
        self,
        updates: Iterable[ConfigUpdateInput],
        sensitive_keys: Set[str],
        mask_token: str,
    ) -> Tuple[List[str], List[str], str]:
        """Apply updates into `.env` file using atomic replace when possible."""
        with self._lock:
            current_entries = self.read_config_entries()
            mutable_updates: List[ConfigUpdate] = []
            skipped_masked: List[str] = []

            for raw_update in updates:
                update = self._coerce_update(raw_update)
                key_upper = update.key.upper()
                current_entry = current_entries.get(key_upper)
                current_value = current_entry.value if current_entry else None
                current_enabled = None if current_entry is None else not current_entry.is_commented
                next_enabled = current_enabled if update.enabled is None else update.enabled
                next_value = update.value

                if key_upper in sensitive_keys and next_value == mask_token:
                    if current_value not in (None, ""):
                        skipped_masked.append(key_upper)
                        next_value = current_value

                if current_value == next_value and current_enabled == next_enabled:
                    continue

                if current_entry is None and next_enabled is False and not next_value.strip():
                    continue

                mutable_updates.append(ConfigUpdate(key=key_upper, value=next_value, enabled=next_enabled))

            if mutable_updates:
                self._atomic_upsert(mutable_updates)

            return [update.key for update in mutable_updates], skipped_masked, self.get_config_version()

    def _atomic_upsert(self, updates: Sequence[ConfigUpdate]) -> None:
        """Write updates with atomic rename and in-place fallback for mounted files."""
        lines = self._read_lines()

        for update in updates:
            key_to_entry = self._find_last_key_entries(lines)
            line_value = update.value.replace("\n", "")
            enabled = True if update.enabled is None else update.enabled
            new_line = f"{update.key}={line_value}" if enabled else f"# {update.key}={line_value}"
            current_entry = key_to_entry.get(update.key)

            if current_entry is not None:
                lines[current_entry.line_index] = new_line
                continue

            insert_index = self._find_insert_index(lines, update.key)
            lines.insert(insert_index, new_line)

        if not self._env_path.parent.exists():
            self._env_path.parent.mkdir(parents=True, exist_ok=True)

        temp_path = self._env_path.with_suffix(self._env_path.suffix + ".tmp")
        content = "\n".join(lines)
        if content and not content.endswith("\n"):
            content += "\n"

        with temp_path.open("w", encoding="utf-8", newline="\n") as file_obj:
            file_obj.write(content)
            file_obj.flush()
            os.fsync(file_obj.fileno())

        try:
            os.replace(temp_path, self._env_path)
        except OSError as exc:
            if exc.errno not in _FALLBACK_REWRITE_ERRNOS:
                raise

            logger.warning(
                "Atomic replace for .env failed with errno=%s, falling back to in-place rewrite",
                exc.errno,
            )
            self._rewrite_in_place(content)
        finally:
            if temp_path.exists():
                temp_path.unlink()

    def _rewrite_in_place(self, content: str) -> None:
        """Rewrite `.env` content in place when rename is unsupported by mount type."""
        with self._env_path.open("w", encoding="utf-8", newline="\n") as file_obj:
            file_obj.write(content)
            file_obj.flush()
            os.fsync(file_obj.fileno())

    def _read_lines(self) -> List[str]:
        if not self._env_path.exists():
            return []
        return self._env_path.read_text(encoding="utf-8").splitlines()

    @staticmethod
    def _find_last_key_entries(lines: List[str]) -> Dict[str, ConfigLineEntry]:
        key_to_entry: Dict[str, ConfigLineEntry] = {}
        for index, raw_line in enumerate(lines):
            entry = ConfigManager._parse_line_entry(raw_line=raw_line, line_index=index)
            if entry is None:
                continue

            existing_entry = key_to_entry.get(entry.key)
            if existing_entry is None:
                key_to_entry[entry.key] = entry
                continue

            if entry.is_commented and not existing_entry.is_commented:
                continue

            key_to_entry[entry.key] = entry

        return key_to_entry

    @staticmethod
    def _parse_line_entry(raw_line: str, line_index: int) -> Optional[ConfigLineEntry]:
        stripped = raw_line.strip()
        if not stripped:
            return None

        is_commented = False
        matched = _ASSIGNMENT_PATTERN.match(raw_line)
        if matched is None:
            matched = _COMMENTED_ASSIGNMENT_PATTERN.match(raw_line)
            is_commented = matched is not None

        if matched is None:
            return None

        key = matched.group(1).upper()
        parsed_value = dotenv_values(stream=io.StringIO(f"{key}={matched.group(2)}\n"))
        value = parsed_value.get(key)
        return ConfigLineEntry(
            key=key,
            value="" if value is None else str(value),
            is_commented=is_commented,
            line_index=line_index,
            raw_line=raw_line,
        )

    def _find_insert_index(self, lines: List[str], key: str) -> int:
        template_order = self._get_template_key_order()
        if key not in template_order:
            return len(lines)

        current_entries = self._find_last_key_entries(lines)
        key_position = template_order.index(key)

        for next_key in template_order[key_position + 1 :]:
            next_entry = current_entries.get(next_key)
            if next_entry is not None:
                return next_entry.line_index

        for previous_key in reversed(template_order[:key_position]):
            previous_entry = current_entries.get(previous_key)
            if previous_entry is not None:
                return previous_entry.line_index + 1

        return len(lines)

    def _get_template_key_order(self) -> List[str]:
        template_path = self._resolve_env_example_path()
        if not template_path.exists():
            return []

        order: List[str] = []
        for index, raw_line in enumerate(template_path.read_text(encoding="utf-8").splitlines()):
            entry = self._parse_line_entry(raw_line=raw_line, line_index=index)
            if entry is not None and entry.key not in order:
                order.append(entry.key)

        return order

    @staticmethod
    def _coerce_update(raw_update: ConfigUpdateInput) -> ConfigUpdate:
        if isinstance(raw_update, ConfigUpdate):
            return ConfigUpdate(
                key=raw_update.key.upper(),
                value=raw_update.value,
                enabled=raw_update.enabled,
            )

        if len(raw_update) == 2:
            key, value = raw_update
            return ConfigUpdate(key=str(key).upper(), value=str(value), enabled=None)

        key, value, enabled = raw_update
        return ConfigUpdate(key=str(key).upper(), value=str(value), enabled=enabled)

    @staticmethod
    def _resolve_env_example_path() -> Path:
        return (Path(__file__).resolve().parent.parent.parent / ".env.example").resolve()

    @staticmethod
    def _resolve_env_path() -> Path:
        env_file = os.getenv("ENV_FILE")
        if env_file:
            return Path(env_file).resolve()

        return (Path(__file__).resolve().parent.parent.parent / ".env").resolve()
