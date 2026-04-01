from typing import List


def build_email_html(slices: List[dict]) -> str:
    """
    Generate Klaviyo USER_DRAGGABLE-compatible HTML from a list of slices.

    Full-width slices → one data-klaviyo-region per row with a klaviyo-image-block div.
    Vertical splits (slices sharing the same y_start/y_end) → one data-klaviyo-region
    wrapping a nested table so images sit flush with zero gap.
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
            # ── Standard full-width image block ──────────────────────────────
            s = row[0]
            link = _normalize_url(s.get('link') or '#')
            alt = _escape_html(s.get('alt_text') or s.get('name', ''))
            src = _image_url(s)
            slice_rows += f"""
        <tr>
          <td align="center" data-klaviyo-region="true" data-klaviyo-region-width-pixels="{EMAIL_WIDTH}" style="padding: 0;">
            <div class="klaviyo-block klaviyo-image-block">
              <a href="{link}" target="_blank" style="display: block;">
                <img src="{src}" alt="{alt}" width="{EMAIL_WIDTH}" class="slice-img"
                  style="display: block; width: 100%; max-width: {EMAIL_WIDTH}px; height: auto; border: 0;" />
              </a>
            </div>
          </td>
        </tr>"""

        else:
            # ── Vertical split: one region, nested table, zero gap ───────────
            # All cells go inside ONE klaviyo-image-block so Klaviyo doesn't add
            # per-cell padding (which caused the visible gap in the editor).
            frame_width = max((s.get('x_end') or EMAIL_WIDTH) for s in row) or EMAIL_WIDTH
            row_sorted = sorted(row, key=lambda s: s.get('x_start') or 0)

            # Widths must sum exactly to EMAIL_WIDTH — last cell gets the remainder
            widths: List[int] = []
            running = 0
            for i, s in enumerate(row_sorted):
                x_start = s.get('x_start') or 0
                x_end = s.get('x_end') or frame_width
                if i == len(row_sorted) - 1:
                    widths.append(EMAIL_WIDTH - running)
                else:
                    w = round(EMAIL_WIDTH * (x_end - x_start) / frame_width)
                    widths.append(w)
                    running += w

            # Inner cells: no whitespace between tags to prevent phantom gaps
            inner_cells = ""
            for s, cell_width in zip(row_sorted, widths):
                link = _normalize_url(s.get('link') or '#')
                alt = _escape_html(s.get('alt_text') or s.get('name', ''))
                src = _image_url(s)
                inner_cells += (
                    f'<td style="padding: 0; vertical-align: top;" width="{cell_width}">'
                    f'<a href="{link}" target="_blank" style="display: block; text-decoration: none;">'
                    f'<img src="{src}" alt="{alt}" width="{cell_width}" style="display: block; border: 0;" />'
                    f'</a></td>'
                )

            slice_rows += f"""
        <tr>
          <td align="center" data-klaviyo-region="true" data-klaviyo-region-width-pixels="{EMAIL_WIDTH}" style="padding: 0; font-size: 0; line-height: 0;">
            <div class="klaviyo-block klaviyo-image-block">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="{EMAIL_WIDTH}"><tr>{inner_cells}</tr></table>
            </div>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="{EMAIL_WIDTH}" class="email-container" style="max-width: {EMAIL_WIDTH}px;">
          {slice_rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _image_url(s: dict) -> str:
    return (
        s.get('klaviyo_url')
        or s.get('compressed_url')
        or (f"data:image/png;base64,{s['image_base64']}" if s.get('image_base64') else '')
    )


def _normalize_url(url: str) -> str:
    """Ensure URL has a safe protocol. Blocks javascript: and data: schemes."""
    if not url:
        return '#'
    url = url.strip()
    if not url or url == '#':
        return '#'
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
