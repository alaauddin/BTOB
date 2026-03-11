"""Core models — re-exported from the core.db package.

All models live in individual files under core/db/ for better organization.
This module re-exports everything so that existing imports like
``from core.models import Supplier`` continue to work unchanged.
"""
from core.db import *  # noqa: F401,F403
