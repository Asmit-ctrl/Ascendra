"""Supabase client configuration for teacher feedback system."""

import os
from typing import Optional
from supabase import create_client, Client

from ..core.logging import get_logger

logger = get_logger("supabase_client")

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client singleton.
    
    Returns:
        Supabase client instance
        
    Raises:
        ValueError: If SUPABASE_URL or SUPABASE_SERVICE_KEY not set
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    # Get credentials from environment
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url:
        raise ValueError(
            "SUPABASE_URL environment variable not set. "
            "Get it from: https://app.supabase.com → Project Settings → API"
        )
    
    if not supabase_key:
        raise ValueError(
            "SUPABASE_SERVICE_KEY environment variable not set. "
            "Get it from: https://app.supabase.com → Project Settings → API → service_role key"
        )
    
    # Create client
    _supabase_client = create_client(supabase_url, supabase_key)
    
    logger.info("Supabase client initialized", url=supabase_url)
    
    return _supabase_client


def reset_supabase_client() -> None:
    """Reset the Supabase client singleton (useful for testing)."""
    global _supabase_client
    _supabase_client = None
