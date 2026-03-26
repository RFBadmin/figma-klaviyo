import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { SlicePreview } from './SlicePreview';
import type { Slice, SliceData, CompressedSlice, CompressResponse, LayoutBand } from '../types';
import type { FrameInfo } from '../ui';

const BACKEND_URL = 'https://figma-klaviyo-production.up.railway.app';

type Step = 'select' | 'analyzing' | 'preview' | 'compressing' | 'results' | 'saved';

interface FrameState {
  step: Step;
  slices: Slice[];
  imageBase64: string | null;
  // ID-keyed map so index shifts from split/delete/rename never cause mismatches
  figmaSliceImages: Map<string, string> | null;
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
  onSwitchToTech: () => void;
}

export function DesignerMode({ frames, onSwitchToTech }: Props) {
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [frameStates, setFrameStates] = useState<Record<string, FrameState>>({});
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [applyBatchProgress, setApplyBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [compressQuality, setCompressQuality] = useState<number>(82);
  const [compressMaxKb, setCompressMaxKb] = useState<number>(400);
  const [compressFormat, setCompressFormat] = useState<'auto' | 'jpeg' | 'png'>('auto');

  const stopRef = useRef(false);
  const fetchControllerRef = useRef<AbortController | null>(null);
  // Always-fresh mirror of frameStates for reading inside async callbacks
  const frameStatesRef = useRef(frameStates);
  frameStatesRef.current = frameStates;
  // Tracks a manual frame selection made by the user during an active batch, so
  // the batch loop never overrides it.
  const userPickedRef = useRef<string | null>(null);

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
  // Also detects when Figma slice nodes were deleted from the canvas (hasFigmaSlices → false)
  // and resets the affected frame so stale slice data is not re-applied.
  useEffect(() => {
    if (frames.length === 0) return;

    setCheckedIds(new Set(frames.map(f => f.id)));

    setActiveFrameId(prev =>
      frames.find(f => f.id === prev) ? prev : frames[0].id
    );

    setFrameStates(prev => {
      const next = { ...prev };
      frames.forEach(f => {
        const existing = next[f.id];

        // If this frame was backed by Figma slice nodes (figmaSliceImages !== null)
        // but those nodes were deleted from canvas, reset to fresh state.
        // AI-sliced frames (figmaSliceImages === null) must NEVER be reset here —
        // this effect fires whenever ANY frame's hasFigmaSlices changes (e.g. when
        // CREATE_SLICE_NODES runs for frame1), which would incorrectly wipe frame2's
        // preview state mid-batch if we didn't check figmaSliceImages.
        if (existing && existing.step !== 'select' && existing.step !== 'analyzing'
            && !f.hasFigmaSlices && !f.existingSliceData
            && existing.figmaSliceImages !== null) {
          next[f.id] = defaultState();
          return;
        }

        // On first load: restore saved slice data into preview
        if (f.existingSliceData && !existing) {
          next[f.id] = { ...defaultState(), slices: f.existingSliceData.slices, step: 'preview' };
        }
      });
      return next;
    });
  }, [frames.map(f => `${f.id}:${f.hasFigmaSlices ? '1' : '0'}`).join(',')]);

  // Active frame object
  const frame = frames.find(f => f.id === activeFrameId) ?? frames[0] ?? null;
  const state: FrameState = frame ? (frameStates[frame.id] ?? defaultState()) : defaultState();

  // Auto-export frame image when in preview step but imageBase64 is missing
  // (only needed when slices came from AI, not from Figma nodes which carry their own images)
  useEffect(() => {
    if (!frame || state.step !== 'preview' || state.imageBase64 !== null) return;
    if (state.figmaSliceImages !== null) return; // Figma slice images already available
    exportFullFrame(frame.id).then(base64 => {
      patchState(frame.id, { imageBase64: base64 });
    }).catch(err => {
      patchState(frame.id, { error: `Failed to load frame preview: ${err.message}` });
    });
  }, [frame?.id, state.step, state.imageBase64, state.figmaSliceImages]);

  // Auto-detect Figma native slice nodes when frame becomes active.
  // We do the check BEFORE showing any spinner — Figma slice reads are instant.
  useEffect(() => {
    if (!frame || !frame.hasFigmaSlices) return;
    if (frame.existingSliceData) return; // saved plugin data takes priority
    if (state.step !== 'select') return;
    sliceFrame(frame);
  }, [frame?.id, frame?.hasFigmaSlices]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const sliceFrame = useCallback(async (targetFrame: FrameInfo, forceAI = false) => {
    stopRef.current = false;

    // ── Check for Figma native slices FIRST (no spinner needed — it's instant) ─
    if (!forceAI) {
      let figmaSlices: Array<{ name: string; y_start: number; y_end: number; imageBase64: string }> = [];
      try {
        figmaSlices = await requestFigmaSlices(targetFrame.id);
      } catch {
        // Couldn't read slices — fall through to AI
      }

      if (figmaSlices.length > 0) {
        const newSlices: Slice[] = figmaSlices.map(s => ({
          id: generateId(),
          name: s.name,
          y_start: s.y_start,
          y_end: s.y_end,
          alt_text: s.name
        }));
        // Build ID-keyed map for reliable lookup even after editing
        const imgMap = new Map<string, string>();
        figmaSlices.forEach((s, i) => imgMap.set(newSlices[i].id, s.imageBase64));

        patchState(targetFrame.id, {
          slices: newSlices,
          figmaSliceImages: imgMap,
          imageBase64: null,
          step: 'preview'
        });
        return;
      }
    }

    // ── No Figma slices (or forceAI) — run AI analysis ───────────────────────
    patchState(targetFrame.id, { error: null, step: 'analyzing' });
    try {
      if (stopRef.current) return;

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
      const newSlices: Slice[] = data.slices.map((s: { name: string; y_start: number; y_end: number; alt_text: string }) => ({
        id: generateId(),
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
    // Only slice frames with no slices yet — frames with Figma nodes auto-load, already-sliced use Re-analyze
    const targets = frames.filter(f =>
      checkedIds.has(f.id) &&
      (frameStates[f.id]?.step ?? 'select') === 'select' &&
      !f.hasFigmaSlices
    );
    if (targets.length === 0) return;

    // Reset user-pick tracker; don't force-jump at batch start.
    userPickedRef.current = null;
    setBatchProgress({ current: 0, total: targets.length });

    let lockedToFirst = false;
    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) break;
      setBatchProgress({ current: i, total: targets.length });
      await sliceFrame(targets[i]);
      // Lock the view to the FIRST completed frame (if user hasn't manually
      // picked something). Subsequent completions don't move the active frame.
      if (!lockedToFirst && userPickedRef.current === null) {
        setActiveFrameId(targets[i].id);
        lockedToFirst = true;
      }
    }
    setBatchProgress(null);
    userPickedRef.current = null;
    stopRef.current = false;
  }, [checkedIds, frames, frameStates, sliceFrame]);

  const applyToFrame = useCallback(async (targetFrame: FrameInfo, currentState: FrameState): Promise<Map<string, string> | null> => {
    try {
      const exported = await createSliceNodes(targetFrame.id, currentState.slices);
      const imgMap = new Map<string, string>();
      currentState.slices.forEach((s, i) => {
        if (exported[i]?.imageBase64) imgMap.set(s.id, exported[i].imageBase64);
      });
      patchState(targetFrame.id, { figmaSliceImages: imgMap });
      return imgMap;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchState(targetFrame.id, { error: msg });
      return null;
    }
  }, [patchState]);

  const compressAndSave = useCallback(async (targetFrame: FrameInfo, currentState: FrameState): Promise<CompressResponse | null> => {
    if (currentState.slices.length === 0) return null;
    patchState(targetFrame.id, { error: null, step: 'compressing' });

    try {
      let sliceExports: { id: string; name: string; image_base64: string }[];

      if (currentState.figmaSliceImages?.size) {
        const allHaveImages = currentState.slices.every(s => currentState.figmaSliceImages!.has(s.id));
        if (allHaveImages) {
          sliceExports = currentState.slices.map(s => ({
            id: s.id,
            name: s.name,
            image_base64: currentState.figmaSliceImages!.get(s.id)!
          }));
        } else {
          let base64 = currentState.imageBase64;
          if (!base64) {
            base64 = await exportFullFrame(targetFrame.id);
            patchState(targetFrame.id, { imageBase64: base64 });
          }
          sliceExports = await cropSlicesFromImage(base64, currentState.slices, targetFrame.width);
        }
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
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchState(targetFrame.id, { error: msg, step: 'preview' });
      return null;
    }
  }, [patchState, compressQuality, compressMaxKb, compressFormat]);

  // Single-frame: apply nodes (if AI slices) then compress immediately
  const applyThenCompress = useCallback(async (
    targetFrame: FrameInfo,
    currentState: FrameState
  ): Promise<{ compressResponse: CompressResponse; figmaSliceImages: Map<string, string> | null; slices: Slice[] } | null> => {
    let stateForCompress = currentState;
    if (currentState.figmaSliceImages === null) {
      const imgMap = await applyToFrame(targetFrame, currentState);
      if (!imgMap) return null;
      stateForCompress = { ...currentState, figmaSliceImages: imgMap };
    }
    const compressResponse = await compressAndSave(targetFrame, stateForCompress);
    if (!compressResponse) return null;
    return { compressResponse, figmaSliceImages: stateForCompress.figmaSliceImages, slices: stateForCompress.slices };
  }, [applyToFrame, compressAndSave]);

  const applyCompressSaveAll = useCallback(async () => {
    const previewTargets = frames.filter(f => (frameStates[f.id]?.step ?? 'select') === 'preview');
    if (previewTargets.length === 0) {
      // Refresh frame data so TechMode sees current existingSliceData, then switch.
      parent.postMessage({ pluginMessage: { type: 'GET_SELECTED_FRAME' } }, '*');
      setTimeout(() => onSwitchToTech(), 600);
      return;
    }

    // Capture every target frame + its state RIGHT NOW, before any async work begins.
    // CREATE_SLICE_NODES triggers documentchange → code.ts re-sends frame data →
    // the frames useEffect may run mid-batch. Capturing upfront guarantees we always
    // process each frame with its correct preview-state slices, not a stale/reset copy.
    const targets = previewTargets.map(f => ({
      frame: f,
      state: { ...(frameStatesRef.current[f.id] ?? defaultState()) }
    }));

    setApplyBatchProgress({ current: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      setApplyBatchProgress({ current: i, total: targets.length });
      const { frame: targetFrame, state: targetState } = targets[i];

      const result = await applyThenCompress(targetFrame, targetState);
      if (!result) continue;

      const { compressResponse, figmaSliceImages, slices } = result;
      const updatedSlices = slices.map(sl => {
        const c = compressResponse.compressed.find(c => c.id === sl.id);
        return c ? { ...sl, compressed_url: c.temp_url } : sl;
      });
      const sliceData: SliceData = {
        version: '1.0.0',
        created_by: 'designer',
        created_at: new Date().toISOString(),
        frame_id: targetFrame.id,
        frame_name: targetFrame.name,
        slices: updatedSlices,
        status: 'ready',
        source: figmaSliceImages !== null ? 'figma_nodes' : 'ai'
      };
      parent.postMessage({ pluginMessage: { type: 'SAVE_SLICE_DATA', frameId: targetFrame.id, data: sliceData } }, '*');
      setFrameStates(prev => ({ ...prev, [targetFrame.id]: { ...prev[targetFrame.id], step: 'saved' } }));
    }

    setApplyBatchProgress(null);

    // Re-query frame data from Figma so TechMode's existingSliceData is fresh
    // (pluginData was just written above; the UI's frames prop still has the old values).
    parent.postMessage({ pluginMessage: { type: 'GET_SELECTED_FRAME' } }, '*');
    setTimeout(() => onSwitchToTech(), 600);
  }, [frames, frameStates, applyThenCompress, onSwitchToTech]);



  // ─── Render ─────────────────────────────────────────────────────────────────

  if (frames.length === 0) {
    return (
      <div class="empty-state">
        <p>No email frames found on this page.<br />Add a frame 500–700px wide to get started.</p>
      </div>
    );
  }

  const isBatching = batchProgress !== null;
  const isApplying = applyBatchProgress !== null;
  const checkedCount = checkedIds.size;
  // Frames with hasFigmaSlices are already handled (auto-loaded when activated) — exclude from unsliced count
  const unslicedCheckedCount = frames.filter(f =>
    checkedIds.has(f.id) &&
    (frameStates[f.id]?.step ?? 'select') === 'select' &&
    !f.hasFigmaSlices
  ).length;
  const pendingCount = frames.filter(f => (frameStates[f.id]?.step ?? 'select') === 'preview').length;
  const resultsCount = frames.filter(f => (frameStates[f.id]?.step ?? 'select') === 'results').length;
  const readyToPublishCount = pendingCount + resultsCount;

  return (
    <div class="designer-mode">
      {/* Slice batch progress bar */}
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

      {/* Apply & compress batch progress bar */}
      {applyBatchProgress && (
        <div class="batch-progress">
          <div
            class="batch-bar"
            style={{ width: `${Math.round((applyBatchProgress.current / applyBatchProgress.total) * 100)}%` }}
          />
          <span>Processing {applyBatchProgress.current + 1} of {applyBatchProgress.total} frames…</span>
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
                onClick={() => {
                  setActiveFrameId(f.id);
                  // If a batch is running, record this as a deliberate user pick
                  // so the batch loop won't override it on the next iteration.
                  userPickedRef.current = f.id;
                }}
                style={{ cursor: 'pointer', flex: 1 }}
              >{f.name}</span>
              <span class="frame-check-dims">{f.width}×{f.height}</span>
              {fs.step === 'saved' && <span class="frame-check-done">✓</span>}
              {(fs.step === 'analyzing' || fs.step === 'compressing') && (
                <span class="frame-check-spinner" />
              )}
              {fs.step === 'preview' && <span class="frame-check-badge">sliced</span>}
              {/* Show Figma-native-slices indicator when not yet processed */}
              {f.hasFigmaSlices && fs.step === 'select' && (
                <span class="frame-check-badge figma-badge" title="Has Figma Slice nodes">✂</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Slice all un-sliced checked frames — hidden when all frames are already sliced */}
      {unslicedCheckedCount > 0 && !isBatching && !isApplying && (
        <div class="action-row" style={{ marginBottom: '6px' }}>
          <button class="btn-primary" style={{ flex: 1 }} onClick={sliceAllChecked}>
            ✦ Slice {unslicedCheckedCount > 1 ? `All ${unslicedCheckedCount} Frames` : 'Frame'}
          </button>
        </div>
      )}

      {/* Combined: Apply + Compress + Save + Push to Klaviyo */}
      {readyToPublishCount >= 1 && !isBatching && !isApplying && (
        <div class="action-row" style={{ marginBottom: '6px' }}>
          <button class="btn-success" style={{ flex: 1 }} onClick={applyCompressSaveAll}>
            ✦ Apply, Compress & Push {readyToPublishCount > 1 ? `All ${readyToPublishCount} Frames` : 'Frame'} to Klaviyo →
          </button>
        </div>
      )}

      {/* Global compression settings — shown once any frame has been sliced */}
      {frames.some(f => { const s = frameStates[f.id]?.step ?? 'select'; return s !== 'select' && s !== 'analyzing'; }) && (
        <div class="compress-settings" style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontStyle: 'italic' }}>
            ⚙ Compression settings apply to all frames
          </div>
          <div class="format-row">
            <span class="settings-label">Output Format</span>
            <div class="format-options">
              {(['auto', 'jpeg', 'png'] as const).map(fmt => (
                <button
                  key={fmt}
                  class={`format-btn ${compressFormat === fmt ? 'active' : ''}`}
                  onClick={() => setCompressFormat(fmt)}
                >
                  {fmt === 'auto' ? 'Auto' : fmt.toUpperCase()}
                </button>
              ))}
            </div>
            {compressFormat === 'png' && <span class="format-note">PNG is lossless — quality slider ignored</span>}
          </div>
          {compressFormat !== 'png' && (
            <div class="slider-row">
              <label>Quality <span>{compressQuality}%</span></label>
              <input type="range" min={50} max={100} value={compressQuality}
                onInput={(e) => setCompressQuality(+(e.target as HTMLInputElement).value)} />
              <div class="slider-hints"><span>Smaller file</span><span>Sharper image</span></div>
            </div>
          )}
          <div class="slider-row">
            <label>Max size per slice <span>{compressMaxKb} KB</span></label>
            <input type="range" min={50} max={400} step={25} value={compressMaxKb}
              onInput={(e) => setCompressMaxKb(+(e.target as HTMLInputElement).value)} />
            <div class="slider-hints"><span>50 KB</span><span>400 KB</span></div>
          </div>
        </div>
      )}

      {/* Per-frame workflow panel — only shown once slicing has started */}
      {frame && state.step !== 'select' && (
        <FrameWorkflow
          frame={frame}
          state={state}
          fromFigmaSlices={state.figmaSliceImages !== null}
          onSlice={() => sliceFrame(frame)}
          onReSlice={() => sliceFrame(frame, true)}
          onSlicesChange={(slices) => patchState(frame.id, { slices })}
          onRecompress={() => compressAndSave(frame, state)}
          onStepChange={(step) => patchState(frame.id, { step })}
          onErrorDismiss={() => patchState(frame.id, { error: null })}
          onCancelSlice={cancelSlice}
        />
      )}
    </div>
  );
}

// ─── FrameWorkflow — renders the UI for a single frame ────────────────────────

interface WorkflowProps {
  frame: FrameInfo;
  state: FrameState;
  fromFigmaSlices: boolean;
  onSlice: () => void;
  onReSlice: () => void;
  onSlicesChange: (slices: Slice[]) => void;
  onRecompress: () => void;
  onStepChange: (step: Step) => void;
  onErrorDismiss: () => void;
  onCancelSlice: () => void;
}

function FrameWorkflow({ frame, state, fromFigmaSlices, onSlice, onReSlice, onSlicesChange, onRecompress, onStepChange, onErrorDismiss, onCancelSlice }: WorkflowProps) {
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
          {fromFigmaSlices && (
            <p class="figma-slices-notice">✂ Using {slices.length} Figma slice node{slices.length !== 1 ? 's' : ''} from this frame</p>
          )}
          <SlicePreview
            slices={slices}
            frameHeight={frame.height}
            imageBase64={imageBase64}
            onSlicesChange={onSlicesChange}
            onReanalyze={onReSlice}
          />
        </div>
      )}

      {step === 'compressing' && (
        <div class="step-panel loading">
          <div class="spinner" />
          <p>Compressing {slices.length} slices…</p>
        </div>
      )}

      {step === 'results' && compressResponse && (
        <div class="step-panel">
          <CompressionResults response={compressResponse} />
          <div class="action-row">
            <button class="btn-secondary" onClick={() => onStepChange('preview')}>← Adjust</button>
            <button class="btn-secondary" onClick={onRecompress}>↻ Re-compress</button>
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
        <span>Per image: ≤400KB limit │ originals used if under limit</span>
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

/** Generate a collision-resistant ID. */
function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Export a frame as PNG and return base64. Times out after 30 s. */
async function exportFullFrame(frameId: string): Promise<string> {
  const reqId = generateId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Frame export timed out — try again.'));
    }, 30000);
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg || msg._reqId !== reqId) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      if (msg.type === 'FRAME_EXPORTED') resolve(msg.data);
      else if (msg.type === 'ERROR') reject(new Error(msg.message));
    };
    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'EXPORT_FRAME', frameId, _reqId: reqId } }, '*');
  });
}

