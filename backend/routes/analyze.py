import traceback

from flask import Blueprint, request, jsonify
from services.claude_vision import ClaudeVisionService

analyze_bp = Blueprint('analyze', __name__)


def _get_service():
    """Lazy-init so a bad API key doesn't crash every other route on startup."""
    return ClaudeVisionService()


@analyze_bp.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body required'}), 400

    image_base64 = data.get('image_base64')
    frame_width = data.get('frame_width')
    frame_height = data.get('frame_height')
    layer_bands = data.get('layer_bands')

    if not image_base64:
        return jsonify({'error': 'image_base64 is required'}), 400
    if not frame_width or not frame_height:
        return jsonify({'error': 'frame_width and frame_height are required'}), 400

    # Validate dimensions
    try:
        frame_width = int(frame_width)
        frame_height = int(frame_height)
        if frame_width <= 0 or frame_height <= 0 or frame_height > 20000:
            return jsonify({'error': 'frame dimensions must be positive and height ≤ 20000px'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'frame_width and frame_height must be integers'}), 400

    # Validate base64 size (rough check: 50MB base64 ≈ 37MB image)
    if len(image_base64) > 50 * 1024 * 1024:
        return jsonify({'error': 'image_base64 too large (max ~50MB)'}), 400

    # Validate layer_bands structure if provided
    if layer_bands:
        if not isinstance(layer_bands, list):
            return jsonify({'error': 'layer_bands must be an array'}), 400
        for i, band in enumerate(layer_bands):
            if not isinstance(band, dict) or 'y_start' not in band or 'y_end' not in band or 'name' not in band:
                return jsonify({'error': f'layer_bands[{i}] must have y_start, y_end, and name'}), 400

    try:
        service = _get_service()
        result = service.analyze_email_design(
            image_base64=image_base64,
            width=int(frame_width),
            height=int(frame_height),
            layer_bands=layer_bands or None
        )
        return jsonify(result)

    except ValueError as e:
        print(f'[analyze] ValueError: {e}')
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 422
    except Exception as e:
        print(f'[analyze] Exception: {e}')
        traceback.print_exc()
        return jsonify({'error': f'Internal error: {str(e)}'}), 500
