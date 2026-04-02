import anthropic
import base64
import io
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

# ── Model constants ───────────────────────────────────────────────────────────
MODEL_GROUPING      = "claude-haiku-4-5-20251001"  # Pass 1: text-only band grouping
MODEL_ALT_TEXT      = "claude-haiku-4-5-20251001"  # Pass 3: per-slice vision
MODEL_PIXEL_FALLBACK = "claude-sonnet-4-6"         # _analyze_pixels: harder task

# Max height before downscaling — only applied on the pixel-fallback path
MAX_HEIGHT_PX = 1500


# ── Prompts ───────────────────────────────────────────────────────────────────

# Pass 1: text-only band grouping (no image sent to Claude)
GROUP_PROMPT = """You are analyzing Figma layer metadata for an HTML email design.
You will NOT see the image — reason from node types, names, pixel positions, and fill flags only.

The design has {n} horizontal bands measured from the Figma canvas:

{bands_list}

Each band shows: position range, [NODE TYPE], [IMAGE FILL] if it contains a background/hero image, and the layer name.
Node types: [FRAME] [RECTANGLE] [TEXT] [COMPONENT] [GROUP]

GROUP consecutive bands into logical email sections. Each group becomes one exported image.

Rules (apply in priority order):
1. Overlapping Y ranges → same group (one element is layered over another).
2. A [FRAME] or [COMPONENT] whose Y range falls inside an [IMAGE FILL] band → same group (CTA on hero).
3. A [TEXT] band within 50px of an [IMAGE FILL] or large [FRAME] → same group (headline on image).
4. Side-by-side elements already share one band — keep them together.
5. Only start a new group where there is a clear horizontal gap and content is completely separate.
6. Every band must belong to exactly one group in order (no skipping, no reordering).

Give each group a short snake_case descriptive name (header, hero_cta, product_row_1, footer, etc.)

Return ONLY valid JSON (no markdown):
{{
  "groups": [
    {{"name": "snake_case_name", "band_indices": [0, 1]}}
  ]
}}

band_indices must be consecutive integers covering 0 to {last_index} with no gaps."""


# Pass 3: per-slice vision for alt text
ALT_TEXT_PROMPT = """You are writing an HTML alt attribute for one horizontal slice of a marketing email.
Slice name: "{slice_name}".
Describe what you see in one sentence, under 125 characters.
Be specific: mention visible headline text, products shown, CTA button text, or dominant colours.
Do NOT say "email image", "marketing content", "banner", or repeat the slice name verbatim.
Output only the alt text string — no JSON, no quotes, no explanation."""


# Pixel-fallback: proportion-based output (no layer data available)
SLICE_PROMPT = """You are slicing an email design image into horizontal strips for HTML email export.

Rules:
- Slices are full-width horizontal bands stacked top to bottom — no exceptions.
- ONLY cut at a clear whitespace gap of at least 8px between two visually separate content rows.
- NEVER cut through a text block, image, button, or any element that spans the cut line.
- Side-by-side columns, buttons on images, text overlaid on a background — keep them in ONE slice.
- Aim for 3–8 slices. Prefer fewer, larger slices over many small ones.

Image dimensions: {width}px × {height}px

IMPORTANT: Express cut positions as decimal fractions of the total image height (0.0 to 1.0), NOT pixel values.
Example: a section break 1/3 of the way down → 0.333

Return ONLY valid JSON (no markdown, no explanation):
{{
  "slices": [
    {{"name": "snake_case_name", "y_start_pct": 0.0, "y_end_pct": 0.22, "alt_text": "Brief description"}}
  ],
  "analysis": "One sentence explaining the cuts"
}}

Constraints:
- y_end_pct of slice N must equal y_start_pct of slice N+1 (no gaps, no overlaps)
- First slice: y_start_pct = 0.0
- Last slice: y_end_pct = 1.0
- All values must be floats between 0.0 and 1.0"""


