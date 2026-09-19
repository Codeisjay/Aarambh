# ARAMBH Python AI Services

This package contains the dedicated transformer-based AI services required for the multimodal interview pipeline.

## Services
- whisper_service.py: speech-to-text transcription
- relevance_service.py: semantic relevance scoring between answer text and question
- audio.py: audio preprocessing utilities
- vision.py: interview vision and face signal helpers

## Mandatory model responsibility split
- Whisper: transcription only
- Sentence-BERT: semantic relevance and answer similarity only
- Gemini / Qwen: final coaching and report narrative only
- CV module: eye-contact, blink, head stability, confidence signals

## Integration notes
Run the real transformer API with:

```bash
pip install -r requirements.txt
python ai_server.py
```

Endpoints:
- `POST /api/transcribe`: Faster-Whisper transcription for an uploaded audio file
- `POST /api/analyze`: Sentence-BERT relevance plus Gemini/local coaching

Set `AI_SERVICE_URL=http://127.0.0.1:5100` in the backend environment. Set `COACHING_PROVIDER=gemini` and `GEMINI_API_KEY` to enable Gemini coaching; otherwise the service uses a deterministic local coaching adapter.
