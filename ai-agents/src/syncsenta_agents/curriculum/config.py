"""
Configuration for curriculum validation system.
"""

import os
from typing import Optional


class ValidationConfig:
    """Configuration settings for curriculum validation."""
    
    def __init__(self):
        """Load configuration from environment variables."""
        
        # Curriculum data directory
        self.curriculum_dir = os.getenv(
            "CURRICULUM_DATA_DIR",
            "/workspace/Ascendra/studio/src/curriculum"
        )
        
        # Validation thresholds
        self.alignment_threshold = float(os.getenv("VALIDATION_ALIGNMENT_THRESHOLD", "70.0"))
        self.timeout_seconds = float(os.getenv("VALIDATION_TIMEOUT_SECONDS", "2.0"))
        
        # Feature flags
        self.enable_validation = os.getenv("ENABLE_CURRICULUM_VALIDATION", "true").lower() == "true"
        self.enable_logging = os.getenv("ENABLE_VALIDATION_LOGGING", "true").lower() == "true"
        self.enable_auto_regeneration = os.getenv("ENABLE_AUTO_REGENERATION", "true").lower() == "true"
        
        # Performance settings
        self.cache_ttl_seconds = int(os.getenv("VALIDATION_CACHE_TTL", "60"))
        self.max_regeneration_attempts = int(os.getenv("MAX_REGENERATION_ATTEMPTS", "3"))
    
    def __repr__(self) -> str:
        return (
            f"ValidationConfig("
            f"curriculum_dir={self.curriculum_dir}, "
            f"alignment_threshold={self.alignment_threshold}, "
            f"enable_validation={self.enable_validation})"
        )


# Global config instance
config = ValidationConfig()
