import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydub import AudioSegment

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    whisper_service = getattr(request.app.state, "whisper_service", None)
    if not whisper_service:
        raise HTTPException(status_code=500, detail="Whisper service not initialized.")

    # Validate file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower().replace(".", "")
    allowed_exts = ["wav", "mp3", "webm", "ogg"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=415, detail=f"Unsupported format: {ext or 'unknown'}")

    # Create temporary files for processing
    temp_in = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
    temp_out = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    
    try:
        # Write upload to temp input file
        content = await file.read()
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
