import anthropic
import json
import re


SLICE_PROMPT = """You are slicing an email design image into horizontal strips for HTML email export.

HOW SLICING WORKS:
- Slices are horizontal bands only — full width, stacked top to bottom
- Everything within a vertical band becomes ONE image, no matter how complex
- A button overlaid on an image → same slice as that image
- Multiple images side by side in a row → one slice (the whole row)
- Text on top of a background → same slice as that background

WHEN TO CUT:
Look for clear horizontal breaks — places where the design visually separates into an independent row. A cut is valid when the content ABOVE it and the content BELOW it are clearly separate visual rows with no overlap between them.

WHEN NOT TO CUT:
- Do not cut through any element (image, text, button, icon) — even partially
- Do not cut inside a visual composition where elements overlap vertically
- Do not create tiny slices for thin lines or gaps — absorb them into adjacent bands

Keep slices minimal. A complex email with many elements might still only need 3–8 slices if the elements are layered or close together. Do not try to isolate every individual element.

Image dimensions: {width}px × {height}px

Return ONLY valid JSON (no markdown):
{{
  "slices": [
    {{
      "name": "descriptive_name",
      "y_start": 0,
      "y_end": 150,
      "alt_text": "Brief description"
    }}
  ],
  "analysis": "One sentence explaining where you cut and why"
}}

REQUIREMENTS:
- y_end of slice N must equal y_start of slice N+1 (no gaps, no overlaps)
- First slice: y_start = 0
- Last slice: y_end = {height}
- All y values must be integers"""


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
            model="claude-sonnet-4-6",
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
