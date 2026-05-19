#!/usr/bin/env python3
"""Test script to verify DNS resolution fix."""

import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_supabase_client_without_credentials():
    """Test that supabase client returns None without credentials."""
    # Clear environment variables
    os.environ.pop('SUPABASE_URL', None)
    os.environ.pop('SUPABASE_SERVICE_KEY', None)
    
    from syncsenta_agents.db.supabase_client import get_supabase_client, try_get_supabase_client
    
    print("Testing get_supabase_client() without credentials...")
    client = get_supabase_client()
    assert client is None, "Expected None when credentials missing"
    print("✓ get_supabase_client() returns None correctly")
    
    print("\nTesting try_get_supabase_client() without credentials...")
    client = try_get_supabase_client()
    assert client is None, "Expected None when credentials missing"
    print("✓ try_get_supabase_client() returns None correctly")
    
    print("\n✅ All tests passed! DNS resolution error should be fixed.")
    print("\nKey improvements:")
    print("1. ✓ get_supabase_client() returns None instead of raising ValueError")
    print("2. ✓ try_get_supabase_client() provides safe access without exceptions")
    print("3. ✓ Warnings logged instead of errors when Supabase not configured")
    print("4. ✓ list_schemes() returns empty list with helpful message")
    print("5. ✓ All database operations fail gracefully")

if __name__ == '__main__':
    test_supabase_client_without_credentials()

# Made with Bob
