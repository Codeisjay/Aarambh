from __future__ import annotations

from typing import Dict, Any

_MODEL = None


def _get_model():
    global _MODEL
    if _MODEL is None:
        from faster_whisper import WhisperModel
        _MODEL = WhisperModel(
            'small',
            device='cuda' if __import__('os').getenv('WHISPER_DEVICE') == 'cuda' else 'cpu',
            compute_type=__import__('os').getenv('WHISPER_COMPUTE_TYPE', 'int8'),
        )
    return _MODEL


def transcribe_audio(audio_text: str) -> Dict[str, Any]:
    """Speech-to-text stage. This should delegate to Whisper in production and remains transcription-only."""
    normalized = (audio_text or '').strip()
    if not normalized:
        return {
            'transcript': '',
            'confidence': 0.0,
            'segments': [],
            'status': 'empty',
        }

    words = normalized.split()
    return {
        'transcript': normalized,
        'confidence': 0.92 if len(words) > 0 else 0.0,
        'segments': [{'text': normalized, 'start': 0, 'end': max(1, len(words) // 2)}],
        'status': 'transcribed',
    }


def normalize_transcript(text: str) -> str:
    return ' '.join((text or '').split())


def transcribe_file(audio_path: str) -> Dict[str, Any]:
    """Real Whisper transcription for uploaded audio files."""
    model = _get_model()
    segments, info = model.transcribe(audio_path, beam_size=5)
    segment_list = []
    transcript_parts = []
    for segment in segments:
        text = normalize_transcript(segment.text)
        if text:
            transcript_parts.append(text)
            segment_list.append({'text': text, 'start': segment.start, 'end': segment.end})
    return {
        'transcript': ' '.join(transcript_parts),
        'language': info.language,
        'language_probability': info.language_probability,
        'segments': segment_list,
        'status': 'transcribed',
        'model': 'faster-whisper/small',
    }
