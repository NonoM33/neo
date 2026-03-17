"""
Parakeet TDT 0.6B V3 - OpenAI-compatible ASR API server
NVIDIA's multilingual ASR model (25 European languages including French)
"""

import io
import os
import tempfile
import logging
from typing import Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Neo Parakeet ASR", version="1.0.0")

# Lazy-load model
_model = None

def get_model():
    global _model
    if _model is None:
        logger.info("Loading Parakeet TDT 0.6B V3 model...")
        import nemo.collections.asr as nemo_asr
        _model = nemo_asr.models.ASRModel.from_pretrained("nvidia/parakeet-tdt-0.6b-v3")
        logger.info("Model loaded successfully!")
    return _model


@app.get("/health")
async def health():
    return {"status": "ok", "model": "parakeet-tdt-0.6b-v3"}


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    response_format: Optional[str] = Form("json"),
):
    """
    OpenAI-compatible transcription endpoint.
    Accepts audio file, returns transcription.
    """
    try:
        # Read uploaded audio
        audio_bytes = await file.read()

        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        # Save to temp file (NeMo needs a file path)
        suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Transcribe
            asr_model = get_model()
            transcriptions = asr_model.transcribe([tmp_path])

            # Handle different NeMo output formats
            if isinstance(transcriptions, list):
                if len(transcriptions) > 0:
                    text = transcriptions[0] if isinstance(transcriptions[0], str) else str(transcriptions[0])
                else:
                    text = ""
            elif hasattr(transcriptions, 'text'):
                text = transcriptions.text[0] if isinstance(transcriptions.text, list) else transcriptions.text
            else:
                text = str(transcriptions)

            # Get audio duration
            try:
                audio_data, sample_rate = sf.read(tmp_path)
                duration = len(audio_data) / sample_rate if sample_rate > 0 else 0
            except Exception:
                duration = 0

        finally:
            os.unlink(tmp_path)

        # Return in OpenAI-compatible format
        if response_format == "verbose_json":
            return JSONResponse({
                "text": text.strip(),
                "language": language or "fr",
                "duration": round(duration, 2),
            })
        else:
            return JSONResponse({"text": text.strip()})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.on_event("startup")
async def startup():
    """Pre-load model on startup."""
    logger.info("Starting Parakeet ASR server...")
    try:
        get_model()
    except Exception as e:
        logger.warning(f"Model pre-loading failed (will retry on first request): {e}")
