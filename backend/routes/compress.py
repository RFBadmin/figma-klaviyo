import base64
from flask import Blueprint, request, jsonify
from services.squoosh import SquooshService
from utils.storage import TempStorage

compress_bp = Blueprint('compress', __name__)
squoosh_service = SquooshService()
storage = TempStorage()


@compress_bp.route('/api/compress', methods=['POST'])
def compress():
    """
    Compress a batch of image slices using Squoosh CLI.

    Request body:
        slices (list): List of {id, name, image_base64}
        settings (dict): {target_size_kb, max_size_kb}

    Response:
        compressed (list): Per-slice compression results with temp_url
        summary (dict): Aggregate stats
        validation (dict): Total email size validation
        recommendations (list): Suggestions for over-limit slices
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    slices = data.get('slices', [])
    settings = data.get('settings', {})

    if not slices:
        return jsonify({'error': 'slices array is required'}), 400

    target_kb = int(settings.get('target_size_kb', 100))
    max_kb = int(settings.get('max_size_kb', 200))
    target_bytes = target_kb * 1024
    max_bytes = max_kb * 1024

    compressed_results = []
    recommendations = []

    for slice_item in slices:
        slice_id = slice_item.get('id', '')
        slice_name = slice_item.get('name', 'slice')
        image_b64 = slice_item.get('image_base64', '')

        try:
            image_bytes = base64.b64decode(image_b64)
        except Exception:
            return jsonify({'error': f'Invalid base64 for slice "{slice_name}"'}), 400

        result = squoosh_service.compress_image(
            image_bytes=image_bytes,
            filename=f"{slice_name}.png",
            target_size=target_bytes,
            max_size=max_bytes
        )

        # Store compressed image and get temp URL
        temp_url = storage.store(result.data, slice_id, result.format)

        compressed_results.append({
            'id': slice_id,
            'name': slice_name,
            'original_size': result.original_size,
            'compressed_size': result.compressed_size,
            'reduction_percent': result.reduction_percent,
            'width': result.width,
            'height': result.height,
            'format': result.format,
            'status': result.status,
            'warnings': result.warnings,
            'temp_url': temp_url,
            'passed_validation': result.passed_validation
        })

        if not result.passed_validation:
            recommendations.append({
                'slice': slice_name,
                'issue': f'{result.compressed_size // 1024}KB exceeds {max_kb}KB limit',
                'suggestion': f'Consider splitting "{slice_name}" into smaller sections'
            })
        elif result.compressed_size > target_bytes:
            recommendations.append({
                'slice': slice_name,
                'issue': f'{result.compressed_size // 1024}KB exceeds {target_kb}KB target',
                'suggestion': f'Consider splitting at a natural boundary within "{slice_name}"'
            })

    # Build summary
    total_original = sum(r['original_size'] for r in compressed_results)
    total_compressed = sum(r['compressed_size'] for r in compressed_results)
    total_reduction = round((1 - total_compressed / total_original) * 100) if total_original else 0

    summary = {
        'total_original': total_original,
        'total_compressed': total_compressed,
        'total_reduction_percent': total_reduction,
        'slice_count': len(compressed_results),
        'passed_count': sum(1 for r in compressed_results if r['passed_validation']),
        'warning_count': sum(1 for r in compressed_results if r['status'] == 'warning'),
        'failed_count': sum(1 for r in compressed_results if not r['passed_validation'])
    }

    validation = squoosh_service.validate_total_size(compressed_results)

    return jsonify({
        'compressed': compressed_results,
        'summary': summary,
        'validation': validation,
        'recommendations': recommendations
    })
