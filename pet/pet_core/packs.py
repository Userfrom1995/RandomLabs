"""Creator-pack framework (stdlib only, no GUI imports).

Third parties add characters with JSON alone: a pack directory (or zip)
holding a ``pack.json`` manifest plus one character file per new
character under ``characters/``. This module validates, installs, lists,
removes, shows, and activates packs. Activation merges pack characters
into the live catalog, trait tables, and voice pools without touching
core files.

Pack layout (directory or ``.zip``)::

    my-pack/
      pack.json                 manifest (required)
      characters/
        sunny.json              character record (one or more, required)
        ember.json

``pack.json`` fields: ``slug``, ``name``, ``version`` (semver),
``author``, ``description``, optional ``engine_min``/``engine_max``
(semver, checked against the pet engine version), optional
``characters`` (list of relative paths; defaults to every
``characters/*.json`` file).

Each character record fields: ``id``, ``name``, ``species``,
``body_plan`` (one of the catalog plans), ``tagline``, ``signature``,
``palette`` (``#RRGGBB`` values), ``traits`` (numeric rate overrides),
``dialogue`` (``mood:<m>`` / ``event:<e>`` pools of at least 3 lines),
optional ``replies`` (converse intent pools), optional ``sprite``
(render hints object).

Validation is fail-closed: unknown body plans, out-of-range numbers,
bad palettes, thin dialogue pools, oversized payloads, and zip path
traversal are all rejected, never partially applied. Installing never
executes code: only JSON is parsed.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import tempfile
import zipfile

ENGINE_VERSION = "1.5.0"

PACKS_DIRNAME = "packs"

MAX_PACK_BYTES = 512 * 1024
MAX_FILE_BYTES = 128 * 1024
MAX_FILES = 32
MAX_LINE_CHARS = 280
MIN_POOL_LINES = 3

KNOWN_DIALOGUE_KEYS = frozenset(
    ["mood:" + m for m in ("happy", "curious", "sleepy", "grumpy",
                            "hungry", "affectionate")]
    + ["event:" + e for e in ("poke", "feed", "play", "wake", "sleep",
                               "greet", "stroke", "catch")]
)

KNOWN_INTENTS = frozenset((
    "greeting", "name", "mood", "hunger", "sleep", "energy",
    "affection", "joke", "comfort", "feed", "wake", "play",
    "time", "help",
))

TRAIT_BOUNDS: dict[str, tuple[float, float]] = {
    "hunger_rate": (0.0, 0.4),
    "energy_drain": (0.0, 0.3),
    "energy_restore": (0.0, 0.8),
    "affection_decay": (0.0, 0.25),
    "walk_speed": (8.0, 120.0),
    "play_bonus": (-0.2, 0.2),
    "sleep_bonus": (-0.2, 0.2),
    "react_bonus": (-0.2, 0.2),
}

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
_SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")
_HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
_PALETTE_KEY_RE = re.compile(r"^[a-z_]+$")

_active_cache: dict[str, tuple[dict, list[str]]] = {}


def packs_dir(data_dir: str | None = None) -> str:
    """User-data directory holding installed packs."""
    if data_dir is None:
        override = os.environ.get("DESKTOP_PET_DATA_DIR")
        if override:
            data_dir = override
        else:
            from .persistence import default_dir
            data_dir = default_dir()
    return os.path.join(data_dir, PACKS_DIRNAME)


def _read_json_file(path: str) -> dict:
    if os.path.getsize(path) > MAX_FILE_BYTES:
        raise ValueError("file too large: %r" % (path,))
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("top level must be a JSON object: %r" % (path,))
    return data


def _check_semver(value: object, field: str) -> str:
    if not isinstance(value, str) or not _SEMVER_RE.match(value.strip()):
        raise ValueError("%s must look like MAJOR.MINOR.PATCH" % field)
    return value.strip()


def _version_tuple(value: str) -> tuple[int, int, int]:
    return tuple(int(p) for p in value.split("."))  # type: ignore[return-value]


def validate_manifest(data: dict) -> dict:
    """Validate a pack.json manifest. Returns the cleaned manifest."""
    if not isinstance(data, dict):
        raise ValueError("manifest must be a JSON object")
    slug = data.get("slug", "")
    if not isinstance(slug, str) or not _SLUG_RE.match(slug.strip().lower()):
        raise ValueError("slug must be a lowercase slug")
    slug = slug.strip().lower()
    if len(slug) > 32:
        raise ValueError("slug must be at most 32 characters")
    name = data.get("name", "")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 48:
        raise ValueError("name must be 1..48 characters")
    version = _check_semver(data.get("version", ""), "version")
    for field in ("engine_min", "engine_max"):
        if data.get(field) is not None:
            _check_semver(data[field], field)
    if data.get("engine_min") and data.get("engine_max"):
        if _version_tuple(data["engine_min"]) > _version_tuple(data["engine_max"]):
            raise ValueError("engine_min must not exceed engine_max")
    if data.get("engine_min"):
        if _version_tuple(data["engine_min"]) > _version_tuple(ENGINE_VERSION):
            raise ValueError("pack needs engine %s (have %s)" % (
                data["engine_min"], ENGINE_VERSION))
    if data.get("engine_max"):
        if _version_tuple(data["engine_max"]) < _version_tuple(ENGINE_VERSION):
            raise ValueError("pack supports engine up to %s (have %s)" % (
                data["engine_max"], ENGINE_VERSION))
    for field in ("author", "description"):
        if field in data and not isinstance(data[field], str):
            raise ValueError("%s must be a string" % field)
    chars = data.get("characters", None)
    if chars is not None:
        if (not isinstance(chars, list) or not chars
                or not all(isinstance(c, str) and c.strip() for c in chars)):
            raise ValueError("characters must be a non-empty list of paths")
        if len(chars) > MAX_FILES:
            raise ValueError("too many character files")
    return {
        "slug": slug,
        "name": name.strip(),
        "version": version,
        "author": str(data.get("author", "") or "").strip()[:64],
        "description": str(data.get("description", "") or "").strip()[:500],
        "engine_min": data.get("engine_min"),
        "engine_max": data.get("engine_max"),
        "characters": ([c.strip() for c in chars] if chars is not None else None),
    }


def validate_traits(data: object) -> dict[str, float]:
    """Validate a traits override table. Returns cleaned floats."""
    if not isinstance(data, dict) or not data:
        raise ValueError("traits must be a non-empty object")
    cleaned: dict[str, float] = {}
    for key, value in data.items():
        if key not in TRAIT_BOUNDS:
            raise ValueError("unknown trait %r" % (key,))
        try:
            number = float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            raise ValueError("trait %r must be a number" % (key,))
        if number != number or number in (float("inf"), float("-inf")):
            raise ValueError("trait %r must be finite" % (key,))
        low, high = TRAIT_BOUNDS[key]
        if not low <= number <= high:
            raise ValueError("trait %r must be %.3g..%.3g" % (key, low, high))
        cleaned[key] = number
    return cleaned


def validate_dialogue(data: object) -> dict[str, list[str]]:
    """Validate mood/event dialogue pools. Returns cleaned pools."""
    if not isinstance(data, dict) or not data:
        raise ValueError("dialogue must be a non-empty object")
    cleaned: dict[str, list[str]] = {}
    for key, lines in data.items():
        if key not in KNOWN_DIALOGUE_KEYS:
            raise ValueError("unknown dialogue key %r" % (key,))
        if not isinstance(lines, list) or len(lines) < MIN_POOL_LINES:
            raise ValueError("dialogue %r needs at least %d lines" % (
                key, MIN_POOL_LINES))
        pool: list[str] = []
        for line in lines:
            if not isinstance(line, str) or not line.strip():
                raise ValueError("dialogue %r lines must be non-empty" % (key,))
            if len(line.strip()) > MAX_LINE_CHARS:
                raise ValueError("dialogue %r lines must be at most %d chars" % (
                    key, MAX_LINE_CHARS))
            pool.append(line.strip())
        if len(set(pool)) < MIN_POOL_LINES:
            raise ValueError("dialogue %r needs %d distinct lines" % (
                key, MIN_POOL_LINES))
        cleaned[key] = pool
    return cleaned


def validate_replies(data: object) -> dict[str, list[str]]:
    """Validate optional converse intent overrides. Returns cleaned pools."""
    if not isinstance(data, dict) or not data:
        raise ValueError("replies must be a non-empty object")
    cleaned: dict[str, list[str]] = {}
    for key, lines in data.items():
        if key not in KNOWN_INTENTS:
            raise ValueError("unknown intent %r" % (key,))
        if not isinstance(lines, list) or len(lines) < MIN_POOL_LINES:
            raise ValueError("replies %r needs at least %d lines" % (
                key, MIN_POOL_LINES))
        pool: list[str] = []
        for line in lines:
            if not isinstance(line, str) or not line.strip():
                raise ValueError("replies %r lines must be non-empty" % (key,))
            if len(line.strip()) > MAX_LINE_CHARS:
                raise ValueError("replies %r lines must be at most %d chars" % (
                    key, MAX_LINE_CHARS))
            pool.append(line.strip())
        cleaned[key] = pool
    return cleaned


def validate_character(data: dict) -> dict:
    """Validate one character record. Returns the cleaned record."""
    from . import catalog as catalog_mod

    if not isinstance(data, dict):
        raise ValueError("character must be a JSON object")
    record = dict(data)
    catalog_mod.validate_record(record)
    slug = str(record.get("id", "")).strip().lower()
    traits = validate_traits(record.get("traits", {}))
    dialogue = validate_dialogue(record.get("dialogue", {}))
    replies: dict[str, list[str]] = {}
    if record.get("replies") is not None:
        replies = validate_replies(record["replies"])
    sprite = record.get("sprite", None)
    if sprite is not None:
        if not isinstance(sprite, dict):
            raise ValueError("sprite must be an object")
        for key, value in sprite.items():
            if not isinstance(key, str) or not _PALETTE_KEY_RE.match(key):
                raise ValueError("sprite key %r is invalid" % (key,))
            if not isinstance(value, (str, int, float, bool)):
                raise ValueError("sprite %r must be a scalar" % (key,))
    return {
        "id": slug,
        "name": str(record["name"]).strip(),
        "species": str(record.get("species", "") or "").strip()[:48] or slug,
        "body_plan": record["body_plan"],
        "tagline": str(record.get("tagline", "") or "").strip()[:200],
        "signature": str(record.get("signature", "") or "").strip()[:280],
        "palette": {k: v for k, v in record["palette"].items()},
        "traits": traits,
        "dialogue": dialogue,
        "replies": replies,
        "sprite": dict(sprite) if isinstance(sprite, dict) else {},
    }


def _iter_pack_files(root: str) -> list[str]:
    found: list[str] = []
    total = 0
    for dirpath, _dirnames, filenames in os.walk(root):
        for name in sorted(filenames):
            path = os.path.join(dirpath, name)
            if os.path.islink(path):
                raise ValueError("pack must not contain symlinks: %r" % (name,))
            if not name.endswith(".json"):
                raise ValueError("pack files must be JSON: %r" % (name,))
            size = os.path.getsize(path)
            total += size
            if total > MAX_PACK_BYTES:
                raise ValueError("pack exceeds %d bytes" % MAX_PACK_BYTES)
            found.append(path)
    if len(found) > MAX_FILES:
        raise ValueError("pack has too many files (max %d)" % MAX_FILES)
    if not found:
        raise ValueError("pack is empty")
    return found


def _reject_escape(name: str, kind: str) -> str:
    """Normalize a zip/rel path and reject escapes. Returns posix form."""
    norm = name.replace("\\", "/")
    if (norm.startswith("/") or ".." in norm.split("/")
            or re.match(r"^[A-Za-z]:", norm)):
        raise ValueError("%s escapes the pack: %r" % (kind, name))
    return norm


def _unpack_zip(source: str, dest: str) -> str:
    with zipfile.ZipFile(source, "r") as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            name = info.filename
            _reject_escape(name, "zip entry")
            if info.file_size > MAX_FILE_BYTES:
                raise ValueError("zip entry too large: %r" % (name,))
            target = os.path.join(dest, name)
            if not os.path.abspath(target).startswith(
                    os.path.abspath(dest) + os.sep):
                raise ValueError("zip entry escapes the pack: %r" % (name,))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with archive.open(info, "r") as src, open(target, "wb") as dst:
                shutil.copyfileobj(src, dst, length=65536)
    top_entries = os.listdir(dest)
    if len(top_entries) == 1 and os.path.isdir(os.path.join(dest, top_entries[0])):
        return os.path.join(dest, top_entries[0])
    return dest


def validate(source: str) -> tuple[dict, list[dict]]:
    """Validate a pack directory or zip. Returns (manifest, characters).

    Raises ValueError with a human-readable reason on any failure.
    """
    if not os.path.exists(source):
        raise ValueError("no such pack: %r" % (source,))
    work: str | None = None
    try:
        if os.path.isfile(source) and source.endswith(".zip"):
            if os.path.getsize(source) > MAX_PACK_BYTES:
                raise ValueError("pack exceeds %d bytes" % MAX_PACK_BYTES)
            work = tempfile.mkdtemp(prefix="pack-validate-")
            root = _unpack_zip(os.path.abspath(source), work)
        elif os.path.isdir(source):
            root = os.path.abspath(source)
        else:
            raise ValueError("pack must be a directory or .zip file")
        manifest_path = os.path.join(root, "pack.json")
        if not os.path.isfile(manifest_path):
            raise ValueError("pack is missing pack.json")
        manifest = validate_manifest(_read_json_file(manifest_path))
        _iter_pack_files(root)
        rels = manifest["characters"]
        if rels is None:
            chars_dir = os.path.join(root, "characters")
            if not os.path.isdir(chars_dir):
                raise ValueError("pack has no characters/ directory")
            rels = sorted("characters/" + n for n in os.listdir(chars_dir)
                          if n.endswith(".json"))
            if not rels:
                raise ValueError("pack has no character files")
        characters: list[dict] = []
        seen: set[str] = set()
        for rel in rels:
            norm = _reject_escape(rel, "character path")
            if not (norm.startswith("characters/") and norm.endswith(".json")):
                raise ValueError(
                    "character path must live under characters/: %r" % (rel,))
            path = os.path.join(root, rel)
            if not os.path.abspath(path).startswith(
                    os.path.abspath(root) + os.sep):
                raise ValueError("character path escapes the pack: %r" % (rel,))
            if os.path.islink(path):
                raise ValueError("character file must not be a symlink: %r" % (rel,))
            if not os.path.isfile(path):
                raise ValueError("missing character file: %r" % (rel,))
            record = validate_character(_read_json_file(path))
            if record["id"] in seen:
                raise ValueError("duplicate character id %r" % (record["id"],))
            seen.add(record["id"])
            characters.append(record)
        if not characters:
            raise ValueError("pack defines no characters")
        return manifest, characters
    finally:
        if work is not None:
            shutil.rmtree(work, ignore_errors=True)


def install(source: str, data_dir: str | None = None) -> tuple[bool, str]:
    """Validate then copy a pack into the user-data packs namespace."""
    try:
        manifest, _characters = validate(source)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return False, "invalid pack (%s)" % exc
    target_root = packs_dir(data_dir)
    target = os.path.join(target_root, manifest["slug"])
    try:
        os.makedirs(target_root, exist_ok=True)
        work = tempfile.mkdtemp(prefix="pack-install-")
        try:
            if os.path.isfile(source) and source.endswith(".zip"):
                _unpack_zip(os.path.abspath(source), work)
                entries = os.listdir(work)
                if (len(entries) == 1
                        and os.path.isdir(os.path.join(work, entries[0]))):
                    staged = os.path.join(work, entries[0])
                else:
                    staged = work
            else:
                staged = os.path.abspath(source)
                if not os.path.isdir(staged):
                    return False, "pack must be a directory or .zip file"
            if os.path.isdir(target):
                shutil.rmtree(target)
            # Copy only the validated payload (pack.json plus the
            # manifest's character rels), never stray files, symlinks,
            # or a re-unpacked tree that was never re-validated.
            staged_manifest, _staged_chars = validate(staged)
            staged_rels = staged_manifest["characters"]
            if staged_rels is None:
                chars_dir = os.path.join(staged, "characters")
                staged_rels = sorted("characters/" + n
                                     for n in os.listdir(chars_dir)
                                     if n.endswith(".json"))
            wanted = ["pack.json"] + list(staged_rels)
            os.makedirs(target, exist_ok=True)
            for rel in wanted:
                norm = _reject_escape(rel, "character path")
                if rel != "pack.json" and not (
                        norm.startswith("characters/")
                        and norm.endswith(".json")):
                    raise ValueError(
                        "character path must live under characters/: %r"
                        % (rel,))
                src_path = os.path.join(staged, rel)
                if not os.path.abspath(src_path).startswith(
                        os.path.abspath(staged) + os.sep):
                    raise ValueError(
                        "character path escapes the pack: %r" % (rel,))
                if os.path.islink(src_path) or not os.path.isfile(src_path):
                    raise ValueError(
                        "missing character file: %r" % (rel,))
                dst_path = os.path.join(target, rel)
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                with open(src_path, "rb") as src_handle, open(
                        dst_path, "wb") as dst_handle:
                    shutil.copyfileobj(src_handle, dst_handle,
                                       length=65536)
        finally:
            if os.path.isdir(work):
                shutil.rmtree(work, ignore_errors=True)
    except (OSError, ValueError, zipfile.BadZipFile,
            json.JSONDecodeError) as exc:
        return False, "could not install pack (%s)" % exc
    _active_cache.pop(os.path.abspath(target_root), None)
    return True, "installed pack %r (%s)" % (manifest["slug"], manifest["name"])


def list_installed(data_dir: str | None = None) -> list[dict]:
    """List installed packs with their manifests (invalid ones noted)."""
    root = packs_dir(data_dir)
    found: list[dict] = []
    if not os.path.isdir(root):
        return found
    for slug in sorted(os.listdir(root)):
        path = os.path.join(root, slug)
        if os.path.islink(path) or not os.path.isdir(path):
            continue
        manifest_path = os.path.join(path, "pack.json")
        try:
            manifest = validate_manifest(_read_json_file(manifest_path))
            manifest["path"] = path
            manifest["status"] = "ok"
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            manifest = {"slug": slug, "name": slug, "version": "?",
                        "path": path, "status": "invalid (%s)" % exc}
        found.append(manifest)
    return found


def _clean_slug(slug: object) -> str | None:
    """Normalize an installed-pack slug; None when it is not slug-shaped."""
    if not isinstance(slug, str) or not slug.strip():
        return None
    clean = slug.strip().lower()
    if not _SLUG_RE.match(clean) or len(clean) > 32:
        return None
    return clean


def remove(slug: str, data_dir: str | None = None) -> tuple[bool, str]:
    """Remove an installed pack by slug."""
    clean = _clean_slug(slug)
    if clean is None:
        return False, "invalid pack slug %r" % (slug,)
    target = os.path.join(packs_dir(data_dir), clean)
    if not os.path.isdir(target):
        return False, "no installed pack %r" % (clean,)
    try:
        shutil.rmtree(target)
    except OSError as exc:
        return False, "could not remove pack (%s)" % exc
    _active_cache.pop(os.path.abspath(packs_dir(data_dir)), None)
    return True, "removed pack %r" % (clean,)


def show(slug: str, data_dir: str | None = None) -> tuple[dict | None, str]:
    """Show one installed pack manifest plus its character ids."""
    clean = _clean_slug(slug)
    if clean is None:
        return None, "invalid pack slug %r" % (slug,)
    target = os.path.join(packs_dir(data_dir), clean)
    if not os.path.isdir(target):
        return None, "no installed pack %r" % (clean,)
    try:
        manifest, characters = validate(target)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return None, "pack %r is invalid (%s)" % (clean, exc)
    detail = dict(manifest)
    detail["characters"] = [c["id"] for c in characters]
    detail["path"] = target
    return detail, "pack %r: %s" % (clean, manifest["name"])


def _load_from_root(root: str) -> tuple[dict, list[str]]:
    """Load all valid installed packs from a packs root directory."""
    from . import catalog as catalog_mod

    records: dict[str, dict] = {}
    notices: list[str] = []
    if not os.path.isdir(root):
        return records, notices
    for slug in sorted(os.listdir(root)):
        if slug.endswith(".broken"):
            continue
        path = os.path.join(root, slug)
        if os.path.islink(path):
            notices.append("pack %r is a symlink; skipped" % (slug,))
            continue
        if not os.path.isdir(path):
            continue
        try:
            manifest, characters = validate(path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            backup = path + ".broken"
            try:
                if os.path.isdir(backup):
                    shutil.rmtree(backup)
                os.rename(path, backup)
                notices.append("pack %r is corrupt (%s); moved aside" % (slug, exc))
            except OSError:
                notices.append("pack %r is corrupt (%s); skipped" % (slug, exc))
            continue
        for record in characters:
            cid = record["id"]
            if cid in catalog_mod.CHARACTERS:
                notices.append("pack %r character %r collides with a built-in; skipped" % (
                    manifest["slug"], cid))
                continue
            if cid in records:
                notices.append("character %r defined twice; first pack wins" % (cid,))
                continue
            entry = {
                "id": cid,
                "name": record["name"],
                "species": record["species"],
                "body_plan": record["body_plan"],
                "tagline": record["tagline"],
                "temperament": "custom",
                "palette": dict(record["palette"]),
                "signature": record["signature"],
                "traits": dict(record["traits"]),
            }
            if record.get("sprite"):
                entry["sprite"] = dict(record["sprite"])
            records[cid] = entry
            from . import personality as personality_mod
            from . import converse as converse_mod
            from . import state as state_mod
            from . import traits as traits_mod
            traits_mod.register_extra_traits(cid, record["traits"])
            state_mod.register_extra_character(cid)
            if record.get("dialogue"):
                personality_mod.register_extra_voice(cid, record["dialogue"])
            if record.get("replies"):
                converse_mod.register_extra_replies(cid, record["replies"])
    return records, notices


def load_installed(data_dir: str | None = None) -> tuple[dict, list[str]]:
    """Load all valid installed packs. Returns (records, notices).

    Invalid packs are skipped with a notice (fail-closed with backup:
    the offender is renamed to ``<slug>.broken`` so one corrupt pack
    never blocks the catalog).
    """
    return _load_from_root(packs_dir(data_dir))


def active_extra(data_dir: str | None = None) -> tuple[dict, list[str]]:
    """Cached load of installed packs for the catalog merge path."""
    root = os.path.abspath(packs_dir(data_dir))
    cached = _active_cache.get(root)
    if cached is not None:
        return cached[0], list(cached[1])
    records, notices = _load_from_root(root)
    _active_cache[root] = (records, list(notices))
    return records, notices


def clear_cache() -> None:
    _active_cache.clear()


def ensure_active(data_dir: str | None = None) -> list[str]:
    """Load installed packs into the live registries (never raises).

    Call before loading a save so pack character ids survive the
    round trip. Returns any notices for the caller to display.
    """
    try:
        _records, notices = active_extra(data_dir)
        return notices
    except Exception:
        return []
