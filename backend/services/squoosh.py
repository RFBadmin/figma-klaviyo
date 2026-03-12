import tempfile
from io import BytesIO
from PIL import Image
from typing import Tuple
from dataclasses import dataclass, field


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
        Compress image using Pillow with Klaviyo optimization.
        Implements progressive compression to meet size targets.
        No resizing is performed — original dimensions are preserved.
        """
        img = Image.open(BytesIO(image_bytes))
        original_size = len(image_bytes)

        format_type, quality = self._analyze_image_pil(img)
        compressed_data = image_bytes
        final_size = original_size

        for attempt in range(5):
            compressed_data, final_size = self._compress_pil(img, format_type, quality)

            if final_size <= target_size:
                break
            elif final_size <= max_size and attempt >= 2:
                break
            elif format_type == 'png' and final_size > max_size:
                # PNG can't be quality-reduced → switch to JPEG
                format_type = 'jpeg'
                quality = 82
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

    def _analyze_image_pil(self, img: Image.Image) -> Tuple[str, int]:
        """Determine optimal format and starting quality from image content."""
        if img.width * img.height > 500_000:
            img_sample = img.resize((500, 500))
            colors = img_sample.getcolors(maxcolors=50_000)
        else:
            colors = img.getcolors(maxcolors=50_000)

        if colors is None:
            return ('jpeg', 82)

        unique_colors = len(colors)

        if unique_colors < 256:
            return ('png', 0)   # simple graphic → lossless PNG
        elif unique_colors < 5_000:
            return ('png', 0)
        else:
            return ('jpeg', 82)

    def _compress_pil(self, img: Image.Image, format_type: str, quality: int) -> Tuple[bytes, int]:
        """Compress using Pillow. Returns (bytes, size)."""
        output = BytesIO()

        if format_type == 'jpeg':
            # JPEG needs RGB — flatten any transparency onto white
            if img.mode in ('RGBA', 'LA', 'P'):
                bg = Image.new('RGB', img.size, (255, 255, 255))
                src = img.convert('RGBA') if img.mode == 'P' else img
                if src.mode in ('RGBA', 'LA'):
                    bg.paste(src, mask=src.split()[-1])
                else:
                    bg.paste(src)
                img_out = bg
            else:
                img_out = img.convert('RGB')
            img_out.save(output, 'JPEG', quality=quality, optimize=True, progressive=True)
        else:
            # PNG — lossless, just maximize compression
            img.save(output, 'PNG', optimize=True, compress_level=9)

        data = output.getvalue()
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
