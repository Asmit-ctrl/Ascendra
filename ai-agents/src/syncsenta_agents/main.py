"""Main entry point for SyncSenta AI Agents system."""

import uvicorn
from .core.config import config
from .core.logging import configure_logging, get_logger


def main() -> None:
    """Main application entry point - starts the FastAPI server."""
    
    # Configure logging
    configure_logging(debug=config.debug)
    logger = get_logger("main")
    
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
