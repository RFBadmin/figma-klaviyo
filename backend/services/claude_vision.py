import anthropic
import json
import re


# Used when no layer bands are available — AI guesses boundaries from pixels alone
SLICE_PROMPT = """You are slicing an email design image into horizontal strips for HTML email export.

Slices are horizontal bands only — full width, stacked top to bottom.
Everything within a vertical band becomes ONE image (buttons on images, side-by-side images, text on backgrounds all stay together).

Only cut at a clear horizontal break where content above and below are completely separate visual rows with no overlap.
Absorb thin gaps/lines into adjacent bands. Keep it minimal: 3–8 slices.

Image dimensions: {width}px × {height}px

Return ONLY valid JSON (no markdown):
{{
  "slices": [
    {{"name": "descriptive_name", "y_start": 0, "y_end": 150, "alt_text": "Brief description"}}
  ],
  "analysis": "One sentence explaining the cuts"
}}

- y_end of slice N must equal y_start of slice N+1
- First slice: y_start = 0, Last slice: y_end = {height}
- All y values must be integers"""


# Used when Figma layer bands are available — AI groups bands, pixel positions stay exact
GROUP_PROMPT = """You are looking at an email design. The design's layers have been measured and split into {n} horizontal bands with exact pixel positions:

{bands_list}

Your job: GROUP consecutive bands into logical email sections by deciding which bands visually belong together.

Rules:
- Bands that overlap or are part of the same visual composition must be in the same group
- A button or text overlaid on a background image → same group as that image
- Side-by-side images in a row → already in the same band, keep together
- Only split into a new group when there is a clear visual separation between rows
- Every band must be in exactly one group, in order (no skipping, no reordering)
- Give each group a short descriptive name (e.g. header, hero_banner, product_row_1, cta, footer)

Return ONLY valid JSON (no markdown):
{{
  "groups": [
    {{"name": "descriptive_name", "band_indices": [0, 1], "alt_text": "Brief description"}}
  ]
}}

band_indices must be consecutive integers covering 0 to {last_index} with no gaps."""


class ClaudeVisionService:
    def __init__(self):
        self.client = anthropic.Anthropic()

    def analyze_email_design(
        self,
        image_base64: str,
        width: int,
        height: int,
        layer_bands: list | None = None
    ) -> dict:
        """
        Analyze an email design image and return optimal slice boundaries.
        If layer_bands are provided, AI groups them (exact positions preserved).
        Otherwise, AI estimates boundaries from the image alone.
        """
        if layer_bands:
            return self._group_bands(image_base64, width, height, layer_bands)
        return self._analyze_pixels(image_base64, width, height)

    def _group_bands(self, image_base64: str, width: int, height: int, bands: list) -> dict:
        """AI groups pre-computed layer bands into logical sections."""
        bands_list = '\n'.join(
            f"  Band {i}: y={b['y_start']}–{b['y_end']}px  \"{b['name']}\""
            for i, b in enumerate(bands)
        )
        prompt = GROUP_PROMPT.format(
            n=len(bands),
            bands_list=bands_list,
            last_index=len(bands) - 1
        )

        message = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_base64}},
                    {"type": "text", "text": prompt}
                ]
            }]
        )

        response_text = message.content[0].text
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            raise ValueError(f"No valid JSON in Claude response: {response_text[:200]}")

        result = json.loads(json_match.group())
        groups = result.get('groups', [])
        if not groups:
            raise ValueError("Claude returned no groups")

        # Validate all band indices are covered
        covered = []
        for g in groups:
            covered.extend(g.get('band_indices', []))
        if sorted(covered) != list(range(len(bands))):
            # Fall back: one group per band
            groups = [{'name': b['name'], 'band_indices': [i], 'alt_text': b['name']}
                      for i, b in enumerate(bands)]

        # Convert groups → slices using exact band pixel positions
        slices = []
        for g in groups:
            indices = sorted(g.get('band_indices', []))
            if not indices:
                continue
            y_start = bands[indices[0]]['y_start']
            y_end = bands[indices[-1]]['y_end']
            slices.append({
                'name': g['name'],
                'y_start': y_start,
                'y_end': y_end,
                'alt_text': g.get('alt_text', g['name'])
            })

        slices.sort(key=lambda s: s['y_start'])
        self._validate_slices(slices, height)
        return {'slices': slices, 'analysis': result.get('analysis', 'Layer-guided grouping')}

    def _analyze_pixels(self, image_base64: str, width: int, height: int) -> dict:
        """AI estimates boundaries from image pixels (no layer data)."""
        prompt = SLICE_PROMPT.format(width=width, height=height)

        message = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_base64}},
                    {"type": "text", "text": prompt}
                ]
            }]
        )

        response_text = message.content[0].text
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            raise ValueError(f"No valid JSON in Claude response: {response_text[:200]}")

        result = json.loads(json_match.group())
        self._validate_slices(result.get('slices', []), height)
        return result

    def _validate_slices(self, slices: list, frame_height: int) -> None:
        if not slices:
            raise ValueError("No slices returned by Claude")
        slices[0]['y_start'] = 0
        slices[-1]['y_end'] = frame_height
        for i in range(1, len(slices)):
            if slices[i]['y_start'] != slices[i - 1]['y_end']:
                slices[i]['y_start'] = slices[i - 1]['y_end']
