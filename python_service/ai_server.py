from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from coaching_service import generate_coaching
from relevance_service import semantic_relevance_score
from whisper_service import transcribe_file

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.get('/')
def index():
    return jsonify({
        'service': 'Aarambh AI transformer service',
        'status': 'running',
        'endpoints': {
            'health': 'GET /api/health',
            'analyze': 'POST /api/analyze',
            'transcribe': 'POST /api/transcribe',
        },
    })


def analyze_answer(payload: Dict[str, Any]) -> Dict[str, Any]:
    question = payload.get('question', '')
    answer = payload.get('answer', '')
    metrics = payload.get('metrics') or {}
    expected_concepts = payload.get('expected_concepts') or []
    relevance = semantic_relevance_score(question, answer)
    enriched_metrics = {**metrics, 'relevance_score': relevance['relevance_score']}
    coaching = generate_coaching(question, answer, enriched_metrics, expected_concepts)
    return {
        'success': True,
        'models': {
            'relevance': relevance.get('model', 'sentence-transformers/all-MiniLM-L6-v2'),
            'coaching': coaching.get('provider', 'local'),
        },
        'relevance': relevance,
        'coaching': coaching,
    }


@app.get('/api/health')
def health():
    return jsonify({'success': True, 'service': 'Aarambh AI transformer service'})


@app.post('/api/analyze')
def analyze():
    return jsonify(analyze_answer(request.get_json(silent=True) or {}))


@app.post('/api/transcribe')
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'success': False, 'message': 'audio file is required'}), 400
    upload = request.files['audio']
    temp_dir = Path(os.getenv('AI_TEMP_DIR', 'tmp'))
    temp_dir.mkdir(parents=True, exist_ok=True)
    target = temp_dir / upload.filename
    upload.save(target)
    try:
        return jsonify({'success': True, **transcribe_file(str(target))})
    finally:
        target.unlink(missing_ok=True)


if __name__ == '__main__':
    app.run(host=os.getenv('AI_HOST', '127.0.0.1'), port=int(os.getenv('AI_PORT', '5100')), debug=False)
