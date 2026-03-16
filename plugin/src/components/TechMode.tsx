import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { KlaviyoConfig } from './KlaviyoConfig';
import type { SliceData, Slice, KlaviyoCampaignConfig } from '../types';
import type { FrameInfo } from '../ui';

const BACKEND_URL = 'https://figma-klaviyo-production.up.railway.app';

type Step = 'key_setup' | 'configure' | 'pushing' | 'done';

// Slice with a frameId tag for multi-frame tracking
interface TaggedSlice extends Slice {
  _frameId: string;
  _frameName: string;
}

interface Props {
  frames: FrameInfo[];
}

export function TechMode({ frames }: Props) {
  const [step, setStep] = useState<Step>('key_setup');
  const [klaviyoKey, setKlaviyoKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [figmaUserName, setFigmaUserName] = useState<string>('');
  const [editedSlices, setEditedSlices] = useState<TaggedSlice[]>([]);
  const [klaviyoConfig, setKlaviyoConfig] = useState<KlaviyoCampaignConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ templateUrl?: string; campaignUrl?: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Frames that have been sliced and saved by the designer
  const readyFrames = frames.filter(f => f.existingSliceData);

  // On mount: load saved API key + Figma username
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'GET_KLAVIYO_KEY' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'GET_USER_INFO' } }, '*');

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      if (msg.type === 'KLAVIYO_KEY_LOADED') {
        if (msg.key) {
          setKlaviyoKey(msg.key);
          setStep('configure');
        }
      }

      if (msg.type === 'KLAVIYO_KEY_SAVED') {
        setStep('configure');
      }

      if (msg.type === 'USER_INFO') {
        setFigmaUserName(msg.name ?? '');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // When ready frames change and key is ready, rebuild combined slice list
  useEffect(() => {
    if (!klaviyoKey) return;
    const combined: TaggedSlice[] = [];
    for (const f of readyFrames) {
      for (const s of f.existingSliceData!.slices) {
        combined.push({ ...s, _frameId: f.id, _frameName: f.existingSliceData!.frame_name ?? f.name });
      }
    }
    setEditedSlices(combined);
  }, [klaviyoKey, frames.map(f => f.id + (f.existingSliceData ? '1' : '0')).join(',')]);

  const handleSaveKey = useCallback(() => {
    const trimmed = keyInput.trim();
    if (!trimmed.startsWith('pk_')) {
      setKeyError('Klaviyo Private API keys start with "pk_". Check your key and try again.');
      return;
    }
    setKeyError(null);
    setKlaviyoKey(trimmed);
    parent.postMessage({ pluginMessage: { type: 'SAVE_KLAVIYO_KEY', key: trimmed } }, '*');
  }, [keyInput]);

  const handleChangeKey = useCallback(() => {
    setKeyInput('');
    setKeyError(null);
    setStep('key_setup');
  }, []);

  const handlePreviewHtml = useCallback(async () => {
    if (editedSlices.length === 0) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/klaviyo/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slices: editedSlices })
      });
      const data = await res.json();
      setPreviewHtml(data.html);
    } catch {
      setError('Failed to generate preview.');
    }
  }, [editedSlices]);

  const handlePush = useCallback(async () => {
    if (!klaviyoKey || !klaviyoConfig) return;
    setError(null);
    setStep('pushing');

    try {
      // Fetch fresh images from Figma slice nodes for all ready frames
      const imageMap = new Map<string, string>(); // frameName:sliceName → base64
      for (const f of readyFrames) {
        const frameMap = await fetchFigmaSliceImages(f.id);
        for (const [name, b64] of frameMap) {
          imageMap.set(`${f.id}::${name}`, b64);
        }
      }

      // Build combined slices list, enriching with fresh images where available
      const slicesForPush = editedSlices.map(s => {
        const freshImage = imageMap.get(`${s._frameId}::${s.name}`);
        return freshImage
          ? { ...s, image_base64: freshImage }
          : s;
      });

      const res = await fetch(`${BACKEND_URL}/api/klaviyo/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Klaviyo-Key': klaviyoKey
        },
        body: JSON.stringify({
          slices: slicesForPush,
          config: klaviyoConfig
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string; detail?: unknown };
        const detail = errData.detail ? `\n${JSON.stringify(errData.detail, null, 2)}` : '';
        throw new Error((errData.error || `Push failed: ${res.statusText}`) + detail);
      }

      const data = await res.json();
      setPushResult(data);
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep('configure');
    }
  }, [klaviyoKey, editedSlices, klaviyoConfig, readyFrames]);

  const updateSlice = useCallback((id: string, field: keyof Slice, value: string) => {
    setEditedSlices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div class="tech-mode">
      {error && (
        <div class="error-banner">
          ⚠ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* API Key Setup */}
      {step === 'key_setup' && (
        <div class="step-panel">
          <div class="key-setup-header">
            <div class="key-icon">🔑</div>
            <p>Enter your Klaviyo Private API key. It's saved locally in Figma — you only need to do this once.</p>
          </div>

          <div class="form-field">
            <label>Klaviyo Private API Key</label>
            <input
              type="password"
              value={keyInput}
              placeholder="pk_••••••••••••••••••••••••••••"
              onInput={(e) => {
                setKeyInput((e.target as HTMLInputElement).value);
                setKeyError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
            />
            {keyError && <span class="field-error">{keyError}</span>}
          </div>

          <p class="key-hint">Find it in Klaviyo → Settings → API Keys → Create Private API Key</p>

          <button
            class="btn-primary"
            disabled={!keyInput.trim()}
            onClick={handleSaveKey}
          >
            Save & Continue →
          </button>
        </div>
      )}

      {/* Configure & Push */}
      {step === 'configure' && (
        <div class="step-panel">
          <div class="identity-bar">
            <span>👤 {figmaUserName || 'Figma User'}</span>
            <div class="key-indicator">
              <span class="key-masked">pk_••••••••</span>
              <button class="btn-link" onClick={handleChangeKey}>Change key</button>
            </div>
          </div>

          {readyFrames.length === 0 ? (
            <div class="warning-box">⚠ No sliced frames found. Have the Design team slice frames first.</div>
          ) : (
            <>
              <div class="design-summary">
                <span>📧</span>
                <div>
                  <strong>{readyFrames.length === 1 ? readyFrames[0].name : `${readyFrames.length} frames`}</strong>
                  <span>{editedSlices.length} slices total</span>
                </div>
              </div>

              <div class="section-title">Slice Configuration</div>
              <table class="slice-config-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Alt Text</th><th>Link</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows: h.JSX.Element[] = [];
                    let globalIdx = 0;
                    let lastFrameName = '';
                    for (const slice of editedSlices) {
                      if (readyFrames.length > 1 && slice._frameName !== lastFrameName) {
                        lastFrameName = slice._frameName;
                        rows.push(
                          <tr key={`frame-${slice._frameId}`} class="frame-divider-row">
                            <td colSpan={4}>📄 {slice._frameName}</td>
                          </tr>
                        );
                      }
                      globalIdx++;
                      rows.push(
                        <tr key={slice.id}>
                          <td>{globalIdx}</td>
                          <td>{slice.name}</td>
                          <td>
                            <input
                              type="text"
                              value={slice.alt_text}
                              onInput={(e) => updateSlice(slice.id, 'alt_text', (e.target as HTMLInputElement).value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={slice.link ?? ''}
                              placeholder="https://..."
                              onInput={(e) => updateSlice(slice.id, 'link', (e.target as HTMLInputElement).value)}
                            />
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>

              <div class="section-title">Push Destination</div>
              <KlaviyoConfig
                apiKey={klaviyoKey!}
                backendUrl={BACKEND_URL}
                onChange={setKlaviyoConfig}
              />

              <div class="action-row">
                <button class="btn-secondary" onClick={handlePreviewHtml}>Preview HTML</button>
                <button
                  class="btn-primary"
                  disabled={!klaviyoConfig?.templateName}
                  onClick={handlePush}
                >
                  Push to Klaviyo →
                </button>
              </div>

              {previewHtml && (
                <div class="html-preview">
                  <div class="preview-header">
                    HTML Preview
                    <button onClick={() => setPreviewHtml(null)}>✕</button>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    style={{ width: '100%', height: 300, border: '1px solid #ccc' }}
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 'pushing' && (
        <div class="step-panel loading">
          <div class="spinner" />
          <p>Uploading to Klaviyo…</p>
        </div>
      )}

      {step === 'done' && pushResult && (
        <div class="step-panel success">
          <p>✓ Successfully pushed to Klaviyo!</p>
          {pushResult.templateUrl && (
            <a href={pushResult.templateUrl} target="_blank" rel="noreferrer">View Template →</a>
          )}
          {pushResult.campaignUrl && (
            <a href={pushResult.campaignUrl} target="_blank" rel="noreferrer">View Campaign →</a>
          )}
          <button class="btn-secondary" onClick={() => setStep('configure')}>Push Another</button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Ask Figma to export the slice nodes on a frame and return a name→base64 map.
 * Falls back to empty map if there are no slice nodes or the request times out.
 */
function fetchFigmaSliceImages(frameId: string): Promise<Map<string, string>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(new Map());
    }, 15000);

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg?.type === 'FIGMA_SLICES_LOADED') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        const map = new Map<string, string>();
        for (const s of msg.slices as Array<{ name: string; imageBase64: string }>) {
          map.set(s.name, s.imageBase64);
        }
        resolve(map);
      }
    };

    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'GET_FIGMA_SLICES', frameId } }, '*');
  });
}
