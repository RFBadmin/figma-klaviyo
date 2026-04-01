import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import type { Slice } from '../types';

interface Props {
  slices: Slice[];
  frameHeight: number;
  frameWidth: number;
  imageBase64?: string | null;
  onSlicesChange: (slices: Slice[]) => void;
  onReanalyze: () => void;
}

const PREVIEW_WIDTH = 280;

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function SlicePreview({ slices, frameHeight, frameWidth, imageBase64, onSlicesChange, onReanalyze }: Props) {
  const [dragging, setDragging] = useState<{ index: number; startY: number; startEnd: number } | null>(null);
  const [draggingX, setDraggingX] = useState<{ leftIdx: number; rightIdx: number; startX: number; startXEnd: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const scale = PREVIEW_WIDTH / (frameWidth || 600);
  const previewHeight = Math.round(frameHeight * scale);

  // ── Horizontal boundary drag (y_end of slice i / y_start of slice i+1) ──────
  const handleDragStart = useCallback((e: MouseEvent, index: number) => {
    e.preventDefault();
    setDragging({ index, startY: e.clientY, startEnd: slices[index].y_end });

    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - e.clientY;
      const newEnd = Math.round(slices[index].y_end + dy / scale);
      const clamped = Math.max(slices[index].y_start + 20, Math.min(
        index < slices.length - 1 ? slices[index + 1].y_end - 20 : frameHeight,
        newEnd
      ));
      const updated = slices.map((s, i) => {
        if (i === index) return { ...s, y_end: clamped };
        if (i === index + 1) return { ...s, y_start: clamped };
        return s;
      });
      onSlicesChange(updated);
    };

    const onUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [slices, frameHeight, scale, onSlicesChange]);

  // ── Vertical boundary drag (x_end of left / x_start of right in same row) ──
  const handleXDragStart = useCallback((e: MouseEvent, leftIdx: number, rightIdx: number) => {
    e.preventDefault();
    const leftSlice = slices[leftIdx];
    setDraggingX({ leftIdx, rightIdx, startX: e.clientX, startXEnd: leftSlice.x_end ?? frameWidth });

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - e.clientX;
      const leftSlice = slices[leftIdx];
      const rightSlice = slices[rightIdx];
      const newXEnd = Math.round((leftSlice.x_end ?? frameWidth) + dx / scale);
      const minX = (leftSlice.x_start ?? 0) + 30;
      const maxX = (rightSlice.x_end ?? frameWidth) - 30;
      const clamped = Math.max(minX, Math.min(maxX, newXEnd));
      const updated = slices.map((s, i) => {
        if (i === leftIdx) return { ...s, x_end: clamped };
        if (i === rightIdx) return { ...s, x_start: clamped };
        return s;
      });
      onSlicesChange(updated);
    };

    const onUp = () => {
      setDraggingX(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [slices, frameWidth, scale, onSlicesChange]);

  // ── Horizontal split (top/bottom) ──────────────────────────────────────────
  const handleSplitSlice = useCallback((index: number) => {
    const slice = slices[index];
    if (slice.y_end - slice.y_start < 40) return;
    const midY = Math.round((slice.y_start + slice.y_end) / 2);
    const newSlice: Slice = {
      id: generateId(),
      name: `section_${slices.length + 1}`,
      y_start: midY,
      y_end: slice.y_end,
      x_start: slice.x_start,
      x_end: slice.x_end,
      alt_text: 'New section'
    };
    const updated = [
      ...slices.slice(0, index),
      { ...slice, y_end: midY },
      newSlice,
      ...slices.slice(index + 1)
    ];
    onSlicesChange(updated);
  }, [slices, onSlicesChange]);

  // ── Vertical split (left/right) ─────────────────────────────────────────────
  const handleVSplitSlice = useCallback((index: number) => {
    const slice = slices[index];
    const xStart = slice.x_start ?? 0;
    const xEnd = slice.x_end ?? frameWidth;
    if (xEnd - xStart < 60) return; // min 30px per half
    const midX = Math.round((xStart + xEnd) / 2);
    const left: Slice = { ...slice, id: generateId(), name: `${slice.name}_L`, x_start: xStart, x_end: midX };
    const right: Slice = { ...slice, id: generateId(), name: `${slice.name}_R`, x_start: midX, x_end: xEnd };
    const updated = [...slices.slice(0, index), left, right, ...slices.slice(index + 1)];
    onSlicesChange(updated);
  }, [slices, frameWidth, onSlicesChange]);

  const handleDelete = useCallback((id: string) => {
    const idx = slices.findIndex(s => s.id === id);
    if (idx === -1 || slices.length <= 1) return;

    const slice = slices[idx];
    const updated = slices.filter((_, i) => i !== idx);

    // If removing a vertical split, extend the sibling to take full width
    const sameRow = updated.filter(s => s.y_start === slice.y_start && s.y_end === slice.y_end);
    if (sameRow.length === 1) {
      // Only one left in the row — reset it to full width
      const siblingIdx = updated.findIndex(s => s.id === sameRow[0].id);
      updated[siblingIdx] = { ...updated[siblingIdx], x_start: undefined, x_end: undefined };
    }

    // Extend the previous y-slice to cover deleted slice's y range (when no sibling)
    if (sameRow.length === 0) {
      if (idx > 0) {
        updated[idx - 1] = { ...updated[idx - 1], y_end: slice.y_end };
      } else if (updated.length > 0) {
        updated[0] = { ...updated[0], y_start: slice.y_start };
      }
    }

    onSlicesChange(updated);
  }, [slices, onSlicesChange]);

  const handleRename = useCallback((id: string, name: string) => {
    onSlicesChange(slices.map(s => s.id === id ? { ...s, name, alt_text: name } : s));
    setEditingId(null);
  }, [slices, onSlicesChange]);

  return (
    <div class="slice-preview">
      <div class="preview-header">
        <span>Slices: {slices.length}</span>
        <span>Est. Size: ~{estimateSize(slices, frameHeight, frameWidth)} KB</span>
      </div>

      <div
        class="preview-canvas"
        style={{ width: PREVIEW_WIDTH, height: previewHeight, position: 'relative', overflow: 'hidden', background: '#f0f0f0', border: '1px solid #ccc' }}
      >
        {imageBase64 && (
          <img
            src={`data:image/png;base64,${imageBase64}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }}
          />
        )}
        {slices.map((slice, i) => {
          const top = Math.round(slice.y_start * scale);
          const height = Math.round((slice.y_end - slice.y_start) * scale);
          const left = Math.round((slice.x_start ?? 0) * scale);
          const width = Math.round(((slice.x_end ?? frameWidth) - (slice.x_start ?? 0)) * scale);

          // Detect if the next slice is a vertical sibling (same y range)
          const nextSlice = slices[i + 1];
          const hasXSibling = nextSlice && nextSlice.y_start === slice.y_start && nextSlice.y_end === slice.y_end;
          // Detect if this is a horizontally-adjacent pair needing a y drag handle
          const isLastInRow = !hasXSibling;
          const rowEnd = slice.y_end;
          const nextIsNewRow = nextSlice && nextSlice.y_start !== slice.y_start;
          const showYHandle = isLastInRow && nextSlice && nextIsNewRow;

          return (
            <div
              key={slice.id}
              style={{
                position: 'absolute', top, left, width, height,
                borderBottom: '2px dashed #0099ff',
                borderRight: hasXSibling ? '2px dashed #ff9900' : undefined,
                boxSizing: 'border-box'
              }}
            >
              {/* Slice label */}
              <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 10, color: '#333', display: 'flex', alignItems: 'center', gap: 4, zIndex: 6 }}>
                {editingId === slice.id ? (
                  <input
                    autoFocus
                    defaultValue={slice.name}
                    style={{ fontSize: 10, border: '1px solid #0099ff', padding: '1px 2px', width: 70 }}
                    onBlur={(e) => handleRename(slice.id, (e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(slice.id, (e.target as HTMLInputElement).value);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <span onDblClick={() => setEditingId(slice.id)} style={{ cursor: 'pointer' }}>{slice.name}</span>
                )}
                {slices.length > 1 && (
                  <button
                    onClick={() => handleDelete(slice.id)}
                    style={{ fontSize: 9, padding: '0 3px', cursor: 'pointer', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 2 }}
                  >✕</button>
                )}
              </div>

              {/* Action buttons (horizontal + and vertical |) */}
              <div style={{ position: 'absolute', right: hasXSibling ? 6 : 2, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 2, zIndex: 5 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSplitSlice(i); }}
                  title="Split horizontally (top/bottom)"
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#0099ff', color: '#fff', border: 'none',
                    fontSize: 12, lineHeight: '16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0.85, padding: 0
                  }}
                >+</button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleVSplitSlice(i); }}
                  title="Split vertically (left/right)"
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#ff9900', color: '#fff', border: 'none',
                    fontSize: 11, lineHeight: '16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0.85, padding: 0
                  }}
                >|</button>
              </div>

              {/* Horizontal drag handle (y boundary below, between rows) */}
              {showYHandle && (
                <div
                  style={{
                    position: 'absolute', bottom: -4, left: 0, right: 0, height: 8,
                    cursor: 'ns-resize', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onMouseDown={(e) => handleDragStart(e as unknown as MouseEvent, i)}
                >
                  <div style={{ width: 24, height: 4, background: '#0099ff', borderRadius: 2 }} />
                </div>
              )}

              {/* Vertical drag handle (x boundary between side-by-side slices) */}
              {hasXSibling && (
                <div
                  style={{
                    position: 'absolute', right: -4, top: 0, bottom: 0, width: 8,
                    cursor: 'ew-resize', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onMouseDown={(e) => handleXDragStart(e as unknown as MouseEvent, i, i + 1)}
                >
                  <div style={{ width: 4, height: 24, background: '#ff9900', borderRadius: 2 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div class="slice-hint">+ splits top/bottom · | splits left/right · Drag handles to adjust · Dbl-click to rename</div>
      <div class="preview-actions">
        <button onClick={onReanalyze}>↻ Re-analyze</button>
      </div>
    </div>
  );
}

function estimateSize(slices: Slice[], frameHeight: number, frameWidth: number): number {
  if (frameHeight <= 0 || frameWidth <= 0) return slices.length * 90;
  const totalPx = frameWidth * frameHeight;
  const KB_PER_PX = 180 / totalPx;
  const total = slices.reduce((sum, s) => {
    const w = (s.x_end ?? frameWidth) - (s.x_start ?? 0);
    const h = s.y_end - s.y_start;
    return sum + w * h * KB_PER_PX;
  }, 0);
  return Math.round(total);
}
