import json
import os
import tempfile

from flask import Blueprint, request, jsonify
from utils.encryption import encrypt_key, decrypt_key

brands_bp = Blueprint('brands', __name__)

# Allow overriding via env var so Railway volume mounts work:
# Set BRANDS_FILE=/data/brands.json + mount a Railway Volume at /data
BRANDS_FILE = os.environ.get(
    'BRANDS_FILE',
    os.path.join(os.path.dirname(__file__), '..', 'brands.json')
)


def _load() -> dict:
    """Read brands.json, return {} if missing or corrupt."""
    try:
        with open(BRANDS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save(brands: dict) -> None:
    """Atomically write brands.json using a temp file in the same directory.

    Temp file and destination are on the same filesystem so os.replace()
    is a true atomic rename — no cross-device issues. Requires the parent
    directory to be writable by the process (ensured by entrypoint.sh chown).
    """
    brands_dir = os.path.dirname(os.path.abspath(BRANDS_FILE))
    fd, tmp = tempfile.mkstemp(dir=brands_dir, suffix='.json.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(brands, f, indent=2)
        os.replace(tmp, BRANDS_FILE)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


@brands_bp.route('/api/brands', methods=['GET'])
def list_brands():
    """Return sorted list of brand names (no keys)."""
    brands = _load()
    return jsonify({'brands': sorted(brands.keys())})


@brands_bp.route('/api/brands/<name>/key', methods=['GET'])
def get_key(name: str):
    """Return decrypted API key for the given brand."""
    brands = _load()
    if name not in brands:
        return jsonify({'error': f'Brand "{name}" not found'}), 404
    try:
        api_key = decrypt_key(brands[name])
    except Exception as e:
        return jsonify({'error': f'Failed to decrypt key: {e}'}), 500
    return jsonify({'apiKey': api_key})


@brands_bp.route('/api/brands', methods=['POST'])
def add_brand():
    """Add or update a brand. Body: {name, apiKey}"""
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    api_key = (data.get('apiKey') or '').strip()

    if not name:
        return jsonify({'error': 'name is required'}), 400
    if len(name) > 100:
        return jsonify({'error': 'name must be 100 characters or fewer'}), 400
    if not api_key:
        return jsonify({'error': 'apiKey is required'}), 400
    if not api_key.startswith('pk_') or len(api_key) < 10 or len(api_key) > 200:
        return jsonify({'error': 'apiKey must start with pk_ and be 10-200 characters'}), 400

    try:
        encrypted = encrypt_key(api_key)
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500

    brands = _load()
    brands[name] = encrypted
    _save(brands)
    return jsonify({'ok': True, 'name': name}), 201


@brands_bp.route('/api/brands/<name>', methods=['PUT'])
def update_brand(name: str):
    """Rename and/or re-key a brand. Body: {name?, apiKey?}"""
    brands = _load()
    if name not in brands:
        return jsonify({'error': f'Brand "{name}" not found'}), 404

    data = request.get_json() or {}
    new_name = (data.get('name') or '').strip() or name
    new_key = (data.get('apiKey') or '').strip()

    if new_key:
        if not new_key.startswith('pk_'):
            return jsonify({'error': 'apiKey must start with pk_'}), 400
        try:
            encrypted = encrypt_key(new_key)
        except RuntimeError as e:
            return jsonify({'error': str(e)}), 500
    else:
        encrypted = brands[name]  # keep existing encrypted value

    # Rename: remove old key, add new name
    del brands[name]
    brands[new_name] = encrypted
    _save(brands)
    return jsonify({'ok': True, 'name': new_name})


@brands_bp.route('/api/brands/<name>', methods=['DELETE'])
def delete_brand(name: str):
    """Delete a brand."""
    brands = _load()
    if name not in brands:
        return jsonify({'error': f'Brand "{name}" not found'}), 404
    del brands[name]
    _save(brands)
    return jsonify({'ok': True})
