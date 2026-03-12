import base64
import json
import os
import subprocess
from dataclasses import dataclass, field
from typing import List


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
        mb = self.compressed_size / (1024 * 1024)
        if mb > 5:
            return 'failed'   # exceeds Klaviyo 5MB hard limit
        kb = self.compressed_size / 1024
        if kb <= 200:
            return 'optimal'  # great for email delivery
        if kb <= 1024:
            return 'good'     # acceptable
        return 'warning'      # large but within Klaviyo limit


KLAVIYO_LIMITS = {
    'max_file_size': 5 * 1024 * 1024,   # 5MB — Klaviyo API hard limit
    'target_file_size': 200 * 1024,      # 200KB — good for email delivery
    'warn_file_size': 1024 * 1024,       # 1MB — flag as large
    'total_email_target': 500 * 1024,
}

_SCRIPT = os.path.join(os.path.dirname(__file__), '..', 'compress_sharp.js')


class SquooshService:
    def compress_batch(
        self,
        slices: List[dict],
        target_size: int = 100 * 1024,
        max_size: int = 200 * 1024,
        quality: int = 82,
        format: str = 'auto',
    ) -> List[CompressionResult]:
        """Compress all slices in one Sharp subprocess call."""
        payload = json.dumps({
            'slices': slices,
            'settings': {
                'quality': quality,
                'target_size_kb': target_size // 1024,
                'max_size_kb': max_size // 1024,
                'format': format,
            }
        })

        proc = subprocess.run(
            ['node', _SCRIPT],
            input=payload,
            capture_output=True,
            text=True,
            timeout=120
        )

        if proc.returncode != 0:
            raise RuntimeError(f"Sharp failed: {proc.stderr[:500]}")

        output = json.loads(proc.stdout)
        results = []
        for r in output['results']:
            compressed_bytes = base64.b64decode(r['compressed_data'])
            passed = r['compressed_size'] <= KLAVIYO_LIMITS['max_file_size']
            warnings = []
            if not passed:
                warnings.append(f"Exceeds 5MB Klaviyo limit ({r['compressed_size'] // 1024}KB) — consider splitting this slice")
            elif r['compressed_size'] > KLAVIYO_LIMITS['warn_file_size']:
                warnings.append(f"Large file ({r['compressed_size'] // 1024}KB) — may load slowly on mobile")

            results.append(CompressionResult(
                data=compressed_bytes,
                format=r['format'],
                original_size=r['original_size'],
                compressed_size=r['compressed_size'],
                width=r['width'],
                height=r['height'],
                passed_validation=passed,
                warnings=warnings,
            ))
        return results

    def compress_image(
        self,
        image_bytes: bytes,
        filename: str,
        target_size: int = 100 * 1024,
        max_size: int = 200 * 1024,
        quality: int = 82,
        format: str = 'auto',
    ) -> CompressionResult:
        name = filename.rsplit('.', 1)[0]
        results = self.compress_batch(
            [{'id': 'single', 'name': name, 'image_base64': base64.b64encode(image_bytes).decode()}],
            target_size=target_size,
            max_size=max_size,
            quality=quality,
            format=format,
        )
        return results[0]

    def validate_total_size(self, slices: list) -> dict:
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
