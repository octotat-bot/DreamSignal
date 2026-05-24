import os
import tempfile
import time
import requests
from fastapi import HTTPException

class WhisperService:
    def __init__(self, model_size: str = "base"):
        self.use_hf = os.getenv("USE_HF_WHISPER", "false").lower() == "true"
        if not self.use_hf:
            from faster_whisper import WhisperModel
            # CPU is recommended for local development compatibility, using int8 for speed optimization.
            self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

    def transcribe(self, file_path: str):
        if self.use_hf:
            return self._transcribe_hf(file_path)
        return self._transcribe_local(file_path)

    def _transcribe_hf(self, file_path: str):
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        headers = {"Authorization": f"Bearer {api_key}"}
        # HuggingFace Serverless API only supports whisper-large-v3 or v3-turbo now
        url = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo"
        
        with open(file_path, "rb") as f:
            data = f.read()

        for attempt in range(2):
            try:
                response = requests.post(url, headers=headers, data=data, timeout=60)
            except requests.exceptions.Timeout:
                raise HTTPException(status_code=504, detail="Transcription timed out")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

            if response.status_code == 503 and attempt == 0:
                print("Whisper model loading on HuggingFace, waiting 20s...")
                time.sleep(20)
                continue
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Transcription failed: {response.text}")
            
            try:
                result = response.json()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Transcription failed: Invalid JSON response")
            
            text = result.get("text", "")
            if not text or not text.strip():
                raise HTTPException(status_code=422, detail="No speech detected in audio")
                
            return {
                "transcript": text.strip(),
                "language": "en",
                "duration_seconds": 0
            }
            
        raise HTTPException(status_code=500, detail="Transcription failed: Model loading timeout")

    def _transcribe_local(self, file_path: str):
        # Transcribe audio file
        segments, info = self.model.transcribe(file_path, beam_size=5)
        segments_list = list(segments)
        
        # Calculate speech duration
        speech_duration = sum(segment.end - segment.start for segment in segments_list)
        
        if speech_duration < 0.5:
            raise ValueError("Audio is silent or contains less than 0.5 seconds of speech.")
            
        transcript = "".join(segment.text for segment in segments_list).strip()
        
        return {
            "transcript": transcript,
            "language": info.language,
            "duration_seconds": round(info.duration, 2)
        }
