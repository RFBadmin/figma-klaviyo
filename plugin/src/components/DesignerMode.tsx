import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { SlicePreview } from './SlicePreview';
import type { Slice, SliceData, CompressedSlice, CompressResponse, LayoutBand } from '../types';
import type { FrameInfo } from '../ui';

const BACKEND_URL = 'https://figma-klaviyo-production.up.railway.app';

type Step = 'select' | 'analyzing' | 'preview' | 'compressing' | 'results' | 'saved';

interface FrameState {
  step: Step;
  slices: Slice[];
  imageBase64: string | null;
  compressedSlices: CompressedSlice[];
  compressResponse: CompressResponse | null;
  error: string | null;
}

const defaultState = (): FrameState => ({
  step: 'select',
  slices: [],
  imageBase64: null,
  compressedSlices: [],
  compressResponse: null,
  error: null,
});

interface Props {
  frames: FrameInfo[];
}

export function DesignerMode({ frames }: Props) {
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [frameStates, setFrameStates] = useState<Record<string, FrameState>>({});
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const patchState = useCallback((frameId: string, patch: Partial<FrameState>) => {
    setFrameStates(prev => ({
      ...prev,
      [frameId]: { ...(prev[frameId] ?? defaultState()), ...patch }
    }));
  }, []);

  // When frames list changes: set all checked by default, keep active frame if still present.
  useEffect(() => {
    if (frames.length === 0) return;

    // Check all frames by default
    setCheckedIds(new Set(frames.map(f => f.id)));

    // Keep current active frame if still in list, else switch to first
    setActiveFrameId(prev =>
      frames.find(f => f.id === prev) ? prev : frames[0].id
    );

    // Pre-load saved slice data into state
    setFrameStates(prev => {
      const next = { ...prev };
      frames.forEach(f => {
        if (f.existingSliceData && !next[f.id]) {
          next[f.id] = { ...defaultState(), slices: f.existingSliceData.slices, step: 'preview' };
        }
      });
      return next;
    });
  }, [frames.map(f => f.id).join(',')]);

  // Active frame object
  const frame = frames.find(f => f.id === activeFrameId) ?? frames[0] ?? null;
  const state: FrameState = frame ? (frameStates[frame.id] ?? defaultState()) : defaultState();

  // ─── Actions ──────────────────────────────────────────────────────────────

  const sliceFrame = useCallback(async (targetFrame: FrameInfo) => {
    patchState(targetFrame.id, { error: null, step: 'analyzing' });
    try {
      const [base64, bands] = await Promise.all([
        exportFullFrame(targetFrame.id),
        requestFrameLayout(targetFrame.id)
      ]);
      patchState(targetFrame.id, { imageBase64: base64 });

      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          frame_width: targetFrame.width,
          frame_height: targetFrame.height,
          layer_bands: bands
        })
      });

      if (!response.ok) throw new Error(`Slicing failed: ${response.statusText}`);

      const data = await response.json();
      const newSlices: Slice[] = data.slices.map((s: { name: string; y_start: number; y_end: number; alt_text: string }, i: number) => ({
        id: `slice_${Date.now()}_${i}`,
        name: s.name,
        y_start: s.y_start,
        y_end: s.y_end,
        alt_text: s.alt_text
      }));

      patchState(targetFrame.id, { slices: newSlices, step: 'preview' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchState(targetFrame.id, { error: msg, step: 'select' });
    }
  }, [patchState]);

  const sliceAllChecked = useCallback(async () => {
    const targets = frames.filter(f => checkedIds.has(f.id));
    if (targets.length === 0) return;
    setBatchProgress({ current: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      setBatchProgress({ current: i, total: targets.length });
      setActiveFrameId(targets[i].id);
      await sliceFrame(targets[i]);
    }
    setBatchProgress(null);
    setActiveFrameId(targets[0].id);
  }, [checkedIds, frames, sliceFrame]);

  const compressAndSave = useCallback(async (targetFrame: FrameInfo, currentState: FrameState) => {
    if (currentState.slices.length === 0) return;
    patchState(targetFrame.id, { error: null, step: 'compressing' });

    try {
      let base64 = currentState.imageBase64;
      if (!base64) {
        base64 = await exportFullFrame(targetFrame.id);
        patchState(targetFrame.id, { imageBase64: base64 });
      }
      const sliceExports = await cropSlicesFromImage(base64, currentState.slices, targetFrame.width);

      const response = await fetch(`${BACKEND_URL}/api/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slices: sliceExports,
          settings: { target_size_kb: 100, max_size_kb: 200 }
        })
      });

      if (!response.ok) throw new Error(`Compression failed: ${response.statusText}`);

      const data: CompressResponse = await response.json();
      patchState(targetFrame.id, {
        compressResponse: data,
        compressedSlices: data.compressed,
        step: 'results'
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchState(targetFrame.id, { error: msg, step: 'preview' });
    }
  }, [patchState]);

  const saveDesign = useCallback((targetFrame: FrameInfo, currentState: FrameState) => {
    const updatedSlices = currentState.slices.map(s => {
      const compressed = currentState.compressedSlices.find(c => c.id === s.id);
      return compressed ? { ...s, compressed_url: compressed.temp_url } : s;
    });

    const sliceData: SliceData = {
      version: '1.0.0',
      created_by: 'designer',
      created_at: new Date().toISOString(),
      frame_id: targetFrame.id,
      frame_name: targetFrame.name,
      slices: updatedSlices,
      status: 'ready'
    };

    parent.postMessage({
      pluginMessage: { type: 'SAVE_SLICE_DATA', frameId: targetFrame.id, data: sliceData }
    }, '*');

    patchState(targetFrame.id, { step: 'saved' });
  }, [patchState]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (frames.length === 0) {
    return (
      <div class="empty-state">
        <p>No email frames found on this page.<br />Add a frame 500–700px wide to get started.</p>
      </div>
    );
  }

  const isBatching = batchProgress !== null;
  const checkedCount = checkedIds.size;

  return (
    <div class="designer-mode">
      {/* Batch progress bar */}
      {batchProgress && (
        <div class="batch-progress">
          <div
            class="batch-bar"
            style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }}
          />
          <span>Slicing {batchProgress.current + 1} of {batchProgress.total}…</span>
        </div>
      )}

      {/* Frame checklist */}
      <div class="frame-checklist">
        <div class="checklist-header">
          <span>{checkedCount} of {frames.length} frame{frames.length !== 1 ? 's' : ''} selected</span>
          <div>
            <button onClick={() => setCheckedIds(new Set(frames.map(f => f.id)))}>All</button>
            <button onClick={() => setCheckedIds(new Set())}>None</button>
          </div>
        </div>
        {frames.map(f => {
          const fs = frameStates[f.id] ?? defaultState();
          const isChecked = checkedIds.has(f.id);
          const isActive = f.id === frame?.id;
          return (
            <div
              key={f.id}
              class={`frame-check-item ${isChecked ? 'checked' : ''} ${isActive ? 'active-frame' : ''}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  setCheckedIds(prev => {
                    const next = new Set(prev);
                    next.has(f.id) ? next.delete(f.id) : next.add(f.id);
                    return next;
                  });
                }}
              />
              <span
                class="frame-check-name"
                title={f.name}
                onClick={() => setActiveFrameId(f.id)}
                style={{ cursor: 'pointer', flex: 1 }}
              >{f.name}</span>
              <span class="frame-check-dims">{f.width}×{f.height}</span>
              {fs.step === 'saved' && <span class="frame-check-done">✓</span>}
              {(fs.step === 'analyzing' || fs.step === 'compressing') && (
                <span class="frame-check-spinner" />
              )}
              {fs.step === 'preview' && <span class="frame-check-badge">sliced</span>}
            </div>
          );
        })}
      </div>

      {/* Slice all checked button */}
      {checkedCount > 0 && !isBatching && (
        <div class="action-row" style={{ marginBottom: '8px' }}>
          <button class="btn-primary" style={{ flex: 1 }} onClick={sliceAllChecked}>
            ✦ Slice {checkedCount > 1 ? `All ${checkedCount} Frames` : 'Frame'}
          </button>
        </div>
      )}

      {/* Per-frame workflow panel — only shown once slicing has started */}
      {frame && state.step !== 'select' && (
        <FrameWorkflow
          frame={frame}
          state={state}
          onSlice={() => sliceFrame(frame)}
          onSlicesChange={(slices) => patchState(frame.id, { slices })}
          onCompress={() => compressAndSave(frame, state)}
          onSave={() => saveDesign(frame, state)}
          onStepChange={(step) => patchState(frame.id, { step })}
          onErrorDismiss={() => patchState(frame.id, { error: null })}
        />
      )}
    </div>
  );
}

