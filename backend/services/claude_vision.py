import anthropic
import json
import re


SLICE_PROMPT = """You are analyzing an email design image to determine where to slice it into horizontal image strips for HTML email.

The ONLY reason to create a new slice is if that area needs a DIFFERENT redirect link than the area above it.
Ask yourself: "Would someone click this area to go somewhere different?"

SLICE WHEN:
- A logo or header banner (links to homepage)
- A hero image or product photo (links to product/offer page)
- A CTA button or "Shop Now" / "Learn More" link (links to landing page)
- A product row or grid (each row may link to different products)
- A footer (links to unsubscribe/preferences)

DO NOT SLICE:
- Plain body text paragraphs (no link needed — keep as part of the surrounding slice)
- Decorative dividers or spacers (absorb into adjacent slice)
- Every tiny visual change — only slice where the LINK destination changes

Keep it minimal: most emails need only 3–6 slices.

Image dimensions: {width}px × {height}px

Return ONLY valid JSON (no markdown):
{{
  "slices": [
    {{
      "name": "section_name",
      "y_start": 0,
      "y_end": 150,
      "alt_text": "Brief description"
    }}
  ],
  "analysis": "One sentence explaining the slicing decisions"
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
