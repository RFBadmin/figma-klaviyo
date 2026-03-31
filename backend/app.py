import logging
import os
import traceback

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

from routes.analyze import analyze_bp
from routes.compress import compress_bp
from routes.klaviyo import klaviyo_bp
from routes.brands import brands_bp
from utils.storage import temp_bp, TempStorage

app = Flask(__name__)

# ── Security ──────────────────────────────────────────────────────────────────
# 50 MB max request body — prevents memory exhaustion from oversized base64 payloads
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# CORS: only allow Figma plugin origins (not wildcard *)
CORS(app, resources={r"/api/*": {
    "origins": [
        "https://www.figma.com",
        "https://figma.com",
        "null",  # Figma plugin iframes send Origin: null
    ]
}})

# ── Auth middleware for expensive endpoints ───────────────────────────────────
PLUGIN_SECRET = os.environ.get('PLUGIN_SECRET', '')

@app.before_request
def check_plugin_auth():
    """Require X-Plugin-Secret header on expensive endpoints (analyze, compress, brands)."""
    from flask import request
    # Skip auth if no secret configured (local dev)
    if not PLUGIN_SECRET:
        return None
    # Only protect expensive/sensitive endpoints
    protected = ('/api/analyze', '/api/compress', '/api/brands')
    if not any(request.path.startswith(p) for p in protected):
        return None
    token = request.headers.get('X-Plugin-Secret', '')
    if token != PLUGIN_SECRET:
        return jsonify({'error': 'Unauthorized'}), 401


# ── Global error handler ─────────────────────────────────────────────────────
@app.errorhandler(413)
def request_too_large(e):
    return jsonify({'error': 'Request body too large (max 50MB)'}), 413


@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f'Unhandled exception: {e}')
    traceback.print_exc()
    return jsonify({'error': f'Internal server error: {str(e)}'}), 500


# ── Register blueprints ──────────────────────────────────────────────────────
app.register_blueprint(analyze_bp)
app.register_blueprint(compress_bp)
app.register_blueprint(klaviyo_bp)
app.register_blueprint(brands_bp)
app.register_blueprint(temp_bp)

# ── Temp cleanup storage instance ────────────────────────────────────────────
_temp_storage = TempStorage()


@app.route('/health')
def health():
    deleted = _temp_storage.cleanup_old_files()
    return {'status': 'ok', 'temp_files_cleaned': deleted}


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', '0') == '1')
