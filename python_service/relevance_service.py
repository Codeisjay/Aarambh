from __future__ import annotations

import os
from typing import Dict, Any

_MODEL = None


def _get_model():
    global _MODEL
    if _MODEL is None:
        os.environ.setdefault('USE_TF', '0')
        os.environ.setdefault('TRANSFORMERS_NO_TF', '1')
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    return _MODEL


def semantic_relevance_score(question: str, answer: str) -> Dict[str, Any]:
    """Sentence-BERT role: compare the answer against the expected question semantics only."""
    q = (question or '').lower().strip()
    a = (answer or '').lower().strip()

    if not q or not a:
        return {'relevance_score': 0.0, 'matched_keywords': [], 'status': 'insufficient-input'}

    q_words = set(w for w in q.replace('?', '').replace(',', '').split() if len(w) > 2)
    a_words = set(w for w in a.replace('?', '').replace(',', '').split() if len(w) > 2)
    overlap = sorted(q_words & a_words)
    model = _get_model()
    embeddings = model.encode([q, a], normalize_embeddings=True)
    similarity = float(embeddings[0] @ embeddings[1]) * 100.0

    return {
        'relevance_score': round(max(0.0, min(100.0, similarity)), 2),
        'matched_keywords': overlap,
        'model': 'sentence-transformers/all-MiniLM-L6-v2',
        'status': 'scored',
    }


def build_relevance_summary(question: str, answer: str) -> str:
    result = semantic_relevance_score(question, answer)
    score = result['relevance_score']
    if score >= 80:
        return 'The answer is strongly aligned with the question and shows clear topic coverage.'
    if score >= 60:
        return 'The answer is relevant but could be more targeted to the question.'
    return 'The answer needs stronger alignment with the interview question.'
