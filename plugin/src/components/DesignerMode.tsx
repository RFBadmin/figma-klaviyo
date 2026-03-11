import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { SlicePreview } from './SlicePreview';
import type { Slice, SliceData, CompressedSlice, CompressResponse } from '../types';

const BACKEND_URL = 'https://figma-klaviyo-production.up.railway.app';

type Step = 'select' | 'analyzing' | 'preview' | 'compressing' | 'results' | 'saved';

interface FrameInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  existingSliceData?: SliceData | null;
}

interface Props {
  frame: FrameInfo | null;
}

export function DesignerMode({ frame }: Props) {
  const [step, setStep] = useState<Step>('select');
  const [slices, setSlices] = useState<Slice[]>([]);
  const [compressedSlices, setCompressedSlices] = useState<CompressedSlice[]>([]);
  const [compressResponse, setCompressResponse] = useState<CompressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // When a frame with existing slice data is loaded
  useEffect(() => {
    if (frame?.existingSliceData) {
      setSlices(frame.existingSliceData.slices);
      setStep('preview');
    } else if (frame) {
      setStep('select');
    }
  }, [frame]);

  // Listen for re-analyze and reset events from SlicePreview
  useEffect(() => {
    const onReanalyze = () => frame && analyzeFrame();
    const onReset = () => {
      setSlices([]);
      setStep('select');
    };
    window.addEventListener('reanalyze', onReanalyze);
    window.addEventListener('resetSlices', onReset);
    return () => {
      window.removeEventListener('reanalyze', onReanalyze);
      window.removeEventListener('resetSlices', onReset);
    };
  }, [frame]);

  const analyzeFrame = useCallback(async () => {
    if (!frame) return;
    setError(null);
    setStep('analyzing');

    try {
      // Ask Figma sandbox to export the frame
      parent.postMessage({
        pluginMessage: { type: 'EXPORT_SLICES', frameId: frame.id, slices: [] }
      }, '*');

      // Wait for export – we actually export the full frame here for analysis
      const fullExport = await exportFullFrame(frame.id);
      setImageBase64(fullExport);

      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: fullExport,
          frame_width: frame.width,
          frame_height: frame.height
        })
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);

      const data = await response.json();
      const newSlices: Slice[] = data.slices.map((s: { name: string; y_start: number; y_end: number; alt_text: string }, i: number) => ({
        id: `slice_${Date.now()}_${i}`,
        name: s.name,
        y_start: s.y_start,
        y_end: s.y_end,
        alt_text: s.alt_text
      }));

      setSlices(newSlices);
      setStep('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep('select');
    }
  }, [frame]);

  const compressAndSave = useCallback(async () => {
    if (!frame || slices.length === 0) return;
    setError(null);
    setStep('compressing');

    try {
      // Export each slice individually
      const sliceExports = await exportSlicesFromParent(frame.id, slices);

      const response = await fetch(`${BACKEND_URL}/api/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slices: sliceExports,
          settings: {
            target_size_kb: 100,
            max_size_kb: 200
          }
        })
      });

      if (!response.ok) throw new Error(`Compression failed: ${response.statusText}`);

      const data: CompressResponse = await response.json();
      setCompressResponse(data);
      setCompressedSlices(data.compressed);
      setStep('results');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep('preview');
    }
  }, [frame, slices]);

  const saveDesign = useCallback(() => {
    if (!frame) return;

    // Update slices with compressed URLs
    const updatedSlices = slices.map(s => {
      const compressed = compressedSlices.find(c => c.id === s.id);
      return compressed ? { ...s, compressed_url: compressed.temp_url } : s;
    });

    const sliceData: SliceData = {
      version: '1.0.0',
      created_by: 'designer',
      created_at: new Date().toISOString(),
      frame_id: frame.id,
      frame_name: frame.name,
      slices: updatedSlices,
      status: 'ready'
    };

    parent.postMessage({
      pluginMessage: { type: 'SAVE_SLICE_DATA', frameId: frame.id, data: sliceData }
    }, '*');

    setStep('saved');
  }, [frame, slices, compressedSlices]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!frame) {
    return (
      <div class="empty-state">
        <p>Select an email frame (500–700px wide) to get started.</p>
      </div>
    );
  }

  return (
    <div class="designer-mode">
      {error && (
        <div class="error-banner">
          ⚠ {error}
          <button onClick={() => setError(null)}>✕</button>
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
          <p>Frame selected. Click analyze to detect slice boundaries using Claude Vision.</p>
          <button class="btn-primary" onClick={analyzeFrame}>
            ✦ Analyze with AI
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div class="step-panel loading">
          <div class="spinner" />
          <p>Claude Vision is analyzing your design…</p>
        </div>
      )}

      {(step === 'preview') && (
        <div class="step-panel">
          <SlicePreview
            slices={slices}
            frameHeight={frame.height}
            onSlicesChange={setSlices}
          />
          <div class="action-row">
            <button class="btn-secondary" onClick={analyzeFrame}>↻ Re-analyze</button>
            <button class="btn-primary" onClick={compressAndSave}>Compress →</button>
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
            <button class="btn-secondary" onClick={() => setStep('preview')}>← Adjust Slices</button>
            <button class="btn-secondary" onClick={compressAndSave}>↻ Re-compress</button>
            <button
              class="btn-primary"
              disabled={compressResponse.summary.failed_count > 0}
              onClick={saveDesign}
            >
              Save →
            </button>
          </div>
        </div>
      )}

      {step === 'saved' && (
        <div class="step-panel success">
          <p>✓ Design saved! Tech team can now load it in Tech Mode.</p>
          <button class="btn-secondary" onClick={() => setStep('preview')}>Edit Slices</button>
        </div>
      )}
    </div>
  );
}

// ─── Compression Results Component ──────────────────────────────────────────

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
      if (msg?.type === 'EXPORT_COMPLETE' && msg.data?.length > 0) {
        window.removeEventListener('message', handler);
        resolve(msg.data[0].image_base64);
      } else if (msg?.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    window.addEventListener('message', handler);
    parent.postMessage({
      pluginMessage: {
        type: 'EXPORT_SLICES',
        frameId,
        slices: [{ id: 'full', name: 'full', y_start: 0, y_end: 9999, alt_text: '' }]
      }
    }, '*');
  });
}

async function exportSlicesFromParent(frameId: string, slices: Slice[]): Promise<{ id: string; image_base64: string; name: string }[]> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === 'EXPORT_COMPLETE') {
        window.removeEventListener('message', handler);
        resolve(msg.data);
      } else if (msg?.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'EXPORT_SLICES', frameId, slices } }, '*');
  });
}
