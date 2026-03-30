from typing import List


def build_email_html(slices: List[dict]) -> str:
    """
    Generate Klaviyo-compatible HTML from a list of slices.
    Each slice becomes a full-width image block editable in Klaviyo's drag-and-drop editor.
    """
    slice_rows = ""

    for slice_item in slices:
        link = _normalize_url(slice_item.get('link') or '#')
        alt_text = slice_item.get('alt_text') or slice_item.get('name', '')
        image_url = (
            slice_item.get('klaviyo_url')
            or slice_item.get('compressed_url')
            or (f"data:image/png;base64,{slice_item['image_base64']}" if slice_item.get('image_base64') else '')
        )

        slice_rows += f"""
        <tr>
          <td align="center" data-klaviyo-region="true" data-klaviyo-region-width-pixels="600" style="padding: 0;">
            <div class="klaviyo-block klaviyo-image-block">
              <a href="{link}" target="_blank" style="display: block;">
                <img
                  src="{image_url}"
                  alt="{_escape_html(alt_text)}"
                  width="600"
                  class="slice-img"
                  style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;"
                />
              </a>
            </div>
          </td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
  <style>
    @media only screen and (max-width: 620px) {{
      .email-container {{ width: 100% !important; max-width: 100% !important; }}
      .slice-img {{ width: 100% !important; max-width: 100% !important; height: auto !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px;">
          {slice_rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return html


def _normalize_url(url: str) -> str:
    """Ensure URL has a protocol. Handles youtube.com, www.example.com, etc."""
    if not url:
        return '#'
    url = url.strip()
    if not url or url == '#':
        return '#'
    if url.startswith(('http://', 'https://', 'mailto:', '//')):
        return url
    return f'https://{url}'


def _escape_html(text: str) -> str:
    return (
        text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&#x27;')
    )
