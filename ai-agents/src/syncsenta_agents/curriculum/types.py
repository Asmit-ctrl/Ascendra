"""Curriculum data types ported from scheme-scribe-ai/src/data/curriculum/types.ts."""

from __future__ import annotations

from typing import List, Optional, TypedDict


class SubStrandInfo(TypedDict, total=False):
    name: str
    lessons: int
    learningOutcomes: List[str]
    suggestedExperiences: List[str]
    keyInquiryQuestion: str


class StrandInfo(TypedDict):
    name: str
    subStrands: List[SubStrandInfo]


class SchemeRow(TypedDict):
    week: int
    lesson: int
    strand: str
    subStrand: str
    specificLearningOutcome: str
    keyInquiryQuestion: str
    learningExperiences: str
    learningResources: str
    assessmentMethods: str
    reflection: str


__all__ = ["SubStrandInfo", "StrandInfo", "SchemeRow"]