// ─── FrameWorkflow — renders the UI for a single frame ────────────────────────

interface WorkflowProps {
  frame: FrameInfo;
  state: FrameState;
  onSlice: () => void;
  onSlicesChange: (slices: Slice[]) => void;
  onCompress: () => void;
  onSave: () => void;
  onStepChange: (step: Step) => void;
  onErrorDismiss: () => void;
}

function FrameWorkflow({ frame, state, onSlice, onSlicesChange, onCompress, onSave, onStepChange, onErrorDismiss }: WorkflowProps) {
  const { step, slices, imageBase64, compressResponse, error } = state;

  return (
    <div>
      {error && (
        <div class="error-banner">
          ⚠ {error}
          <button onClick={onErrorDismiss}>✕</button>
        </div>
      )}

      <div class="frame-info">
        <span class="frame-icon">📧</span>
        <div>
          <strong>{frame.name}</strong>
          <span class="frame-dims">{frame.width} × {frame.height}px</span>
        </div>
      </div>

      {step === 'select' && (
        <div class="step-panel">
          <button class="btn-primary" onClick={onSlice}>
            ✦ Slice This Frame
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div class="step-panel loading">
          <div class="spinner" />
          <p>Slicing your design…</p>
        </div>
      )}

      {step === 'preview' && (
        <div class="step-panel">
          <SlicePreview
            slices={slices}
            frameHeight={frame.height}
            imageBase64={imageBase64}
            onSlicesChange={onSlicesChange}
          />
          <div class="action-row">
            <button class="btn-secondary" onClick={onSlice}>↻ Re-slice</button>
            <button class="btn-primary" onClick={onCompress}>Compress →</button>
          </div>
        </div>
      )}

      {step === 'compressing' && (
        <div class="step-panel loading">
          <div class="spinner" />
          <p>Compressing {slices.length} slices with Squoosh…</p>
        </div>
      )}

      {step === 'results' && compressResponse && (
        <div class="step-panel">
          <CompressionResults response={compressResponse} />
          <div class="action-row">
            <button class="btn-secondary" onClick={() => onStepChange('preview')}>← Adjust Slices</button>
            <button class="btn-secondary" onClick={onCompress}>↻ Re-compress</button>
            <button
              class="btn-primary"
              disabled={compressResponse.summary.failed_count > 0}
              onClick={onSave}
            >
              Save →
            </button>
          </div>
        </div>
      )}

      {step === 'saved' && (
        <div class="step-panel success">
          <p>✓ Design saved! Tech team can now load it in Tech Mode.</p>
          <button class="btn-secondary" onClick={() => onStepChange('preview')}>Edit Slices</button>
        </div>
      )}
    </div>
  );
}

