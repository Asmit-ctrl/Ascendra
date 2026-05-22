"""
Data models for curriculum validation system.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime


class ContentType(str, Enum):
    """Type of content being validated."""
    LESSON = "lesson"
    CONVERSATION = "conversation"
    SCHEME = "scheme"


class ValidationStatus(str, Enum):
    """Status of validation result."""
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    TIMEOUT = "timeout"
    ERROR = "error"
    CURRICULUM_UNAVAILABLE = "curriculum_unavailable"
    EXTRACTION_FAILED = "extraction_failed"


@dataclass
class Topic:
    """Represents an educational topic extracted from content."""
    name: str
    normalized_name: str
    confidence: float  # 0.0-1.0
    context: str = ""  # Surrounding text where topic was found
    section: str = ""  # Section of content (objectives, activities, assessment)


@dataclass
class SubStrandInfo:
    """Information about a curriculum sub-strand."""
    title: str
    learning_outcomes: List[str]
    suggested_activities: List[str] = field(default_factory=list)
    key_inquiry_questions: List[str] = field(default_factory=list)


@dataclass
class StrandInfo:
    """Information about a curriculum strand."""
    title: str
    sub_strands: List[SubStrandInfo]


@dataclass
class CurriculumData:
    """Complete curriculum data for a grade-subject combination."""
    grade: str
    subject: str
    strands: List[StrandInfo]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AlternativeTopic:
    """Grade-appropriate alternative to a misaligned topic."""
    topic: str
    grade: str
    strand: str
    sub_strand: str
    learning_outcome: str
    reason: str  # Why this is a good alternative


@dataclass
class MisalignedTopic:
    """Topic that doesn't align with target grade level."""
    topic: Topic
    actual_grade: str
    target_grade: str
    grade_gap: int  # How many grades too advanced
    strand: Optional[str] = None
    sub_strand: Optional[str] = None


@dataclass
class ValidationResult:
    """Complete result of content validation."""
    status: ValidationStatus
    alignment_score: float  # 0-100
    grade: str
    subject: str
    content_type: ContentType
    
    # Topics found
    topics_found: List[Topic] = field(default_factory=list)
    aligned_topics: List[Topic] = field(default_factory=list)
    misaligned_topics: List[MisalignedTopic] = field(default_factory=list)
    
    # Suggestions
    alternative_suggestions: List[AlternativeTopic] = field(default_factory=list)
    
    # Metadata
    processing_time_ms: float = 0.0
    cache_hit: bool = False
    timestamp: datetime = field(default_factory=datetime.utcnow)
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "status": self.status.value,
            "alignment_score": self.alignment_score,
            "grade": self.grade,
            "subject": self.subject,
            "content_type": self.content_type.value,
            "topics_found": [
                {
                    "name": t.name,
                    "normalized_name": t.normalized_name,
                    "confidence": t.confidence,
                    "context": t.context,
                    "section": t.section,
                }
                for t in self.topics_found
            ],
            "aligned_topics": [
                {
                    "name": t.name,
                    "normalized_name": t.normalized_name,
                    "confidence": t.confidence,
                }
                for t in self.aligned_topics
            ],
            "misaligned_topics": [
                {
                    "topic": mt.topic.name,
                    "actual_grade": mt.actual_grade,
                    "target_grade": mt.target_grade,
                    "grade_gap": mt.grade_gap,
                    "strand": mt.strand,
                    "sub_strand": mt.sub_strand,
                }
                for mt in self.misaligned_topics
            ],
            "alternative_suggestions": [
                {
                    "topic": alt.topic,
                    "grade": alt.grade,
                    "strand": alt.strand,
                    "sub_strand": alt.sub_strand,
                    "learning_outcome": alt.learning_outcome,
                    "reason": alt.reason,
                }
                for alt in self.alternative_suggestions
            ],
            "processing_time_ms": self.processing_time_ms,
            "cache_hit": self.cache_hit,
            "timestamp": self.timestamp.isoformat(),
            "error_message": self.error_message,
        }
