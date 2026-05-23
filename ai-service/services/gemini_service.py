import os
import json
from google import genai
from google.genai import types
from typing import Dict, Any, List


class GeminiService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def get_fallback_analysis(self, transcript: str) -> Dict[str, str]:
        return {
            "title": "Untitled Dream",
            "summary": (transcript[:200] + "...") if len(transcript) > 200 else transcript,
            "psychologicalInterpretation": "The dream reflects subconscious thoughts waiting to be processed.",
            "cinematicDescription": "A blurred sequence of events unfolding in the shadows of the mind.",
            "dominantTheme": "Subconscious Process",
            "environment": "Unknown",
            "mood": "Neutral"
        }

    def interpret_dream(
        self,
        transcript: str,
        emotions: List[Dict[str, Any]],
        symbols: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        if not self.client:
            return self.get_fallback_analysis(transcript)

        emotions_text = ", ".join([f"{e['label']} ({e['score']:.2f})" for e in emotions])
        symbols_text  = ", ".join([f"{s['label']} ({s['score']:.2f})" for s in symbols])

        system_instruction = (
            "You are a Jungian dream analyst and cinematic writer. "
            "Analyze this dream transcript with emotional and symbolic intelligence. "
            "Be poetic, precise, and psychologically grounded. Avoid generic interpretations."
        )

        user_prompt = f"""Analyze the following dream.
Transcript: {transcript}
Detected Emotions: {emotions_text}
Key Symbols: {symbols_text}

Provide the analysis strictly in the following JSON format (no markdown fences, raw JSON only):
{{
  "title": "cinematic dream title (max 8 words)",
  "summary": "2-3 sentence summary",
  "psychological_interpretation": "2-3 sentences Jungian analysis",
  "cinematic_description": "1 vivid paragraph — describe this dream as a film scene",
  "dominant_theme": "single word or short phrase",
  "environment": "primary setting/environment of the dream",
  "mood": "overall mood in 1-3 words"
}}"""

        for attempt in range(1, 3):  # 2 attempts total
            try:
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                )

                text = response.text.strip()
                # Strip markdown fences if model ignores mime_type instruction
                if text.startswith("```"):
                    lines = text.splitlines()
                    text = "\n".join(
                        lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
                    )

                data = json.loads(text)
                return {
                    "title":                    data.get("title", "Untitled Dream"),
                    "summary":                  data.get("summary", "No summary available."),
                    "psychologicalInterpretation": data.get(
                        "psychological_interpretation",
                        data.get("psychologicalInterpretation", "Awaiting deep psychological insight.")
                    ),
                    "cinematicDescription": data.get(
                        "cinematic_description",
                        data.get("cinematicDescription", "A scene in the theatre of the mind.")
                    ),
                    "dominantTheme": data.get(
                        "dominant_theme",
                        data.get("dominantTheme", "Unknown Theme")
                    ),
                    "environment": data.get("environment", "Unknown setting"),
                    "mood":        data.get("mood", "Neutral"),
                }

            except Exception as err:
                print(f"Gemini API attempt {attempt} failed: {err}")
                if attempt == 2:
                    print("Both Gemini attempts exhausted — using fallback.")
                    return self.get_fallback_analysis(transcript)
