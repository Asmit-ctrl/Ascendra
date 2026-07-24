"""Dependency-free lexical retrieval for small teacher document collections.

Teacher-uploaded documents are chunked in-memory for a request, then the most
relevant chunks are selected for the LLM prompt. This keeps source material
grounded without requiring a vector database for the presentation prototype.
"""

from __future__ import annotations

import re
from typing import List


def retrieve_relevant_chunks(text: str, query: str, *, limit: int = 5) -> List[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []
    chunks = [normalized[i:i + 1200] for i in range(0, len(normalized), 1000)]
    terms = set(re.findall(r"[a-zA-Z]{3,}", query.lower()))
    ranked = sorted(
        ((sum(chunk.lower().count(term) for term in terms), index, chunk)
         for index, chunk in enumerate(chunks)),
        key=lambda item: (-item[0], item[1]),
    )
    selected = [chunk for _, _, chunk in ranked[:limit]]
    return selected or chunks[:limit]
