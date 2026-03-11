import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import type { Slice } from '../types';

interface Props {
  slices: Slice[];
  frameHeight: number;
  imageBase64?: string | null;
  onSlicesChange: (slices: Slice[]) => void;
}

const PREVIEW_WIDTH = 280;

export function SlicePreview({ slices, frameHeight, imageBase64, onSlicesChange }: Props) {
  const [dragging, setDragging] = useState<{ index: number; startY: number; startEnd: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const scale = PREVIEW_WIDTH / 600;
  const previewHeight = Math.round(frameHeight * scale);

  const handleDragStart = useCallback((e: MouseEvent, index: number) => {
    e.preventDefault();
    setDragging({
      index,
      startY: e.clientY,
      startEnd: slices[index].y_end
    });

    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - e.clientY;
      const rawY = Math.round(e.clientY + dy);
      // Convert preview px → frame px
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

  const handleAddSlice = useCallback(() => {
    if (slices.length === 0) return;
    const last = slices[slices.length - 1];
    const midY = Math.round((last.y_start + last.y_end) / 2);

    const newSlice: Slice = {
      id: `slice_${Date.now()}`,
      name: `section_${slices.length + 1}`,
      y_start: midY,
      y_end: last.y_end,
      alt_text: 'New section'
    };

    const updated = [
      ...slices.slice(0, -1),
      { ...last, y_end: midY },
      newSlice
    ];
    onSlicesChange(updated);
  }, [slices, onSlicesChange]);

  const handleDelete = useCallback((id: string) => {
    const idx = slices.findIndex(s => s.id === id);
    if (idx === -1 || slices.length <= 1) return;

    const updated = slices.filter((_, i) => i !== idx);
    // Extend the previous slice to cover deleted slice's range
    if (idx > 0) {
      updated[idx - 1] = { ...updated[idx - 1], y_end: slices[idx].y_end };
    } else {
      updated[0] = { ...updated[0], y_start: slices[idx].y_start };
    }
    onSlicesChange(updated);
  }, [slices, onSlicesChange]);

  const handleRename = useCallback((id: string, name: string) => {
    onSlicesChange(slices.map(s => s.id === id ? { ...s, name, alt_text: name } : s));
    setEditingId(null);
  }, [slices, onSlicesChange]);

  const handleReanalyze = useCallback(() => {
    // Signal parent to re-run Claude analysis
    window.dispatchEvent(new CustomEvent('reanalyze'));
  }, []);

  return (
    <div class="slice-preview">
      <div class="preview-header">
        <span>Slices: {slices.length}</span>
        <span>Est. Size: ~{estimateSize(slices)} KB</span>
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

          return (
            <div
              key={slice.id}
              style={{ position: 'absolute', top, left: 0, width: '100%', height, borderBottom: '2px dashed #0099ff', boxSizing: 'border-box' }}
            >
              {/* Slice label */}
              <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 10, color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                {editingId === slice.id ? (
                  <input
                    autoFocus
                    defaultValue={slice.name}
                    style={{ fontSize: 10, border: '1px solid #0099ff', padding: '1px 2px', width: 80 }}
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

              {/* Drag handle (on boundary below, except last slice) */}
              {i < slices.length - 1 && (
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
            </div>
          );
        })}
      </div>

      <div class="preview-actions">
        <button onClick={handleAddSlice}>+ Add Slice</button>
        <button onClick={handleReanalyze}>↻ Re-analyze</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('resetSlices'))}>Reset</button>
      </div>
    </div>
  );
}

function estimateSize(slices: Slice[]): number {
  // Rough estimate: average 90KB per slice
  return slices.length * 90;
}
