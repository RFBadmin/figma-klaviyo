import base64
from flask import Blueprint, request, jsonify
from services.klaviyo_client import KlaviyoClient
from services.template_builder import build_email_html
from utils.storage import TempStorage

klaviyo_bp = Blueprint('klaviyo', __name__)
storage = TempStorage()


def _get_klaviyo_client(req) -> tuple[KlaviyoClient | None, tuple | None]:
    """
    Extract Klaviyo Private API key from X-Klaviyo-Key header.
    Returns (client, None) on success, (None, error_response) on failure.
    """
    api_key = req.headers.get('X-Klaviyo-Key', '').strip()
    if not api_key or not api_key.startswith('pk_'):
        return None, (jsonify({'error': 'Missing or invalid Klaviyo API key. Send your Private API key in the X-Klaviyo-Key header.'}), 401)
    return KlaviyoClient(api_key), None


@klaviyo_bp.route('/api/klaviyo/lists', methods=['GET'])
def get_lists():
    """Return all Klaviyo lists for the authenticated user."""
    client, err = _get_klaviyo_client(request)
    if err:
        return err

    try:
        lists = client.get_lists()
        return jsonify({'lists': lists})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@klaviyo_bp.route('/api/klaviyo/preview', methods=['POST'])
def preview_html():
    """Generate and return preview HTML for the given slices. No API key required."""
    data = request.get_json()
    slices = data.get('slices', [])
    html = build_email_html(slices)
    return jsonify({'html': html})


@klaviyo_bp.route('/api/klaviyo/push', methods=['POST'])
def push():
    """
    Full push flow:
    1. Upload each slice image to Klaviyo CDN
    2. Build HTML template
    3. Create template in Klaviyo
    4. Optionally create campaign

    Request body:
        slices (list): Slice objects with temp_url or image_base64
        config (dict): {mode, templateName, campaignName, subject, previewText, listId, sendTime}

    Headers:
        X-Klaviyo-Key: Klaviyo Private API key (pk_...)
    """
    client, err = _get_klaviyo_client(request)
    if err:
        return err

    data = request.get_json()
    slices = data.get('slices', [])
    config = data.get('config', {})

    if not slices:
        return jsonify({'error': 'slices is required'}), 400

    template_name = config.get('templateName', 'Untitled Email')

    try:
        # ── Step 1: Upload images to Klaviyo CDN ────────────────────────────
        uploaded_slices = []
        for i, slice_item in enumerate(slices):
            image_bytes = _get_slice_image(slice_item)
            if not image_bytes:
                return jsonify({'error': f'No image data for slice "{slice_item.get("name")}"'}), 400

            ext = 'jpg'
            filename = f"{template_name.lower().replace(' ', '_')}_{slice_item.get('name', f'slice_{i}')}_{i}.{ext}"
            klaviyo_url = client.upload_image(image_bytes, filename)

            uploaded_slices.append({
                **slice_item,
                'klaviyo_url': klaviyo_url
            })

        # ── Step 2: Build HTML ───────────────────────────────────────────────
        html = build_email_html(uploaded_slices)

        # ── Step 3: Create Template ──────────────────────────────────────────
        template_result = client.create_template(name=template_name, html_content=html)
        template_id = template_result['data']['id']
        template_url = f"https://www.klaviyo.com/email-editor/{template_id}"

        response = {
            'templateId': template_id,
            'templateUrl': template_url
        }

        # ── Step 4: Create Campaign (optional) ──────────────────────────────
        if config.get('mode') == 'campaign':
            list_id = config.get('listId', '')
            if not list_id:
                return jsonify({'error': 'listId is required for campaign mode'}), 400

            campaign_result = client.create_campaign(
                name=config.get('campaignName', template_name),
                subject=config.get('subject', ''),
                preview_text=config.get('previewText', ''),
                list_id=list_id,
                template_id=template_id,
                send_time=config.get('sendTime')
            )
            campaign_id = campaign_result['data']['id']
            response['campaignId'] = campaign_id
            response['campaignUrl'] = f"https://www.klaviyo.com/campaigns/{campaign_id}"

        return jsonify(response)

    except Exception as e:
        # Surface the actual Klaviyo API error message
        detail = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                detail = e.response.json()
            except Exception:
                detail = e.response.text
        return jsonify({'error': 'Klaviyo API error', 'detail': detail}), 502


def _get_slice_image(slice_item: dict) -> bytes | None:
    """Retrieve image bytes from temp storage or base64.
    Slices saved to Figma metadata use 'compressed_url'; raw compress responses use 'temp_url'.
    """
    temp_url = slice_item.get('compressed_url') or slice_item.get('temp_url', '')
    if temp_url:
        stored = storage.retrieve_by_url(temp_url)
        if stored:
            return stored

    b64 = slice_item.get('image_base64', '')
    if b64:
        try:
            return base64.b64decode(b64)
        except Exception:
            return None

    return None