# ── Service ───────────────────────────────────────────────────────────────────

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
        if layer_bands:
            # Master image stays at full 2x resolution — Pillow crops must match Figma coords
            return self._group_bands(image_base64, width, height, layer_bands)
        # Downscale only for the pixel path where image is sent to Claude
        image_base64, height = self._maybe_downscale(image_base64, height)
        return self._analyze_pixels(image_base64, width, height)

    # ── Pass helpers ──────────────────────────────────────────────────────────

    def _group_bands(self, image_base64: str, width: int, height: int, bands: list) -> dict:
        # ── Separate column bands (x-resolved by Figma math) from stacked bands ──
        column_bands = [b for b in bands if b.get('x_start') is not None]
        stacked_bands = [b for b in bands if b.get('x_start') is None]

        # ── Pass 1: Claude groups stacked bands semantically ──────────────────
        stacked_slices = self._run_claude_grouping(stacked_bands, height) if stacked_bands else []

        # ── Column bands are already fully resolved — emit directly ──────────
        column_slices = [
            {
                'name': b['name'],
                'y_start': b['y_start'],
                'y_end': b['y_end'],
                'x_start': b['x_start'],
                'x_end': b['x_end'],
                'alt_text': b['name']  # overwritten in Pass 3
            }
            for b in column_bands
        ]

        all_slices = stacked_slices + column_slices
        all_slices.sort(key=lambda s: (s['y_start'], s.get('x_start') or 0))

        # ── Pass 2: Pillow x-aware crop ───────────────────────────────────────
        slice_images = self._slice_image(image_base64, all_slices)

        # ── Pass 3: parallel alt-text vision ─────────────────────────────────
        alt_texts = self._generate_alt_texts(slice_images, [s['name'] for s in all_slices])
        for s, alt in zip(all_slices, alt_texts):
            s['alt_text'] = alt

        return {'slices': all_slices, 'analysis': 'Figma-driven grouping with auto column detection'}

    def _run_claude_grouping(self, bands: list, height: int) -> list:
        """Pass 1: group stacked full-width bands into logical email sections using Claude."""
        def fmt_band(i, b):
            node_type = b.get('nodeType', 'UNKNOWN')
            img_flag = ' [IMAGE FILL]' if b.get('hasImageFill') else ''
            return f"  Band {i}: y={b['y_start']}–{b['y_end']}px  [{node_type}]{img_flag}  \"{b['name']}\""

        bands_list = '\n'.join(fmt_band(i, b) for i, b in enumerate(bands))
        prompt = GROUP_PROMPT.format(
            n=len(bands),
            bands_list=bands_list,
            last_index=len(bands) - 1
        )

        message = self.client.messages.create(
            model=MODEL_GROUPING,
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [{"type": "text", "text": prompt}]
            }]
        )

        result = self._parse_json(message.content[0].text)
        groups = result.get('groups', [])

        if not groups:
            raise ValueError("Claude returned no groups")

        # Validate all band indices are covered; fall back to one group per band
        covered = []
        for g in groups:
            covered.extend(g.get('band_indices', []))
        if sorted(covered) != list(range(len(bands))):
            logging.warning('[analyze] band coverage mismatch — falling back to one group per band')
            groups = [
                {'name': b['name'], 'band_indices': [i]}
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
                'alt_text': g['name']
            })

        slices.sort(key=lambda s: s['y_start'])
        self._validate_slices(slices, height)
        return slices

    def _slice_image(self, image_base64: str, slices: list) -> list[str]:
        """Pillow-crop the master image into per-slice PNGs, supporting x-axis crops for columns."""
        img = Image.open(io.BytesIO(base64.b64decode(image_base64)))
        results = []
        for s in slices:
            y_end = min(s['y_end'], img.height)
            x_start = s.get('x_start') or 0
            x_end = min(s.get('x_end') or img.width, img.width)
            crop = img.crop((x_start, s['y_start'], x_end, y_end))
            buf = io.BytesIO()
            crop.save(buf, format='PNG')
            results.append(base64.b64encode(buf.getvalue()).decode())
        return results

    def _generate_alt_texts(self, images_b64: list[str], names: list[str]) -> list[str]:
        """Fan out alt-text vision calls in parallel. Never raises."""
        if not images_b64:
            return []
        workers = min(len(images_b64), 5)
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = [
                ex.submit(self._alt_text_for_slice, b64, name)
                for b64, name in zip(images_b64, names)
            ]
            return [f.result() for f in futures]

    def _alt_text_for_slice(self, image_b64: str, name: str) -> str:
        """Single Claude Haiku call for one slice's alt text. Falls back to name on error."""
        try:
            msg = self.client.messages.create(
                model=MODEL_ALT_TEXT,
                max_tokens=100,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_b64}},
                        {"type": "text", "text": ALT_TEXT_PROMPT.format(slice_name=name)}
                    ]
                }]
            )
            return msg.content[0].text.strip()
        except Exception as e:
            logging.warning(f"[analyze] alt text failed for '{name}': {e}")
            return name

    def _analyze_pixels(self, image_base64: str, width: int, height: int) -> dict:
        """Fallback when no Figma layer data. Uses proportion-based output to avoid coordinate hallucination."""
        prompt = SLICE_PROMPT.format(width=width, height=height)

        message = self.client.messages.create(
            model=MODEL_PIXEL_FALLBACK,
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_base64}},
                    {"type": "text", "text": prompt}
                ]
            }]
        )

        result = self._parse_json(message.content[0].text)
        slices = result.get('slices', [])

        # Convert proportions → integer pixel values
        for s in slices:
            y_start_pct = max(0.0, min(1.0, s.pop('y_start_pct', 0.0)))
            y_end_pct   = max(0.0, min(1.0, s.pop('y_end_pct',   1.0)))
            s['y_start'] = round(y_start_pct * height)
            s['y_end']   = round(y_end_pct   * height)

        self._validate_slices(slices, height)
        return result

    # ── Utilities ─────────────────────────────────────────────────────────────

    def _maybe_downscale(self, image_base64: str, original_height: int) -> tuple[str, int]:
        """Resize image if taller than MAX_HEIGHT_PX. Only used for the pixel-fallback path."""
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
        logging.info(f'[analyze] downscaled image {h}px → {new_h}px for pixel analysis')
        return new_b64, new_h

    def _parse_json(self, text: str) -> dict:
        """Extract and parse JSON from Claude's response, tolerating minor formatting issues."""
        json_match = re.search(r'\{[\s\S]*\}', text)
        if not json_match:
            raise ValueError(f"No JSON found in Claude response: {text[:300]}")
        raw = json_match.group()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
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
