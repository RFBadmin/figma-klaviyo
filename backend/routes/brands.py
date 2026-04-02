import json
import os
import tempfile
from contextlib import contextmanager

from flask import Blueprint, request, jsonify
from utils.encryption import encrypt_key, decrypt_key

brands_bp = Blueprint('brands', __name__)

DATABASE_URL = os.environ.get('DATABASE_URL')

# ─── Storage backend ──────────────────────────────────────────────────────────

if DATABASE_URL:
    import psycopg2
    import psycopg2.extras

    @contextmanager
    def _db():
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        try:
            yield conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        finally:
            conn.close()

    def _ensure_table():
        with _db() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS brands (
                    name TEXT PRIMARY KEY,
                    encrypted_key TEXT NOT NULL
                )
            """)

    _ensure_table()

    def _load() -> dict:
        with _db() as cur:
            cur.execute("SELECT name, encrypted_key FROM brands")
            return {row['name']: row['encrypted_key'] for row in cur.fetchall()}

    def _save(brands: dict) -> None:
        # Replace entire table with the provided dict (used only for rename/delete)
        with _db() as cur:
            cur.execute("DELETE FROM brands")
            for name, enc in brands.items():
                cur.execute(
                    "INSERT INTO brands (name, encrypted_key) VALUES (%s, %s)",
                    (name, enc)
                )

    def _upsert(name: str, encrypted: str) -> None:
        with _db() as cur:
            cur.execute("""
                INSERT INTO brands (name, encrypted_key) VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key
            """, (name, encrypted))

    def _delete(name: str) -> None:
        with _db() as cur:
            cur.execute("DELETE FROM brands WHERE name = %s", (name,))

    def _rename(old_name: str, new_name: str, encrypted: str) -> None:
        with _db() as cur:
            cur.execute("DELETE FROM brands WHERE name = %s", (old_name,))
            cur.execute(
                "INSERT INTO brands (name, encrypted_key) VALUES (%s, %s)",
                (new_name, encrypted)
            )

else:
    # Local dev fallback — JSON file
    BRANDS_FILE = os.environ.get(
        'BRANDS_FILE',
        os.path.join(os.path.dirname(__file__), '..', 'brands.json')
    )

    def _load() -> dict:
        try:
            with open(BRANDS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save(brands: dict) -> None:
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

    def _upsert(name: str, encrypted: str) -> None:
        brands = _load()
        brands[name] = encrypted
        _save(brands)

    def _delete(name: str) -> None:
        brands = _load()
        del brands[name]
        _save(brands)

    def _rename(old_name: str, new_name: str, encrypted: str) -> None:
        brands = _load()
        del brands[old_name]
        brands[new_name] = encrypted
        _save(brands)


# ─── Routes ───────────────────────────────────────────────────────────────────

@brands_bp.route('/api/brands', methods=['GET'])
def list_brands():
    brands = _load()
    return jsonify({'brands': sorted(brands.keys())})


@brands_bp.route('/api/brands/<name>/key', methods=['GET'])
def get_key(name: str):
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

    brands = _load()
    if name in brands:
        return jsonify({'error': f'Brand "{name}" already exists. Use a different name or edit the existing brand.'}), 409

    try:
        encrypted = encrypt_key(api_key)
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500

    _upsert(name, encrypted)
    return jsonify({'ok': True, 'name': name}), 201


@brands_bp.route('/api/brands/<name>', methods=['PUT'])
def update_brand(name: str):
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
        encrypted = brands[name]

    _rename(name, new_name, encrypted)
    return jsonify({'ok': True, 'name': new_name})


@brands_bp.route('/api/brands/<name>', methods=['DELETE'])
def delete_brand(name: str):
    brands = _load()
    if name not in brands:
        return jsonify({'error': f'Brand "{name}" not found'}), 404
    _delete(name)
    return jsonify({'ok': True})
