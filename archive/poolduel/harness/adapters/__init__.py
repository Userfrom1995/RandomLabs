"""Pooler adapters: identical interface, only config_text and port differ."""

from .base import BaseAdapter
from .direct import DirectAdapter
from .pgagroal import PgAgroalAdapter
from .pgbouncer import PgBouncerAdapter
from .pgpool import PgPoolAdapter
from .odyssey import OdysseyAdapter
from .pgcat import PgCatAdapter
from .supavisor import SupavisorAdapter

__all__ = ["BaseAdapter", "DirectAdapter", "PgAgroalAdapter",
           "PgBouncerAdapter", "PgPoolAdapter", "OdysseyAdapter",
           "PgCatAdapter", "SupavisorAdapter"]
