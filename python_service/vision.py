from __future__ import annotations

from typing import Dict, Any


def normalize_face_metrics(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize computer-vision metrics before sending them to the backend."""
    eye_contact = float(payload.get('eye_contact', 0) or 0)
    blink_rate = float(payload.get('blink_rate', 0) or 0)
    head_stability = float(payload.get('head_stability', 0) or 0)
    smile_score = float(payload.get('smile_score', 0) or 0)
    face_centered = bool(payload.get('face_centered', True))

    return {
        'eyeContact': max(0.0, min(100.0, eye_contact)),
        'blinkRate': max(0.0, min(60.0, blink_rate)),
        'headStability': max(0.0, min(100.0, head_stability)),
        'smileScore': max(0.0, min(100.0, smile_score)),
        'faceCentered': face_centered,
        'body_language_signal': 'positive' if head_stability >= 75 and eye_contact >= 70 else 'watch',
    }


def build_behavior_summary(metrics: Dict[str, Any]) -> str:
    eye = metrics.get('eyeContact', 0)
    head = metrics.get('headStability', 0)
    blink = metrics.get('blinkRate', 0)

    if eye >= 80 and head >= 80 and blink <= 25:
        return 'Strong composure and confident eye engagement.'
    if eye < 60:
        return 'Focus on maintaining eye contact with the camera.'
    if head < 70:
        return 'Keep your head steady to appear more composed.'
    if blink > 25:
        return 'Your blink pattern suggests nervousness; take a calmer breath.'
    return 'Behavioral signals are generally stable.'