// ─── Compression Results ─────────────────────────────────────────────────────

function CompressionResults({ response }: { response: CompressResponse }) {
  const statusIcon = (s: CompressedSlice['status']) =>
    s === 'optimal' ? '✓' : s === 'good' ? '✓' : s === 'warning' ? '⚠' : '✗';

  return (
    <div class="compression-results">
      <div class="targets-box">
        <span>Per slice: ≤100KB ideal │ ≤200KB max</span>
        <span>Total email: ≤500KB recommended</span>
      </div>
      <table class="results-table">
        <thead>
          <tr><th>Slice</th><th>Original</th><th>Final</th><th>Status</th></tr>
        </thead>
        <tbody>
          {response.compressed.map(s => (
            <tr key={s.id} class={`status-${s.status}`}>
              <td>{s.name}</td>
              <td>{formatKB(s.original_size)}</td>
              <td>{formatKB(s.compressed_size)}</td>
              <td>{statusIcon(s.status)} {capitalize(s.status)}</td>
            </tr>
          ))}
          <tr class="totals-row">
            <td>TOTAL</td>
            <td>{formatKB(response.summary.total_original)}</td>
            <td>{formatKB(response.summary.total_compressed)}</td>
            <td>{response.validation.status === 'passed' ? '✓ Under 500KB' : '⚠ Over target'}</td>
          </tr>
        </tbody>
      </table>
      {response.recommendations.map((r, i) => (
        <div key={i} class="recommendation">
          <strong>⚠ {r.slice}:</strong> {r.suggestion}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatKB(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function exportFullFrame(frameId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === 'FRAME_EXPORTED') {
        window.removeEventListener('message', handler);
        resolve(msg.data);
      } else if (msg?.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'EXPORT_FRAME', frameId } }, '*');
  });
}

/** Ask code.ts to compute slice bands from Figma node bounding boxes. */
function requestFrameLayout(frameId: string): Promise<LayoutBand[]> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === 'FRAME_LAYOUT') {
        window.removeEventListener('message', handler);
        resolve(msg.bands);
      } else if (msg?.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'GET_FRAME_LAYOUT', frameId } }, '*');
  });
}

/** Crop each slice region from the full-frame image using HTML Canvas.
 *  The image was exported at 2× scale, so we account for that. */
async function cropSlicesFromImage(
  imageBase64: string,
  slices: Slice[],
  frameWidth: number
): Promise<{ id: string; name: string; image_base64: string }[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.naturalWidth / frameWidth;
      const results = slices.map(slice => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = Math.round((slice.y_end - slice.y_start) * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(
          img,
          0, Math.round(slice.y_start * scale),
          img.naturalWidth, canvas.height,
          0, 0, canvas.width, canvas.height
        );
        return {
          id: slice.id,
          name: slice.name,
          image_base64: canvas.toDataURL('image/png').split(',')[1]
        };
      });
      resolve(results);
    };
    img.onerror = () => reject(new Error('Failed to load frame image for cropping'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}
