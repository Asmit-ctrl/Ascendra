"""Main entry point for SyncSenta AI Agents system."""

import uvicorn
from .core.config import config
from .core.logging import configure_logging, get_logger


def main() -> None:
    """Main application entry point - starts the FastAPI server."""
    
    # Configure logging
    configure_logging(debug=config.debug)
    logger = get_logger("main")
    
    # Check Supabase configuration
    import os
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.warning(
            "Supabase credentials not configured. Database features will be disabled.",
            missing_url=not supabase_url,
            missing_key=not supabase_key,
            help="Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables to enable database features."
        )
    else:
        logger.info("Supabase credentials found - database features enabled")
    
    logger.info(
        "Starting SyncSenta AI Agents FastAPI server",
        environment=config.environment,
        port=8001
    )
    
    # Start FastAPI server
    uvicorn.run(
        "syncsenta_agents.api.server:app",
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    main()
