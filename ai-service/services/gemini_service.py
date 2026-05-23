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

    def _imagen_enabled(self) -> bool:
        """Image generation is opt-in via env so we don't burn API quota by
        default. Set IMAGEN_ENABLED=true once you've confirmed your Gemini
        / Imagen access tier supports image output."""
        return os.getenv("IMAGEN_ENABLED", "false").strip().lower() in ("1", "true", "yes")

    def generate_image(self, prompt: str, output_path: str) -> bool:
        """Generate a single dreamlike image from the cinematic description
        and write it to `output_path`. Returns True on success, False if the
        feature is disabled, the API errors out, or no image is returned.

        Soft-fails on every error so a missing image never breaks the
        analyze pipeline — `imagePath` simply stays null on the Dream doc."""
        if not self.client or not self._imagen_enabled():
            return False
        if not prompt or not prompt.strip():
            return False
        model = os.getenv("IMAGEN_MODEL", "imagen-3.0-generate-002")
        styled_prompt = (
            "A cinematic, dreamlike scene rendered as a painterly still from a film. "
            "Low saturation, atmospheric lighting, soft film grain, surreal composition. "
            f"Scene: {prompt.strip()}"
        )
        try:
            result = self.client.models.generate_images(
                model=model,
                prompt=styled_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="16:9",
                ),
            )
            images = getattr(result, "generated_images", None) or []
            if not images:
                return False
            image_obj = getattr(images[0], "image", None)
            image_bytes = getattr(image_obj, "image_bytes", None) if image_obj else None
            if not image_bytes:
                return False
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(image_bytes)
            return True
        except Exception as err:
            print(f"Imagen generation failed ({model}): {err}")
            return False

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
