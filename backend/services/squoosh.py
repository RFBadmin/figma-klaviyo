import subprocess
import os
import tempfile
from pathlib import Path
from PIL import Image
from typing import Tuple
from dataclasses import dataclass, field
from io import BytesIO


@dataclass
class CompressionResult:
    data: bytes
    format: str
    original_size: int
    compressed_size: int
    width: int
    height: int
    passed_validation: bool
    warnings: list = field(default_factory=list)

    @property
    def reduction_percent(self) -> int:
        if self.original_size == 0:
            return 0
        return round((1 - self.compressed_size / self.original_size) * 100)

    @property
    def status(self) -> str:
        kb = self.compressed_size / 1024
        if kb <= 100:
            return 'optimal'
        elif kb <= 150:
            return 'good'
        elif kb <= 200:
            return 'warning'
        return 'failed'


# Klaviyo optimization targets (size only — no dimension constraints)
KLAVIYO_LIMITS = {
    'max_file_size': 200 * 1024,       # 200KB hard limit per slice
    'target_file_size': 100 * 1024,    # 100KB ideal target
    'warn_file_size': 150 * 1024,      # 150KB warning threshold
    'total_email_target': 500 * 1024,  # 500KB total for all slices
}


class SquooshService:
    def __init__(self):
        self.output_dir = tempfile.mkdtemp()

    def compress_image(
        self,
        image_bytes: bytes,
        filename: str,
        target_size: int = 100 * 1024,
        max_size: int = 200 * 1024
    ) -> CompressionResult:
        """
        Compress image using Squoosh CLI with Klaviyo optimization.
        Implements progressive compression to meet size targets.
        No resizing is performed — original dimensions are preserved.
        """
        input_path = os.path.join(self.output_dir, f"input_{filename}")
        original_size = len(image_bytes)

        with open(input_path, 'wb') as f:
            f.write(image_bytes)

        format_type, initial_quality = self._analyze_image(input_path)

        quality = initial_quality
        compressed_data = image_bytes  # fallback
        final_size = original_size

        for attempt in range(4):
            compressed_data, final_size = self._run_squoosh(input_path, format_type, quality)

            if final_size <= target_size:
                break
            elif final_size <= max_size and attempt >= 2:
                break
            else:
                quality = max(50, quality - 10)

        warnings = []
        passed = final_size <= max_size

        if not passed:
            warnings.append(f"Exceeds 200KB limit ({final_size // 1024}KB) — consider splitting this slice")
        elif final_size > KLAVIYO_LIMITS['warn_file_size']:
            warnings.append(f"Large file ({final_size // 1024}KB) — may load slowly on mobile")

        width, height = self._get_dimensions(compressed_data)

        return CompressionResult(
            data=compressed_data,
            format=format_type,
            original_size=original_size,
            compressed_size=final_size,
            width=width,
            height=height,
            passed_validation=passed,
            warnings=warnings
        )

    def _analyze_image(self, image_path: str) -> Tuple[str, int]:
        """Determine optimal format and starting quality from image content."""
        img = Image.open(image_path)

        if img.width * img.height > 500_000:
            img_sample = img.resize((500, 500))
            colors = img_sample.getcolors(maxcolors=50_000)
        else:
            colors = img.getcolors(maxcolors=50_000)

        if colors is None:
            return ('mozjpeg', 82)

        unique_colors = len(colors)

        if unique_colors < 256:
            return ('oxipng', 2)
        elif unique_colors < 5_000:
            return ('oxipng', 3)
        else:
            return ('mozjpeg', 82)

    def _run_squoosh(
        self,
        input_path: str,
        format_type: str,
        quality: int
    ) -> Tuple[bytes, int]:
        """Run Squoosh via @squoosh/lib Node.js script. No resizing."""
        import base64
        import json

        with open(input_path, 'rb') as f:
            image_base64 = base64.b64encode(f.read()).decode()

        payload = json.dumps({
            'image_base64': image_base64,
            'format': format_type,
            'quality': quality
        })

        script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'squoosh_compress.mjs')
        result = subprocess.run(
            ['node', script_path],
            input=payload.encode(),
            capture_output=True,
            timeout=90
        )

        if result.returncode != 0:
            raise RuntimeError(f"Squoosh failed: {result.stderr.decode()}")

        output = json.loads(result.stdout.decode().strip())
        data = base64.b64decode(output['data_base64'])
        return data, len(data)

    def _get_dimensions(self, image_data: bytes) -> Tuple[int, int]:
        """Return (width, height) of compressed image."""
        img = Image.open(BytesIO(image_data))
        return img.width, img.height

    def validate_total_size(self, slices: list) -> dict:
        """Validate total email size against Klaviyo recommendations."""
        total_size = sum(s['compressed_size'] for s in slices)
        target = KLAVIYO_LIMITS['total_email_target']

        return {
            'total_size': total_size,
            'total_size_kb': total_size // 1024,
            'target': target,
            'target_kb': target // 1024,
            'passed': total_size <= target,
            'status': 'passed' if total_size <= target else 'warning',
            'message': (
                f"Total: {total_size // 1024}KB — "
                f"{'✓ Good for email delivery' if total_size <= target else '⚠ Consider optimizing'}"
            )
        }
