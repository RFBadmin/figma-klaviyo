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
