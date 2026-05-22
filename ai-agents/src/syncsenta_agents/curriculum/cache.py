"""
Curriculum cache module for fast curriculum data access.
"""

import os
import json
import logging
from functools import lru_cache
from typing import Dict, Optional, List, Tuple
from pathlib import Path
import importlib.util
import sys

from .models import CurriculumData, StrandInfo, SubStrandInfo

logger = logging.getLogger(__name__)


class CurriculumCache:
    """
    In-memory cache for curriculum data with fast lookup.
    
    Loads curriculum data from TypeScript files and provides
    fast access to curriculum structures and topic mappings.
    """
    
    def __init__(self, curriculum_dir: str):
        """
        Initialize curriculum cache.
        
        Args:
            curriculum_dir: Path to directory containing curriculum files
        """
        self.curriculum_dir = Path(curriculum_dir)
        self.curriculum_data: Dict[Tuple[str, str], CurriculumData] = {}
        self.topic_mappings: Dict[Tuple[str, str], str] = {}  # (subject, topic) -> earliest_grade
        self._loaded = False
        logger.info(f"Initialized CurriculumCache with directory: {curriculum_dir}")
    
    def load_curriculum(self) -> None:
        """
        Load all curriculum data from files.
        
        Parses curriculum files and builds topic mappings.
        """
        if self._loaded:
            logger.info("Curriculum already loaded, skipping")
            return
        
        logger.info("Loading curriculum data...")
        
        try:
            # For now, we'll load from the TypeScript curriculum files
            # In production, these should be converted to JSON or Python modules
            curriculum_files = list(self.curriculum_dir.glob("*.ts"))
            logger.info(f"Found {len(curriculum_files)} curriculum files")
            
            for file_path in curriculum_files:
                try:
                    self._load_curriculum_file(file_path)
                except Exception as e:
                    logger.error(f"Error loading {file_path}: {e}")
            
            # Build topic mappings after all curriculum loaded
            self._build_topic_mappings()
            
            self._loaded = True
            logger.info(f"Successfully loaded curriculum for {len(self.curriculum_data)} grade-subject combinations")
            logger.info(f"Built topic mappings for {len(self.topic_mappings)} topics")
            
        except Exception as e:
            logger.error(f"Error loading curriculum: {e}")
            raise
    
    def _load_curriculum_file(self, file_path: Path) -> None:
        """
        Load curriculum data from a single file.
        
        Args:
            file_path: Path to curriculum file
        """
        # Parse filename to extract grade and subject
        # Format: gradeX-subject-name.ts
        filename = file_path.stem
        parts = filename.split("-")
        
        if len(parts) < 2:
            logger.warning(f"Skipping file with invalid name format: {filename}")
            return
        
        grade = parts[0]  # e.g., "grade2", "pp1"
        subject = "-".join(parts[1:])  # e.g., "kiswahili-language-activities"
        
        # Normalize grade format
        grade_normalized = self._normalize_grade(grade)
        
        logger.debug(f"Loading curriculum for {grade_normalized} - {subject}")
        
        # For MVP, we'll create placeholder curriculum data
        # In production, parse the actual TypeScript files or convert to JSON
        curriculum = CurriculumData(
            grade=grade_normalized,
            subject=subject,
            strands=[],
            metadata={"source_file": str(file_path)}
        )
        
        self.curriculum_data[(grade_normalized, subject)] = curriculum
    
    def _normalize_grade(self, grade: str) -> str:
        """
        Normalize grade format.
        
        Args:
            grade: Raw grade string (e.g., "grade2", "pp1")
            
        Returns:
            Normalized grade string (e.g., "Grade 2", "PP1")
        """
        grade = grade.lower()
        
        if grade.startswith("pp"):
            return grade.upper()  # PP1, PP2
        elif grade.startswith("grade"):
            num = grade.replace("grade", "")
            return f"Grade {num}"
        
        return grade
    
    def _build_topic_mappings(self) -> None:
        """
        Build topic-to-grade mappings from loaded curriculum data.
        
        Creates a mapping of (subject, topic) -> earliest_grade.
        """
        logger.info("Building topic mappings...")
        
        # Sort curriculum by grade level for proper ordering
        grade_order = ["PP1", "PP2"] + [f"Grade {i}" for i in range(1, 7)]
        
        for (grade, subject), curriculum in sorted(
            self.curriculum_data.items(),
            key=lambda x: grade_order.index(x[0][0]) if x[0][0] in grade_order else 999
        ):
            for strand in curriculum.strands:
                for sub_strand in strand.sub_strands:
                    # Extract topic from sub-strand title
                    topic = self._extract_topic_from_title(sub_strand.title)
                    
                    if topic:
                        key = (subject, topic.lower())
                        
                        # Only store if this is the earliest grade for this topic
                        if key not in self.topic_mappings:
                            self.topic_mappings[key] = grade
                            logger.debug(f"Mapped topic '{topic}' in {subject} to {grade}")
    
    def _extract_topic_from_title(self, title: str) -> Optional[str]:
        """
        Extract topic name from sub-strand title.
        
        Args:
            title: Sub-strand title (e.g., "1.4.1 Nomino")
            
        Returns:
            Topic name or None
        """
        # Remove numbering (e.g., "1.4.1 ")
        parts = title.split(" ", 1)
        if len(parts) > 1:
            return parts[1].strip()
        return None
    
    @lru_cache(maxsize=128)
    def get_curriculum(self, grade: str, subject: str) -> Optional[CurriculumData]:
        """
        Get curriculum data for a grade-subject combination.
        
        Args:
            grade: Grade level (e.g., "Grade 2", "PP1")
            subject: Subject name
            
        Returns:
            CurriculumData or None if not found
        """
        key = (grade, subject)
        curriculum = self.curriculum_data.get(key)
        
        if curriculum is None:
            logger.warning(f"Curriculum not found for {grade} - {subject}")
        
        return curriculum
    
    @lru_cache(maxsize=256)
    def get_topic_mapping(self, subject: str) -> Dict[str, str]:
        """
        Get topic-to-grade mappings for a subject.
        
        Args:
            subject: Subject name
            
        Returns:
            Dictionary mapping topic names to earliest grade
        """
        mappings = {}
        
        for (subj, topic), grade in self.topic_mappings.items():
            if subj == subject:
                mappings[topic] = grade
        
        return mappings
    
    def get_strands(self, grade: str, subject: str) -> List[StrandInfo]:
        """
        Get strands for a grade-subject combination.
        
        Args:
            grade: Grade level
            subject: Subject name
            
        Returns:
            List of StrandInfo objects
        """
        curriculum = self.get_curriculum(grade, subject)
        
        if curriculum:
            return curriculum.strands
        
        return []
    
    def invalidate(self) -> None:
        """
        Invalidate cache and reload curriculum data.
        """
        logger.info("Invalidating curriculum cache...")
        
        # Clear cached data
        self.curriculum_data.clear()
        self.topic_mappings.clear()
        self._loaded = False
        
        # Clear LRU caches
        self.get_curriculum.cache_clear()
        self.get_topic_mapping.cache_clear()
        
        # Reload
        self.load_curriculum()
        
        logger.info("Cache invalidated and reloaded")
