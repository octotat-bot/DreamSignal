import os
import tempfile
import requests
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from pydub import AudioSegment

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(None),
    audio_url: str = Form(None),
):
    """Transcribe audio via Whisper.

    Accepts EITHER:
      - ``file``:      a direct multipart upload (legacy path), OR
      - ``audio_url``: a Cloudinary (or any HTTPS) URL — the service
                       downloads the file first then processes it.

    At least one must be provided.
    """
    whisper_service = getattr(request.app.state, "whisper_service", None)
    if not whisper_service:
        raise HTTPException(status_code=500, detail="Whisper service not initialized.")

    if not file and not audio_url:
        raise HTTPException(status_code=400, detail="Either 'file' or 'audio_url' must be provided.")

    # ── Resolve the raw audio bytes + extension ──────────────────────────
    if audio_url:
        # Download from URL (e.g. Cloudinary secure_url)
        try:
            resp = requests.get(audio_url, timeout=60)
            resp.raise_for_status()
            content = resp.content
        except requests.RequestException as e:
            raise HTTPException(status_code=502, detail=f"Failed to download audio from URL: {e}")

        # Derive extension from URL path (e.g. .webm, .mp3)
        from urllib.parse import urlparse
        url_path = urlparse(audio_url).path
        ext = os.path.splitext(url_path)[1].lower().replace(".", "") or "webm"
        filename = os.path.basename(url_path) or "audio.webm"
    else:
        # Direct file upload (legacy path)
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower().replace(".", "")
        content = await file.read()

    # Validate extension
    allowed_exts = ["wav", "mp3", "webm", "ogg", "m4a", "mp4"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=415, detail=f"Unsupported format: {ext or 'unknown'}")

    # Create temporary files for processing
    temp_in = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
    temp_out = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")

    try:
        # Write content to temp input file
        temp_in.write(content)
        temp_in.close()

        # Convert to WAV using pydub
        try:
            sound = AudioSegment.from_file(temp_in.name)
            sound.export(temp_out.name, format="wav")
            temp_out.close()
        except Exception as e:
            raise HTTPException(status_code=415, detail="Unsupported or corrupted audio file.")

        # Run whisper transcription
        result = whisper_service.transcribe(temp_out.name)
        return result

    except ValueError as val_err:
        # Silent or short audio (< 0.5s speech)
        raise HTTPException(status_code=422, detail=str(val_err))
    except HTTPException as http_err:
        raise http_err
    except Exception as err:
        print(f"Transcription route exception: {err}")
        raise HTTPException(status_code=500, detail="Audio transcription failed.")
    finally:
        # Ensure temporary files are cleaned up
        if os.path.exists(temp_in.name):
            os.remove(temp_in.name)
        if os.path.exists(temp_out.name):
            os.remove(temp_out.name)