/** Ask code.ts to compute slice bands from Figma node bounding boxes. */
function requestFrameLayout(frameId: string): Promise<LayoutBand[]> {
  const reqId = generateId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Frame layout timed out — try again.'));
    }, 30000);
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg || msg._reqId !== reqId) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      if (msg.type === 'FRAME_LAYOUT') resolve(msg.bands);
      else if (msg.type === 'ERROR') reject(new Error(msg.message));
    };
    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'GET_FRAME_LAYOUT', frameId, _reqId: reqId } }, '*');
  });
}

/** Read existing Figma SliceNodes from a frame and return their positions + exported images. */
function requestFigmaSlices(frameId: string): Promise<Array<{ name: string; y_start: number; y_end: number; imageBase64: string }>> {
  const reqId = generateId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Figma slice read timed out.'));
    }, 30000);
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg || msg._reqId !== reqId) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      if (msg.type === 'FIGMA_SLICES_LOADED') resolve(msg.slices);
      else if (msg.type === 'ERROR') reject(new Error(msg.message));
    };
    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'GET_FIGMA_SLICES', frameId, _reqId: reqId } }, '*');
  });
}

/** Create Figma SliceNodes on the frame matching current slice boundaries, then export each. */
function createSliceNodes(frameId: string, slices: Slice[]): Promise<Array<{ name: string; y_start: number; y_end: number; imageBase64: string }>> {
  const reqId = generateId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Creating slice nodes timed out — try again.'));
    }, 60000);
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg || msg._reqId !== reqId) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      if (msg.type === 'SLICE_NODES_CREATED') resolve(msg.slices);
      else if (msg.type === 'ERROR') reject(new Error(msg.message));
    };
    window.addEventListener('message', handler);
    parent.postMessage({
      pluginMessage: {
        type: 'CREATE_SLICE_NODES',
        frameId,
        slices: slices.map(s => ({ name: s.name, y_start: s.y_start, y_end: s.y_end })),
        _reqId: reqId
      }
    }, '*');
  });
}

/** Crop each slice region from the full-frame image using HTML Canvas (2× scale aware). */
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
