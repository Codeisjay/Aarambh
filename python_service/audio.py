from __future__ import annotations

import math
from typing import Dict, Any


def normalize_audio_features(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize audio-derived metrics before they are handed to the backend."""
    pace = float(payload.get('wpm', 0) or 0)
    clarity = float(payload.get('clarity', 0) or 0)
    energy = float(payload.get('energy', 0) or 0)
    pause_duration = float(payload.get('pause_duration', 0) or 0)
    filler_count = float(payload.get('filler_count', 0) or 0)

    return {
        'wpm': max(0.0, min(220.0, pace)),
        'clarity': max(0.0, min(100.0, clarity)),
        'energy': max(0.0, min(100.0, energy)),
        'pause_duration': max(0.0, pause_duration),
        'filler_count': max(0.0, filler_count),
        'audio_quality': 'stable' if clarity >= 70 else 'needs-improvement',
    }


def estimate_speech_latency(duration_seconds: float, words: int) -> float:
    if duration_seconds <= 0 or words <= 0:
        return 0.0
    return round((duration_seconds / words) * 60.0, 2)


def compute_word_confidence(words: list[str]) -> float:
    if not words:
        return 0.0
    return round(min(100.0, 72.0 + (len(words) * 1.2)), 2)
