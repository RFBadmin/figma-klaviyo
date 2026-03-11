from typing import List


def build_email_html(slices: List[dict]) -> str:
    """
    Generate Klaviyo-compatible HTML from a list of slices.
    Each slice becomes a full-width image block.
    """
    slice_rows = ""

    for slice_item in slices:
        link = slice_item.get('link') or '#'
        alt_text = slice_item.get('alt_text') or slice_item.get('name', '')
        image_url = slice_item.get('klaviyo_url') or slice_item.get('compressed_url') or ''

        slice_rows += f"""
        <tr>
          <td align="center" style="padding: 0;">
            <a href="{link}" target="_blank" style="display: block;">
              <img
                src="{image_url}"
                alt="{_escape_html(alt_text)}"
                width="600"
                style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;"
              />
            </a>
          </td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
          {slice_rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return html


def _escape_html(text: str) -> str:
    return (
        text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&#x27;')
    )
