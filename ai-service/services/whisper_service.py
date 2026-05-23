import os
import tempfile
from faster_whisper import WhisperModel

class WhisperService:
    def __init__(self, model_size: str = "base"):
        # CPU is recommended for local development compatibility, using int8 for speed optimization.
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")

    def transcribe(self, file_path: str):
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
