"""
Core curriculum validation module.
"""

import logging
import asyncio
from typing import List, Optional, Dict
from datetime import datetime

from .models import (
    Topic,
    ValidationResult,
    MisalignedTopic,
    AlternativeTopic,
    ContentType,
    ValidationStatus,
)
from .cache import CurriculumCache
from .extractor import TopicExtractor

logger = logging.getLogger(__name__)


class CurriculumValidator:
    """
    Validates educational content against CBC curriculum.
    """
    
    def __init__(
        self,
        cache: CurriculumCache,
        alignment_threshold: float = 70.0,
        timeout_seconds: float = 2.0,
    ):
        """
        Initialize curriculum validator.
        
        Args:
            cache: CurriculumCache instance
            alignment_threshold: Minimum alignment score to pass (0-100)
            timeout_seconds: Maximum validation time
        """
        self.cache = cache
        self.alignment_threshold = alignment_threshold
        self.timeout_seconds = timeout_seconds
        
        # Initialize topic extractors
        self.extractor_en = TopicExtractor(language="english")
        self.extractor_sw = TopicExtractor(language="kiswahili")
        
        logger.info(f"Initialized CurriculumValidator (threshold={alignment_threshold})")
    
    def get_topic_grade_level(self, topic: str, subject: str) -> Optional[str]:
        """
        Get the earliest grade level where a topic appears.
        
        Args:
            topic: Topic name
            subject: Subject name
            
        Returns:
            Grade level or None if not found
        """
        topic_mappings = self.cache.get_topic_mapping(subject)
        return topic_mappings.get(topic.lower())
    
    async def validate_content(
        self,
        content: str,
        grade: str,
        subject: str,
        content_type: ContentType,
    ) -> ValidationResult:
        """
        Validate content against curriculum.
        
        Args:
            content: Content text to validate
            grade: Target grade level
            subject: Subject name
            content_type: Type of content
            
        Returns:
            ValidationResult with complete analysis
        """
        start_time = datetime.utcnow()
        
        try:
            # Run validation with timeout
            result = await asyncio.wait_for(
                self._validate_content_impl(content, grade, subject, content_type),
                timeout=self.timeout_seconds
            )
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            result.processing_time_ms = processing_time
            
            return result
            
        except asyncio.TimeoutError:
            logger.warning(f"Validation timeout after {self.timeout_seconds}s")
            return ValidationResult(
                status=ValidationStatus.TIMEOUT,
                alignment_score=0.0,
                grade=grade,
                subject=subject,
                content_type=content_type,
                error_message=f"Validation timeout after {self.timeout_seconds}s",
                processing_time_ms=self.timeout_seconds * 1000,
            )
        except Exception as e:
            logger.error(f"Validation error: {e}", exc_info=True)
            return ValidationResult(
                status=ValidationStatus.ERROR,
                alignment_score=0.0,
                grade=grade,
                subject=subject,
                content_type=content_type,
                error_message=str(e),
            )
    
    async def _validate_content_impl(
        self,
        content: str,
        grade: str,
        subject: str,
        content_type: ContentType,
    ) -> ValidationResult:
        """
        Internal validation implementation.
        """
        # Check if curriculum data exists
        curriculum = self.cache.get_curriculum(grade, subject)
        if curriculum is None:
            logger.warning(f"Curriculum not found for {grade} - {subject}")
            return ValidationResult(
                status=ValidationStatus.CURRICULUM_UNAVAILABLE,
                alignment_score=0.0,
                grade=grade,
                subject=subject,
                content_type=content_type,
                error_message=f"Curriculum data not available for {grade} - {subject}",
            )
        
        # Extract topics from content
        try:
            topics = self._extract_topics(content, subject)
        except Exception as e:
            logger.error(f"Topic extraction failed: {e}")
            return ValidationResult(
                status=ValidationStatus.EXTRACTION_FAILED,
                alignment_score=0.0,
                grade=grade,
                subject=subject,
                content_type=content_type,
                error_message=f"Topic extraction failed: {e}",
            )
        
        if not topics:
            # No topics found - could be non-educational content
            return ValidationResult(
                status=ValidationStatus.PASS,
                alignment_score=100.0,
                grade=grade,
                subject=subject,
                content_type=content_type,
                topics_found=[],
                cache_hit=True,
            )
        
        # Detect misalignments
        misaligned = self._detect_misalignments(topics, grade, subject)
        
        # Calculate alignment score
        alignment_score = self._calculate_alignment_score(topics, grade, subject)
        
        # Determine aligned topics
        aligned = [t for t in topics if not any(m.topic == t for m in misaligned)]
        
        # Generate alternative suggestions
        alternatives = []
        for misaligned_topic in misaligned:
            alts = self._suggest_alternatives(misaligned_topic.topic, grade, subject)
            alternatives.extend(alts)
        
        # Determine validation status
        if alignment_score >= self.alignment_threshold:
            status = ValidationStatus.PASS
        elif misaligned:
            status = ValidationStatus.FAIL
        else:
            status = ValidationStatus.WARNING
        
        return ValidationResult(
            status=status,
            alignment_score=alignment_score,
            grade=grade,
            subject=subject,
            content_type=content_type,
            topics_found=topics,
            aligned_topics=aligned,
            misaligned_topics=misaligned,
            alternative_suggestions=alternatives,
            cache_hit=True,
        )
    
    def _extract_topics(self, content: str, subject: str) -> List[Topic]:
        """Extract topics using appropriate extractor."""
        # Use Kiswahili extractor for Kiswahili subjects
        if "kiswahili" in subject.lower():
            return self.extractor_sw.extract(content, subject)
        else:
            return self.extractor_en.extract(content, subject)
    
    def _detect_misalignments(
        self,
        topics: List[Topic],
        target_grade: str,
        subject: str,
    ) -> List[MisalignedTopic]:
        """
        Detect topics that are too advanced for target grade.
        """
        misaligned = []
        grade_order = ["PP1", "PP2"] + [f"Grade {i}" for i in range(1, 7)]
        
        try:
            target_idx = grade_order.index(target_grade)
        except ValueError:
            logger.warning(f"Unknown grade: {target_grade}")
            return []
        
        for topic in topics:
            actual_grade = self.get_topic_grade_level(topic.normalized_name, subject)
            
            if actual_grade and actual_grade in grade_order:
                actual_idx = grade_order.index(actual_grade)
                
                if actual_idx > target_idx:
                    # Topic is too advanced
                    grade_gap = actual_idx - target_idx
                    misaligned.append(MisalignedTopic(
                        topic=topic,
                        actual_grade=actual_grade,
                        target_grade=target_grade,
                        grade_gap=grade_gap,
                    ))
        
        return misaligned
    
    def _calculate_alignment_score(
        self,
        topics: List[Topic],
        target_grade: str,
        subject: str,
    ) -> float:
        """
        Calculate alignment score (0-100).
        """
        if not topics:
            return 100.0
        
        grade_order = ["PP1", "PP2"] + [f"Grade {i}" for i in range(1, 7)]
        
        try:
            target_idx = grade_order.index(target_grade)
        except ValueError:
            return 0.0
        
        total_weight = 0.0
        aligned_weight = 0.0
        
        for topic in topics:
            weight = topic.confidence
            total_weight += weight
            
            actual_grade = self.get_topic_grade_level(topic.normalized_name, subject)
            
            if actual_grade and actual_grade in grade_order:
                actual_idx = grade_order.index(actual_grade)
                
                if actual_idx <= target_idx:
                    # Topic is grade-appropriate
                    aligned_weight += weight
            else:
                # Unknown topic - assume aligned
                aligned_weight += weight * 0.5
        
        if total_weight == 0:
            return 100.0
        
        score = (aligned_weight / total_weight) * 100
        return round(score, 2)
    
    def _suggest_alternatives(
        self,
        topic: Topic,
        target_grade: str,
        subject: str,
    ) -> List[AlternativeTopic]:
        """
        Suggest grade-appropriate alternatives for a misaligned topic.
        """
        alternatives = []
        
        # Get curriculum for target grade
        curriculum = self.cache.get_curriculum(target_grade, subject)
        if not curriculum:
            return []
        
        # Find related topics in target grade curriculum
        for strand in curriculum.strands[:2]:  # Limit to first 2 strands
            for sub_strand in strand.sub_strands[:3]:  # Limit to first 3 sub-strands
                if sub_strand.learning_outcomes:
                    alternatives.append(AlternativeTopic(
                        topic=sub_strand.title,
                        grade=target_grade,
                        strand=strand.title,
                        sub_strand=sub_strand.title,
                        learning_outcome=sub_strand.learning_outcomes[0],
                        reason=f"Grade-appropriate alternative from {strand.title}",
                    ))
                    
                    if len(alternatives) >= 3:
                        return alternatives
        
        return alternatives
