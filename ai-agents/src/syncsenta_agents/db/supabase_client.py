"""Supabase client configuration for teacher feedback system."""

import os
from typing import Optional
from supabase import create_client, Client

from ..core.logging import get_logger

logger = get_logger("supabase_client")

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Get or create Supabase client singleton.
    
    Returns:
        Supabase client instance or None if credentials not configured
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    # Get credentials from environment
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url:
        logger.warning(
            "SUPABASE_URL environment variable not set. "
            "Database features will be disabled. "
            "Get it from: https://app.supabase.com -> Project Settings -> API"
        )
        return None
    
    if not supabase_key:
        logger.warning(
            "SUPABASE_SERVICE_KEY environment variable not set. "
            "Database features will be disabled. "
            "Get it from: https://app.supabase.com -> Project Settings -> API -> service_role key"
        )
        return None
    
    # Create client
    try:
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized", url=supabase_url)
        return _supabase_client
    except Exception as exc:
        logger.warning(f"Failed to initialize Supabase client: {exc}")
        return None


def try_get_supabase_client() -> Optional[Client]:
    """Try to get Supabase client without raising exceptions.
    
    Returns:
        Supabase client instance or None if not available
    """
    try:
        return get_supabase_client()
    except Exception as exc:
        logger.warning(f"Could not get Supabase client: {exc}")
        return None


def reset_supabase_client() -> None:
    """Reset the Supabase client singleton (useful for testing)."""
    global _supabase_client
    _supabase_client = None
