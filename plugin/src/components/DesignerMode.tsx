import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { SlicePreview } from './SlicePreview';
import type { Slice, SliceData, CompressedSlice, CompressResponse, LayoutBand } from '../types';
import type { FrameInfo } from '../ui';

const BACKEND_URL = 'https://figma-klaviyo-production.up.railway.app';

type Step = 'select' | 'analyzing' | 'preview' | 'applied' | 'compressing' | 'results' | 'saved';

interface FrameState {
  step: Step;
  slices: Slice[];
  imageBase64: string | null;
  figmaSliceImages: Array<{ id: string; image_base64: string }> | null;
  compressedSlices: CompressedSlice[];
  compressResponse: CompressResponse | null;
  error: string | null;
}

const defaultState = (): FrameState => ({
  step: 'select',
  slices: [],
  imageBase64: null,
  figmaSliceImages: null,
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
  const [compressQuality, setCompressQuality] = useState<number>(82);
  const [compressMaxKb, setCompressMaxKb] = useState<number>(200);
  const [compressFormat, setCompressFormat] = useState<'auto' | 'jpeg' | 'png' | 'webp'>('auto');

  const stopRef = useRef(false);
  const fetchControllerRef = useRef<AbortController | null>(null);

  const cancelSlice = useCallback(() => {
    stopRef.current = true;
    fetchControllerRef.current?.abort();
    fetchControllerRef.current = null;
    setBatchProgress(null);
    setFrameStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (next[id].step === 'analyzing') {
          next[id] = { ...next[id], step: 'select', error: null };
        }
      });
      return next;
    });
  }, []);

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

  const sliceFrame = useCallback(async (targetFrame: FrameInfo, forceAI = false) => {
    stopRef.current = false;
    patchState(targetFrame.id, { error: null, step: 'analyzing' });
    try {
      // ── Check for existing Figma Slice nodes first (skip when re-slicing) ─
      const figmaSlices = forceAI ? [] : await requestFigmaSlices(targetFrame.id);
      if (stopRef.current) return;
      if (figmaSlices.length > 0) {
        const newSlices: Slice[] = figmaSlices.map((s, i) => ({
          id: `slice_${Date.now()}_${i}`,
          name: s.name,
          y_start: s.y_start,
          y_end: s.y_end,
          alt_text: s.name
        }));
        patchState(targetFrame.id, {
          slices: newSlices,
          figmaSliceImages: newSlices.map((s, i) => ({ id: s.id, image_base64: figmaSlices[i].imageBase64 })),
          imageBase64: null,
          step: 'preview'
        });
        return;
      }

      // ── No Figma Slices — run AI analysis ───────────────────────────────
      const [base64, bands] = await Promise.all([
        exportFullFrame(targetFrame.id),
        requestFrameLayout(targetFrame.id)
      ]);
      if (stopRef.current) return;
      patchState(targetFrame.id, { imageBase64: base64 });

      const controller = new AbortController();
      fetchControllerRef.current = controller;
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          image_base64: base64,
          frame_width: targetFrame.width,
          frame_height: targetFrame.height,
          layer_bands: bands
        })
      });
      fetchControllerRef.current = null;

      if (!response.ok) throw new Error(`Slicing failed: ${response.statusText}`);

      const data = await response.json();
      const newSlices: Slice[] = data.slices.map((s: { name: string; y_start: number; y_end: number; alt_text: string }, i: number) => ({
        id: `slice_${Date.now()}_${i}`,
        name: s.name,
        y_start: s.y_start,
        y_end: s.y_end,
        alt_text: s.alt_text
      }));

      patchState(targetFrame.id, { slices: newSlices, figmaSliceImages: null, step: 'preview' });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      patchState(targetFrame.id, { error: msg, step: 'select' });
    }
  }, [patchState]);

  const sliceAllChecked = useCallback(async () => {
    const targets = frames.filter(f => checkedIds.has(f.id));
    if (targets.length === 0) return;
    setBatchProgress({ current: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) break;
      setBatchProgress({ current: i, total: targets.length });
      setActiveFrameId(targets[i].id);
      await sliceFrame(targets[i]);
    }
    setBatchProgress(null);
    if (!stopRef.current) setActiveFrameId(targets[0].id);
    stopRef.current = false;
  }, [checkedIds, frames, sliceFrame]);

  const applyToFrame = useCallback(async (targetFrame: FrameInfo, currentState: FrameState) => {
    try {
      const exported = await createSliceNodes(targetFrame.id, currentState.slices);
      patchState(targetFrame.id, {
        figmaSliceImages: currentState.slices.map((s, i) => ({ id: s.id, image_base64: exported[i]?.imageBase64 ?? '' })),
        step: 'applied'
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchState(targetFrame.id, { error: msg });
    }
  }, [patchState]);

  const compressAndSave = useCallback(async (targetFrame: FrameInfo, currentState: FrameState) => {
    if (currentState.slices.length === 0) return;
    patchState(targetFrame.id, { error: null, step: 'compressing' });

    try {
      let sliceExports: { id: string; name: string; image_base64: string }[];
      if (currentState.figmaSliceImages?.length) {
        // Use pre-exported Figma Slice images — no canvas crop needed
        sliceExports = currentState.slices.map((s, i) => ({
          id: s.id,
          name: s.name,
          image_base64: currentState.figmaSliceImages![i]?.image_base64 ?? ''
        }));
      } else {
        let base64 = currentState.imageBase64;
        if (!base64) {
          base64 = await exportFullFrame(targetFrame.id);
          patchState(targetFrame.id, { imageBase64: base64 });
        }
        sliceExports = await cropSlicesFromImage(base64, currentState.slices, targetFrame.width);
      }

      const response = await fetch(`${BACKEND_URL}/api/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slices: sliceExports,
          settings: {
            quality: compressQuality,
            target_size_kb: 100,
            max_size_kb: compressMaxKb,
            format: compressFormat
          }
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
  }, [patchState, compressQuality, compressMaxKb, compressFormat]);

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
          <button class="btn-stop-inline" onClick={cancelSlice}>✕ Stop</button>
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
          onReSlice={() => sliceFrame(frame, true)}
          onSlicesChange={(slices) => patchState(frame.id, { slices })}
          onApplyToFrame={() => applyToFrame(frame, state)}
          onCompress={() => compressAndSave(frame, state)}
          onSave={() => saveDesign(frame, state)}
          onStepChange={(step) => patchState(frame.id, { step })}
          onErrorDismiss={() => patchState(frame.id, { error: null })}
          onCancelSlice={cancelSlice}
          compressQuality={compressQuality}
          compressMaxKb={compressMaxKb}
          compressFormat={compressFormat}
          onQualityChange={setCompressQuality}
          onMaxKbChange={setCompressMaxKb}
          onFormatChange={setCompressFormat}
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
  onReSlice: () => void;
  onSlicesChange: (slices: Slice[]) => void;
  onApplyToFrame: () => void;
  onCompress: () => void;
  onSave: () => void;
  onStepChange: (step: Step) => void;
  onErrorDismiss: () => void;
  onCancelSlice: () => void;
  compressQuality: number;
  compressMaxKb: number;
  compressFormat: 'auto' | 'jpeg' | 'png' | 'webp';
  onQualityChange: (v: number) => void;
  onMaxKbChange: (v: number) => void;
  onFormatChange: (v: 'auto' | 'jpeg' | 'png' | 'webp') => void;
}

function FrameWorkflow({ frame, state, onSlice, onReSlice, onSlicesChange, onApplyToFrame, onCompress, onSave, onStepChange, onErrorDismiss, onCancelSlice, compressQuality, compressMaxKb, compressFormat, onQualityChange, onMaxKbChange, onFormatChange }: WorkflowProps) {
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
          <button class="btn-stop" onClick={onCancelSlice}>✕ Stop</button>
        </div>
      )}

      {step === 'preview' && (
        <div class="step-panel">
          <SlicePreview
            slices={slices}
            frameHeight={frame.height}
            imageBase64={imageBase64}
            onSlicesChange={onSlicesChange}
            onReanalyze={onReSlice}
          />
          <div class="action-row">
            <button class="btn-secondary" onClick={onReSlice}>↻ Re-slice</button>
            <button class="btn-primary" onClick={onApplyToFrame}>Apply to Frame →</button>
          </div>
        </div>
      )}

      {step === 'applied' && (
        <div class="step-panel">
          <p class="success-inline">✓ Slice nodes created on frame in Figma</p>

          <div class="compress-settings">
            <div class="format-row">
              <span class="settings-label">Format</span>
              <div class="format-options">
                {(['auto', 'jpeg', 'png', 'webp'] as const).map(fmt => (
                  <button
                    key={fmt}
                    class={`format-btn ${compressFormat === fmt ? 'active' : ''}`}
                    onClick={() => onFormatChange(fmt)}
                  >
                    {fmt === 'auto' ? 'Auto' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              {compressFormat === 'webp' && (
                <span class="format-warning">⚠ WebP has limited email client support</span>
              )}
              {compressFormat === 'png' && (
                <span class="format-note">PNG is lossless — quality slider not applied</span>
              )}
            </div>

            {compressFormat !== 'png' && (
              <div class="slider-row">
                <label>Quality <span>{compressQuality}%</span></label>
                <input type="range" min={50} max={100} value={compressQuality}
                  onInput={(e) => onQualityChange(+(e.target as HTMLInputElement).value)} />
                <div class="slider-hints"><span>Smaller file</span><span>Sharper image</span></div>
              </div>
            )}

            <div class="slider-row">
              <label>Max size per slice <span>{compressMaxKb} KB</span></label>
              <input type="range" min={50} max={300} step={10} value={compressMaxKb}
                onInput={(e) => onMaxKbChange(+(e.target as HTMLInputElement).value)} />
              <div class="slider-hints"><span>50 KB</span><span>300 KB</span></div>
            </div>
          </div>

          <div class="action-row">
            <button class="btn-secondary" onClick={() => onStepChange('preview')}>← Adjust</button>
            <button class="btn-primary" onClick={onCompress}>Compress →</button>
          </div>
        </div>
      )}

      {step === 'compressing' && (
        <div class="step-panel loading">
          <div class="spinner" />
          <p>Compressing {slices.length} slices with Sharp…</p>
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
        <span>Per image: ≤5MB (Klaviyo API limit) │ originals used if under limit</span>
        <span>For fast email delivery: keep total under 500KB</span>
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
      const results: { id: string; name: string; image_base64: string }[] = [];
      for (const slice of slices) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = Math.round((slice.y_end - slice.y_start) * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
        ctx.drawImage(
          img,
          0, Math.round(slice.y_start * scale),
          img.naturalWidth, canvas.height,
          0, 0, canvas.width, canvas.height
        );
        results.push({
          id: slice.id,
          name: slice.name,
          image_base64: canvas.toDataURL('image/png').split(',')[1]
        });
      }
      resolve(results);
    };
    img.onerror = () => reject(new Error('Failed to load frame image for cropping'));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}

/** Read existing Figma SliceNodes from a frame and return their positions + exported images. */
function requestFigmaSlices(frameId: string): Promise<Array<{ name: string; y_start: number; y_end: number; imageBase64: string }>> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === 'FIGMA_SLICES_LOADED') {
        window.removeEventListener('message', handler);
        resolve(msg.slices);
      } else if (msg?.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'GET_FIGMA_SLICES', frameId } }, '*');
  });
}

/** Create Figma SliceNodes on the frame matching current slice boundaries, then export each. */
function createSliceNodes(frameId: string, slices: Slice[]): Promise<Array<{ name: string; y_start: number; y_end: number; imageBase64: string }>> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === 'SLICE_NODES_CREATED') {
        window.removeEventListener('message', handler);
        resolve(msg.slices);
      } else if (msg?.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    window.addEventListener('message', handler);
    parent.postMessage({
      pluginMessage: {
        type: 'CREATE_SLICE_NODES',
        frameId,
        slices: slices.map(s => ({ name: s.name, y_start: s.y_start, y_end: s.y_end }))
      }
    }, '*');
  });
}
