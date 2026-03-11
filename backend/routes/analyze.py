from flask import Blueprint, request, jsonify
from services.claude_vision import ClaudeVisionService

analyze_bp = Blueprint('analyze', __name__)
claude_service = ClaudeVisionService()


@analyze_bp.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Analyze an email design image with Claude Vision and return slice boundaries.

    Request body:
        image_base64 (str): Base64-encoded PNG of the email frame
        frame_width (int): Frame width in pixels
        frame_height (int): Frame height in pixels

    Response:
        slices (list): List of slice objects with name, y_start, y_end, alt_text
        analysis (str): Brief explanation of slicing decisions
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body required'}), 400

    image_base64 = data.get('image_base64')
    frame_width = data.get('frame_width')
    frame_height = data.get('frame_height')
    layer_bands = data.get('layer_bands')  # optional: pre-computed Figma layer bands

    if not image_base64:
        return jsonify({'error': 'image_base64 is required'}), 400
    if not frame_width or not frame_height:
        return jsonify({'error': 'frame_width and frame_height are required'}), 400

    try:
        result = claude_service.analyze_email_design(
            image_base64=image_base64,
            width=int(frame_width),
            height=int(frame_height),
            layer_bands=layer_bands or None
        )
        return jsonify(result)

    except ValueError as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 422
    except Exception as e:
        return jsonify({'error': f'Internal error: {str(e)}'}), 500
