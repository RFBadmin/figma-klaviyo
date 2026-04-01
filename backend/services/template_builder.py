from typing import List


def build_email_html(slices: List[dict]) -> str:
    """
    Generate Klaviyo-compatible HTML from a list of slices.
    Full-width slices become individual <tr> rows.
    Vertical splits (slices sharing the same y_start/y_end) are rendered
    as a single <tr> with multiple <td> cells side by side.
    """
    # Group slices into rows: slices with the same (y_start, y_end) share a row.
    rows: List[List[dict]] = []
    row_key_index: dict = {}
    for s in slices:
        key = (s.get('y_start', 0), s.get('y_end', 0))
        if key not in row_key_index:
            row_key_index[key] = len(rows)
            rows.append([s])
        else:
            rows[row_key_index[key]].append(s)

    slice_rows = ""

    EMAIL_WIDTH = 600

    for row in rows:
        if len(row) == 1:
            # Standard full-width slice
            slice_item = row[0]
            link = _normalize_url(slice_item.get('link') or '#')
            alt_text = slice_item.get('alt_text') or slice_item.get('name', '')
            image_url = (
                slice_item.get('klaviyo_url')
                or slice_item.get('compressed_url')
                or (f"data:image/png;base64,{slice_item['image_base64']}" if slice_item.get('image_base64') else '')
            )
            slice_rows += f"""
        <tr>
          <td align="center" data-klaviyo-region="true" data-klaviyo-region-width-pixels="{EMAIL_WIDTH}" style="padding: 0;">
            <div class="klaviyo-block klaviyo-image-block">
              <a href="{link}" target="_blank" style="display: block;">
                <img
                  src="{image_url}"
                  alt="{_escape_html(alt_text)}"
                  width="{EMAIL_WIDTH}"
                  class="slice-img"
                  style="display: block; width: 100%; max-width: {EMAIL_WIDTH}px; height: auto; border: 0;"
                />
              </a>
            </div>
          </td>
        </tr>"""
        else:
            # Vertical split: compute each cell's pixel width proportionally
            # Derive frame width from the rightmost x_end, defaulting to EMAIL_WIDTH
            frame_width = max((s.get('x_end') or EMAIL_WIDTH) for s in row) or EMAIL_WIDTH
            # Sort left to right
            row_sorted = sorted(row, key=lambda s: s.get('x_start') or 0)

            cells = ""
            for slice_item in row_sorted:
                x_start = slice_item.get('x_start') or 0
                x_end = slice_item.get('x_end') or frame_width
                cell_width = round(EMAIL_WIDTH * (x_end - x_start) / frame_width)
                link = _normalize_url(slice_item.get('link') or '#')
                alt_text = slice_item.get('alt_text') or slice_item.get('name', '')
                image_url = (
                    slice_item.get('klaviyo_url')
                    or slice_item.get('compressed_url')
                    or (f"data:image/png;base64,{slice_item['image_base64']}" if slice_item.get('image_base64') else '')
                )
                cells += f"""
            <td align="center" data-klaviyo-region="true" data-klaviyo-region-width-pixels="{cell_width}" style="padding: 0; width: {cell_width}px;">
              <div class="klaviyo-block klaviyo-image-block">
                <a href="{link}" target="_blank" style="display: block;">
                  <img
                    src="{image_url}"
                    alt="{_escape_html(alt_text)}"
                    width="{cell_width}"
                    class="slice-img"
                    style="display: block; width: 100%; max-width: {cell_width}px; height: auto; border: 0;"
                  />
                </a>
              </div>
            </td>"""

            slice_rows += f"""
        <tr>{cells}
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
    """Ensure URL has a safe protocol. Blocks javascript: and data: schemes."""
    if not url:
        return '#'
    url = url.strip()
    if not url or url == '#':
        return '#'
    # Block dangerous schemes
    lower = url.lower().lstrip()
    if lower.startswith(('javascript:', 'data:', 'vbscript:')):
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
