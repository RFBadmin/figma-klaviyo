import os
import time
import tempfile
from pathlib import Path

BASE_URL = os.environ.get('BASE_URL', 'http://localhost:8080')
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'rfb_klaviyo_temp')
TTL_SECONDS = 3 * 60 * 60  # 3 hours


class TempStorage:
    """
    Stores compressed images in a temporary directory and serves them via URL.
    Files are cleaned up after TTL_SECONDS.
    """

    def __init__(self):
        os.makedirs(TEMP_DIR, exist_ok=True)

    def store(self, data: bytes, slice_id: str, fmt: str) -> str:
        """Save image bytes and return a temp URL."""
        ext = 'jpg' if 'jpeg' in fmt or 'jpg' in fmt else ('webp' if 'webp' in fmt else 'png')
        filename = f"{slice_id}_{int(time.time())}.{ext}"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, 'wb') as f:
            f.write(data)

        return f"{BASE_URL}/temp/{filename}"

    def retrieve_by_url(self, url: str) -> bytes | None:
        """Retrieve image bytes from a temp URL."""
        if not url:
            return None

        filename = url.split('/temp/')[-1]
        filepath = os.path.join(TEMP_DIR, filename)

        if not os.path.exists(filepath):
            return None

        with open(filepath, 'rb') as f:
            return f.read()

    def cleanup_old_files(self) -> int:
        """Delete files older than TTL. Returns count of deleted files."""
        cutoff = time.time() - TTL_SECONDS
        deleted = 0

        for path in Path(TEMP_DIR).glob('*'):
            if path.is_file() and path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
                deleted += 1

        return deleted


from flask import Blueprint, send_from_directory, abort

temp_bp = Blueprint('temp', __name__)

@temp_bp.route('/temp/<filename>')
def serve_temp_file(filename: str):
    """Serve a temporary compressed image file."""
    # Security: only allow safe filenames
    if '..' in filename or '/' in filename:
        abort(400)

    filepath = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(filepath):
        abort(404)

    return send_from_directory(TEMP_DIR, filename)
