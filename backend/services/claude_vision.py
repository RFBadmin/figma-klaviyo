import anthropic
import json
import re


SLICE_PROMPT = """You are an expert email HTML developer analyzing a Figma email design. Your task is to identify precise horizontal slice boundaries so each slice can be exported as a separate image and stacked in an HTML email.

CRITICAL RULES:
1. Every slice must span the FULL WIDTH — no vertical splits, ever
2. Slice boundaries must fall in EMPTY SPACE between content rows — never cut through text, images, icons, buttons, or decorative elements
3. Look carefully at the vertical rhythm: find whitespace gaps, padding areas, or divider lines between sections
4. Name slices descriptively: header, logo_bar, hero_image, headline, subtext, product_grid, cta_button, divider, feature_row_1, footer, etc.
5. For complex designs with many elements, use MORE slices (up to 15) to keep each slice self-contained
6. A section with a colored background that spans the full width can be one slice if it contains tightly grouped content
7. CTAs (buttons) should usually be their own slice or grouped with directly adjacent text
8. Thin decorative strips, dividers, or spacers between sections should be their own slice
9. Product grids: if products are in rows, each row can be a separate slice

BOUNDARY DETECTION STRATEGY:
- Scan vertically for horizontal whitespace gaps (typically 8–40px) — these are ideal cut points
- Look for background color transitions — these mark natural section boundaries
- Identify clear content groupings (logo area, hero area, body copy block, CTA block, footer block)
- When in doubt, make more slices rather than fewer to avoid cutting through content

Image dimensions: {width}px × {height}px (tall email designs may have 8–15+ sections)

Return ONLY valid JSON in this exact format (no markdown, no explanation outside JSON):
{{
  "slices": [
    {{
      "name": "section_name",
      "y_start": 0,
      "y_end": 150,
      "alt_text": "Brief description for accessibility"
    }}
  ],
  "analysis": "Brief explanation of slicing strategy used"
}}

REQUIREMENTS:
- y_end of slice N must exactly equal y_start of slice N+1 (no gaps, no overlaps)
- First slice: y_start = 0
- Last slice: y_end = {height}
- Minimum slice height: 10px
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
