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
            # Vertical split — each column is its own data-klaviyo-region so
            # Klaviyo's USER_DRAGGABLE editor renders each image as a separate
            # editable block. They sit side-by-side inside a zero-gap table.
            # NOTE: NO align="center" on cells — that was the original gap cause.
            frame_width = max((s.get('x_end') or EMAIL_WIDTH) for s in row) or EMAIL_WIDTH
            row_sorted = sorted(row, key=lambda s: s.get('x_start') or 0)

            # Widths must sum exactly to EMAIL_WIDTH — last cell takes the remainder
            widths = []
            running = 0
            for i, s in enumerate(row_sorted):
                if i == len(row_sorted) - 1:
                    widths.append(EMAIL_WIDTH - running)
                else:
                    x_start = s.get('x_start') or 0
                    x_end = s.get('x_end') or frame_width
                    w = round(EMAIL_WIDTH * (x_end - x_start) / frame_width)
                    widths.append(w)
                    running += w

            cells = ""
            for slice_item, cell_width in zip(row_sorted, widths):
                link = _normalize_url(slice_item.get('link') or '#')
                alt_text = slice_item.get('alt_text') or slice_item.get('name', '')
                image_url = (
                    slice_item.get('klaviyo_url')
                    or slice_item.get('compressed_url')
                    or (f"data:image/png;base64,{slice_item['image_base64']}" if slice_item.get('image_base64') else '')
                )
                # Each td has its own region — no align="center", fixed px width on img
                cells += (
                    f'<td data-klaviyo-region="true" data-klaviyo-region-width-pixels="{cell_width}" '
                    f'style="padding: 0; vertical-align: top;" width="{cell_width}">'
                    f'<div class="klaviyo-block klaviyo-image-block">'
                    f'<a href="{link}" target="_blank" style="display: block;">'
                    f'<img src="{image_url}" alt="{_escape_html(alt_text)}" width="{cell_width}" '
                    f'style="display: block; width: {cell_width}px; border: 0;" />'
                    f'</a></div></td>'
                )

            slice_rows += f"""
        <tr>
          <td style="padding: 0; font-size: 0; line-height: 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="{EMAIL_WIDTH}"><tr>{cells}</tr></table>
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
