import anthropic
import base64
import io
import json
import re

from PIL import Image

MODEL = "claude-sonnet-4-6"

# Max height to send to Claude — Figma exports 2x so a 3000px email becomes 6000px.
# Resizing to 1500px max saves ~70% tokens with no loss for layout analysis.
MAX_HEIGHT_PX = 1500


SLICE_PROMPT = """You are slicing an email design image into horizontal strips for HTML email export.

Rules:
- Slices are full-width horizontal bands stacked top to bottom — no exceptions.
- ONLY cut at a clear whitespace gap of at least 8px between two visually separate content rows.
- NEVER cut through a text block, image, button, or any element that spans the cut line.
- Side-by-side columns, buttons on images, text overlaid on a background — keep them in ONE slice.
- Aim for 3–8 slices. Prefer fewer, larger slices over many small ones.

Image dimensions: {width}px × {height}px

Return ONLY valid JSON (no markdown, no explanation):
{{
  "slices": [
    {{"name": "snake_case_name", "y_start": 0, "y_end": 150, "alt_text": "Brief description"}}
  ],
  "analysis": "One sentence explaining the cuts"
}}

Constraints:
- y_end of slice N must equal y_start of slice N+1 (no gaps, no overlaps)
- First slice: y_start = 0
- Last slice: y_end = {height}
- All y values must be integers"""


GROUP_PROMPT = """You are slicing an email design into sections for HTML email export.
The design's Figma layers have been measured into {n} horizontal bands:

{bands_list}

Each band: position, [NODE TYPE], [IMAGE FILL] if it has a background/hero image, and layer name.
Node types: [FRAME] [RECTANGLE] [TEXT] [COMPONENT] [GROUP]

GROUP consecutive bands into logical email sections. Each group = one exported image.

Rules (in priority order):
1. Overlapping Y ranges → same group (one element layers over another).
2. A [FRAME] or [COMPONENT] inside an [IMAGE FILL] band → same group (e.g. CTA button on hero).
3. A [TEXT] band within 50px of an [IMAGE FILL] or large [FRAME] → same group (headline on image).
4. Side-by-side elements already share one band — keep together.
5. Only start a new group at a clear horizontal gap where content is completely separate.
6. Every band must belong to exactly one group in order (no skipping, no reordering).

Return ONLY valid JSON (no markdown):
{{
  "groups": [
    {{"name": "snake_case_name", "band_indices": [0, 1], "alt_text": "Brief description"}}
  ]
}}

band_indices must cover every index from 0 to {last_index} with no gaps."""


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
        image_base64, height = self._maybe_downscale(image_base64, height)
        if layer_bands:
            return self._group_bands(image_base64, width, height, layer_bands)
        return self._analyze_pixels(image_base64, width, height)

    def _maybe_downscale(self, image_base64: str, original_height: int) -> tuple[str, int]:
        """Resize the image if taller than MAX_HEIGHT_PX to save tokens."""
        if original_height <= MAX_HEIGHT_PX:
            return image_base64, original_height

        img_bytes = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(img_bytes))
        w, h = img.size
        scale = MAX_HEIGHT_PX / h
        new_w, new_h = int(w * scale), MAX_HEIGHT_PX
        img = img.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True)
        new_b64 = base64.b64encode(buf.getvalue()).decode()
        print(f'[analyze] downscaled image {h}px → {new_h}px')
        return new_b64, new_h

    def _group_bands(self, image_base64: str, width: int, height: int, bands: list) -> dict:
        def fmt_band(i, b):
            node_type = b.get('nodeType', '?')
            img_flag = ' [IMAGE FILL]' if b.get('hasImageFill') else ''
            return f"  Band {i}: y={b['y_start']}–{b['y_end']}px  [{node_type}]{img_flag}  \"{b['name']}\""

        bands_list = '\n'.join(fmt_band(i, b) for i, b in enumerate(bands))
        prompt = GROUP_PROMPT.format(
            n=len(bands),
            bands_list=bands_list,
            last_index=len(bands) - 1
        )

        message = self.client.messages.create(
            model=MODEL,
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
        result = self._parse_json(response_text)
        groups = result.get('groups', [])

        if not groups:
            raise ValueError("Claude returned no groups")

        # Validate all band indices are covered; fall back to one group per band
        covered = []
        for g in groups:
            covered.extend(g.get('band_indices', []))
        if sorted(covered) != list(range(len(bands))):
            print('[analyze] band coverage mismatch — falling back to one group per band')
            groups = [
                {'name': b['name'], 'band_indices': [i], 'alt_text': b['name']}
                for i, b in enumerate(bands)
            ]

        slices = []
        for g in groups:
            indices = sorted(g.get('band_indices', []))
            if not indices:
                continue
            slices.append({
                'name': g['name'],
                'y_start': bands[indices[0]]['y_start'],
                'y_end': bands[indices[-1]]['y_end'],
                'alt_text': g.get('alt_text', g['name'])
            })

        slices.sort(key=lambda s: s['y_start'])
        self._validate_slices(slices, height)
        return {'slices': slices, 'analysis': result.get('analysis', 'Layer-guided grouping')}

    def _analyze_pixels(self, image_base64: str, width: int, height: int) -> dict:
        prompt = SLICE_PROMPT.format(width=width, height=height)

        message = self.client.messages.create(
            model=MODEL,
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
        result = self._parse_json(response_text)
        self._validate_slices(result.get('slices', []), height)
        return result

    def _parse_json(self, text: str) -> dict:
        """Extract and parse JSON from Claude's response, tolerating minor formatting issues."""
        json_match = re.search(r'\{[\s\S]*\}', text)
        if not json_match:
            raise ValueError(f"No JSON found in Claude response: {text[:300]}")
        raw = json_match.group()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # Strip trailing commas before ] or } and retry
            cleaned = re.sub(r',\s*([\]}])', r'\1', raw)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as e:
                raise ValueError(f"Could not parse Claude JSON: {e} — raw: {raw[:300]}")

    def _validate_slices(self, slices: list, frame_height: int) -> None:
        if not slices:
            raise ValueError("No slices returned")
        slices[0]['y_start'] = 0
        slices[-1]['y_end'] = frame_height
        for i in range(1, len(slices)):
            if slices[i]['y_start'] != slices[i - 1]['y_end']:
                slices[i]['y_start'] = slices[i - 1]['y_end']
