import anthropic
import json
import re


SLICE_PROMPT = """You are an expert email design analyzer. Analyze this email design image and identify optimal horizontal slice boundaries for email rendering.

Rules:
1. Each slice must span the FULL WIDTH of the email (no vertical splits)
2. Identify logical sections: header, hero, product sections, CTAs, footer, etc.
3. Place boundaries at natural visual breaks (color changes, section dividers, spacing)
4. Avoid cutting through text, images, or interactive elements
5. Each slice should be a self-contained visual unit
6. Consider mobile rendering - smaller slices load faster
7. Aim for 4-8 slices for a typical email

Image dimensions: {width}px × {height}px

Return ONLY valid JSON in this exact format:
{{
  "slices": [
    {{
      "name": "section_name",
      "y_start": 0,
      "y_end": 150,
      "alt_text": "Brief description for accessibility (5-10 words)"
    }}
  ],
  "analysis": "Brief explanation of slicing decisions"
}}

Ensure y_end of each slice equals y_start of the next slice (no gaps or overlaps).
The first slice must have y_start = 0.
The last slice must have y_end = {height}."""


class ClaudeVisionService:
    def __init__(self):
        self.client = anthropic.Anthropic()

    def analyze_email_design(
        self,
        image_base64: str,
        width: int,
        height: int
    ) -> dict:
        """
        Analyze an email design image and return optimal slice boundaries.
        """
        prompt = SLICE_PROMPT.format(width=width, height=height)

        message = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        )

        response_text = message.content[0].text

        # Extract JSON from response (Claude sometimes wraps in markdown code blocks)
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            raise ValueError(f"No valid JSON found in Claude response: {response_text[:200]}")

        result = json.loads(json_match.group())
        self._validate_slices(result.get('slices', []), height)
        return result

    def _validate_slices(self, slices: list, frame_height: int) -> None:
        """Ensure slices are contiguous, non-overlapping, and cover full height."""
        if not slices:
            raise ValueError("No slices returned by Claude")

        # Fix first/last boundaries
        slices[0]['y_start'] = 0
        slices[-1]['y_end'] = frame_height

        # Ensure continuity
        for i in range(1, len(slices)):
            if slices[i]['y_start'] != slices[i - 1]['y_end']:
                slices[i]['y_start'] = slices[i - 1]['y_end']
