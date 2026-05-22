"""
Topic extraction module using NLP.
"""

import re
import logging
from typing import List, Dict, Set
from difflib import SequenceMatcher

from .models import Topic

logger = logging.getLogger(__name__)


class TopicExtractor:
    """
    Extracts educational topics from content using keyword matching and patterns.
    """
    
    def __init__(self, language: str = "english"):
        """
        Initialize topic extractor.
        
        Args:
            language: Language for extraction (english, kiswahili)
        """
        self.language = language
        self._init_keyword_dictionaries()
        logger.info(f"Initialized TopicExtractor for {language}")
    
    def _init_keyword_dictionaries(self) -> None:
        """Initialize subject-specific keyword dictionaries."""
        
        # Kiswahili grammar topics
        self.kiswahili_grammar = {
            "nomino": ["nomino", "nouns", "majina"],
            "nomino za makundi": ["nomino za makundi", "collective nouns", "makundi"],
            "vitenzi": ["vitenzi", "verbs", "vitendo"],
            "vivumishi": ["vivumishi", "adjectives", "sifa"],
            "vielezi": ["vielezi", "adverbs"],
            "silabi": ["silabi", "syllables"],
            "sauti": ["sauti", "sounds", "phonics"],
            "sentensi": ["sentensi", "sentences"],
            "herufi": ["herufi", "letters"],
            "matamshi": ["matamshi", "pronunciation"],
            "ufahamu": ["ufahamu", "comprehension"],
            "ufasaha": ["ufasaha", "fluency"],
        }
        
        # Mathematics topics
        self.mathematics = {
            "addition": ["addition", "kuongeza", "add", "plus"],
            "subtraction": ["subtraction", "kutoa", "subtract", "minus"],
            "multiplication": ["multiplication", "kuzidisha", "multiply", "times"],
            "division": ["division", "kugawanya", "divide"],
            "fractions": ["fractions", "sehemu", "fraction"],
            "decimals": ["decimals", "desimali"],
            "geometry": ["geometry", "jiometri", "shapes", "maumbo"],
            "measurement": ["measurement", "kipimo", "measure"],
            "algebra": ["algebra", "aljebra", "equations"],
            "patterns": ["patterns", "mifuatano", "pattern"],
        }
        
        # English grammar topics
        self.english_grammar = {
            "nouns": ["nouns", "noun"],
            "collective nouns": ["collective nouns", "collective noun"],
            "verbs": ["verbs", "verb"],
            "adjectives": ["adjectives", "adjective"],
            "adverbs": ["adverbs", "adverb"],
            "pronouns": ["pronouns", "pronoun"],
            "prepositions": ["prepositions", "preposition"],
            "conjunctions": ["conjunctions", "conjunction"],
            "tenses": ["tenses", "tense", "past tense", "present tense", "future tense"],
            "phonics": ["phonics", "sounds", "letters"],
        }
        
        # Combine all dictionaries
        self.all_topics = {
            **self.kiswahili_grammar,
            **self.mathematics,
            **self.english_grammar,
        }
    
    def extract(self, content: str, subject: str) -> List[Topic]:
        """
        Extract topics from content.
        
        Args:
            content: Text content to analyze
            subject: Subject name for context
            
        Returns:
            List of extracted Topic objects
        """
        content_lower = content.lower()
        topics = []
        seen_topics = set()
        
        # Extract topics using keyword matching
        for topic_name, keywords in self.all_topics.items():
            for keyword in keywords:
                if keyword in content_lower:
                    # Find context around the keyword
                    context = self._extract_context(content, keyword)
                    
                    # Determine section
                    section = self._determine_section(content, keyword)
                    
                    # Calculate confidence based on keyword specificity
                    confidence = self._calculate_confidence(keyword, content_lower)
                    
                    # Normalize topic name
                    normalized = self.normalize_topic(topic_name, subject)
                    
                    if normalized not in seen_topics:
                        topics.append(Topic(
                            name=topic_name,
                            normalized_name=normalized,
                            confidence=confidence,
                            context=context,
                            section=section
                        ))
                        seen_topics.add(normalized)
                        break  # Found this topic, move to next
        
        logger.info(f"Extracted {len(topics)} topics from content")
        return topics
    
    def _extract_context(self, content: str, keyword: str, window: int = 100) -> str:
        """
        Extract context around a keyword.
        
        Args:
            content: Full content
            keyword: Keyword to find
            window: Characters before/after keyword
            
        Returns:
            Context string
        """
        content_lower = content.lower()
        keyword_lower = keyword.lower()
        
        pos = content_lower.find(keyword_lower)
        if pos == -1:
            return ""
        
        start = max(0, pos - window)
        end = min(len(content), pos + len(keyword) + window)
        
        context = content[start:end].strip()
        
        # Add ellipsis if truncated
        if start > 0:
            context = "..." + context
        if end < len(content):
            context = context + "..."
        
        return context
    
    def _determine_section(self, content: str, keyword: str) -> str:
        """
        Determine which section of content contains the keyword.
        
        Args:
            content: Full content
            keyword: Keyword to locate
            
        Returns:
            Section name (objectives, activities, assessment, other)
        """
        content_lower = content.lower()
        keyword_pos = content_lower.find(keyword.lower())
        
        if keyword_pos == -1:
            return "other"
        
        # Look for section headers before the keyword
        before_keyword = content_lower[:keyword_pos]
        
        if "objective" in before_keyword[-200:]:
            return "objectives"
        elif "activit" in before_keyword[-200:]:
            return "activities"
        elif "assessment" in before_keyword[-200:] or "evaluation" in before_keyword[-200:]:
            return "assessment"
        
        return "other"
    
    def _calculate_confidence(self, keyword: str, content: str) -> float:
        """
        Calculate confidence score for topic extraction.
        
        Args:
            keyword: Matched keyword
            content: Full content
            
        Returns:
            Confidence score (0.0-1.0)
        """
        # Base confidence
        confidence = 0.7
        
        # Increase confidence for longer, more specific keywords
        if len(keyword) > 10:
            confidence += 0.2
        elif len(keyword) > 5:
            confidence += 0.1
        
        # Increase confidence if keyword appears multiple times
        count = content.count(keyword)
        if count > 2:
            confidence += 0.1
        
        return min(1.0, confidence)
    
    def normalize_topic(self, topic: str, subject: str) -> str:
        """
        Normalize topic name to match curriculum terminology.
        
        Args:
            topic: Raw topic name
            subject: Subject for context
            
        Returns:
            Normalized topic name
        """
        topic_lower = topic.lower().strip()
        
        # Direct mapping for known topics
        if topic_lower in self.all_topics:
            return topic_lower
        
        # Fuzzy matching for similar terms
        best_match = None
        best_ratio = 0.0
        
        for known_topic in self.all_topics.keys():
            ratio = SequenceMatcher(None, topic_lower, known_topic).ratio()
            if ratio > best_ratio and ratio > 0.8:
                best_ratio = ratio
                best_match = known_topic
        
        if best_match:
            return best_match
        
        return topic_lower
