from __future__ import annotations

import json
import os
import urllib.request
from typing import Any, Dict

COACHING_KEYS = {
    'technical_accuracy',
    'completeness',
    'answer_quality',
    'missing_concepts',
    'strengths',
    'weaknesses',
    'coaching',
    'improved_answer',
}


def generate_coaching(question: str, answer: str, metrics: Dict[str, Any], expected_concepts: list[str] | None = None) -> Dict[str, Any]:
    """Use Gemini when configured, otherwise use a deterministic local coaching response."""
    provider = os.getenv('COACHING_PROVIDER', 'local').lower()
    if provider == 'gemini' and os.getenv('GEMINI_API_KEY'):
        try:
            return {'provider': 'gemini', **_gemini_coaching(question, answer, metrics, expected_concepts or [])}
        except Exception as exc:
            return {'provider': 'local-fallback', 'error': str(exc), **_local_coaching(question, answer, metrics, expected_concepts or [])}

    return {'provider': 'local', **_local_coaching(question, answer, metrics, expected_concepts or [])}


def _local_coaching(question: str, answer: str, metrics: Dict[str, Any], expected_concepts: list[str]) -> Dict[str, Any]:
    strengths = []
    improvements = []
    clarity = float(metrics.get('clarity', 0) or 0)
    relevance = float(metrics.get('relevance_score', 0) or 0)
    pace = float(metrics.get('wpm', 0) or 0)
    fillers = float(metrics.get('fillers', 0) or 0)
    measured_completeness = float(metrics.get('completeness', 0) or 0)
    answer_word_count = len((answer or '').split())
    completeness = max(0.0, min(100.0, measured_completeness or min(100.0, answer_word_count * 4.0)))
    answer_quality = round((clarity * 0.35) + (relevance * 0.4) + (completeness * 0.25))
    answer_words = set((answer or '').lower().split())
    missing_concepts = [concept for concept in expected_concepts if not set(concept.lower().split()).issubset(answer_words)]

    if clarity >= 70:
        strengths.append('Speech was clear and understandable.')
    else:
        improvements.append('Improve articulation and sentence clarity.')
    if relevance >= 70:
        strengths.append('The answer stayed relevant to the question.')
    else:
        improvements.append('Connect the answer more directly to the question.')
    if 90 <= pace <= 150:
        strengths.append('Speaking pace was within the interview-safe range.')
    else:
        improvements.append('Adjust speaking pace toward 90-150 words per minute.')
    if fillers > 3:
        improvements.append('Reduce filler words by pausing before important points.')

    if not strengths:
        strengths.append('The candidate completed the response and provided usable material for review.')
    if missing_concepts:
        improvements.append(f'Cover the missing concepts: {", ".join(missing_concepts)}.')
    if not improvements:
        improvements.append('Maintain the current delivery and add specific examples where possible.')

    return {
        'technical_accuracy': round((relevance + clarity) / 2),
        'completeness': round(completeness),
        'answer_quality': answer_quality,
        'missing_concepts': missing_concepts,
        'strengths': strengths,
        'weaknesses': improvements,
        'coaching': f'Communication and content were evaluated from the completed session. Relevance score: {round(relevance)}/100.',
        'improved_answer': answer or 'No answer transcript was available for improvement.',
        'summary': f'Communication and content were evaluated from the completed session transcript and metric history. Relevance score: {round(relevance)}/100.',
        'improvements': improvements,
    }


def _gemini_coaching(question: str, answer: str, metrics: Dict[str, Any], expected_concepts: list[str]) -> Dict[str, Any]:
    api_key = os.environ['GEMINI_API_KEY']
    model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
    endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    prompt = {
        'contents': [{
            'parts': [{
                'text': (
                    'Act as an interview coach. Return only valid JSON with exactly these keys: '
                    'technical_accuracy (number 0-100), completeness (number 0-100), '
                    'answer_quality (number 0-100), missing_concepts (array of strings), '
                    'strengths (array of strings), weaknesses (array of strings), '
                    'coaching (string), improved_answer (string). '
                    'Do not invent facts or concepts. Evaluate only the supplied interview context.\n'
                    f'Question: {question}\nAnswer/transcript: {answer}\n'
                    f'Expected concepts: {json.dumps(expected_concepts)}\n'
                    f'Measured context: {json.dumps(metrics)}'
                ),
            }],
        }],
        'generationConfig': {
            'responseMimeType': 'application/json',
            'responseSchema': {
                'type': 'OBJECT',
                'properties': {
                    'technical_accuracy': {'type': 'NUMBER'},
                    'completeness': {'type': 'NUMBER'},
                    'answer_quality': {'type': 'NUMBER'},
                    'missing_concepts': {'type': 'ARRAY', 'items': {'type': 'STRING'}},
                    'strengths': {'type': 'ARRAY', 'items': {'type': 'STRING'}},
                    'weaknesses': {'type': 'ARRAY', 'items': {'type': 'STRING'}},
                    'coaching': {'type': 'STRING'},
                    'improved_answer': {'type': 'STRING'},
                },
                'required': list(COACHING_KEYS),
            },
        },
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(prompt).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode('utf-8'))
    text = payload['candidates'][0]['content']['parts'][0]['text']
    return validate_coaching(json.loads(text))


def validate_coaching(result: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize model output before it crosses the service boundary."""
    if not isinstance(result, dict) or not COACHING_KEYS.issubset(result):
        raise ValueError('Gemini response does not match the structured coaching schema')

    def score(value: Any) -> int:
        return round(max(0, min(100, float(value))))

    def strings(value: Any) -> list[str]:
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise ValueError('Structured coaching arrays must contain strings')
        return [item.strip() for item in value if item.strip()]

    return {
        'technical_accuracy': score(result['technical_accuracy']),
        'completeness': score(result['completeness']),
        'answer_quality': score(result['answer_quality']),
        'missing_concepts': strings(result['missing_concepts']),
        'strengths': strings(result['strengths']),
        'weaknesses': strings(result['weaknesses']),
        'coaching': str(result['coaching']).strip(),
        'improved_answer': str(result['improved_answer']).strip(),
        'summary': str(result['coaching']).strip(),
        'improvements': strings(result['weaknesses']),
    }
