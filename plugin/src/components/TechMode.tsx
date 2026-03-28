import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { KlaviyoConfig } from './KlaviyoConfig';
import { BrandKeyManager } from './BrandKeyManager';
import type { SliceData, Slice, KlaviyoCampaignConfig } from '../types';
import type { FrameInfo } from '../ui';

const BACKEND_URL = 'https://figma-klaviyo-production.up.railway.app';

type Step = 'key_setup' | 'configure' | 'pushing' | 'done';

// Slice with a frameId tag for multi-frame tracking
interface TaggedSlice extends Slice {
  _frameId: string;
  _frameName: string;
}

interface FramePushResult {
  frameName: string;
  templateUrl?: string;
  campaignUrl?: string;
}

interface Props {
  frames: FrameInfo[];
}

/** Generate a collision-resistant ID for message correlation. */
function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function TechMode({ frames }: Props) {
  const [step, setStep] = useState<Step>('key_setup');
  const [klaviyoKey, setKlaviyoKey] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [figmaUserName, setFigmaUserName] = useState<string>('');
  const [editedSlices, setEditedSlices] = useState<TaggedSlice[]>([]);
  const [klaviyoConfig, setKlaviyoConfig] = useState<KlaviyoCampaignConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushResults, setPushResults] = useState<FramePushResult[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pushingFrame, setPushingFrame] = useState<string | null>(null);

  // Frames that have been sliced and saved by the designer
  const readyFrames = frames.filter(f => f.existingSliceData);

  // On mount: load Figma username only (key management moved to BrandKeyManager)
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'GET_USER_INFO' } }, '*');

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

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

  /** Called by BrandKeyManager once user clicks "Use" on a brand. */
  const handleBrandSelect = useCallback(async (brandName: string, apiKey: string) => {
    setConnecting(true);
    setConnectError(null);
    try {
      // Verify the key works by fetching lists
      const res = await fetch(`${BACKEND_URL}/api/klaviyo/lists`, {
        headers: { 'X-Klaviyo-Key': apiKey }
      });
      if (!res.ok) throw new Error('Invalid API key or Klaviyo error. Check the key and try again.');
      setKlaviyoKey(apiKey);
      setActiveBrand(brandName);
      setStep('configure');
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleChangeKey = useCallback(() => {
    setKlaviyoKey(null);
    setActiveBrand(null);
    setConnectError(null);
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

  /**
   * Push each ready frame as its own separate template + campaign.
   * 2 frames → 2 templates, 5 frames → 5 templates, etc.
   */
  const handlePush = useCallback(async () => {
    if (!klaviyoKey || !klaviyoConfig) return;
    setError(null);
    setPushResults([]);
    setStep('pushing');

    const results: FramePushResult[] = [];

    try {
      for (const f of readyFrames) {
        setPushingFrame(f.name);

        // Fetch fresh images from Figma slice nodes for this frame
        const imageMap = await fetchFigmaSliceImages(f.id);

        // Get slices that belong to this frame
        const frameSlices = editedSlices.filter(s => s._frameId === f.id);

        // Enrich with fresh images where available
        const slicesForPush = frameSlices.map(s => {
          const freshImage = imageMap.get(s.name);
          return freshImage ? { ...s, image_base64: freshImage } : s;
        });

        // When multiple frames are present, suffix each name with the frame name
        const isMultiFrame = readyFrames.length > 1;
        const frameConfig: KlaviyoCampaignConfig = {
          ...klaviyoConfig,
          templateName: isMultiFrame
            ? `${klaviyoConfig.templateName} — ${f.name}`
            : klaviyoConfig.templateName,
          campaignName: isMultiFrame
            ? `${klaviyoConfig.campaignName} — ${f.name}`
            : klaviyoConfig.campaignName
        };

        const res = await fetch(`${BACKEND_URL}/api/klaviyo/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Klaviyo-Key': klaviyoKey
          },
          body: JSON.stringify({
            slices: slicesForPush,
            config: frameConfig
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string; detail?: unknown };
          const detail = errData.detail ? `\n${JSON.stringify(errData.detail, null, 2)}` : '';
          throw new Error(`[${f.name}] ${errData.error || `Push failed: ${res.statusText}`}${detail}`);
        }

        const data = await res.json();
        results.push({
          frameName: f.name,
          templateUrl: data.templateUrl,
          campaignUrl: data.campaignUrl
        });
      }

      setPushResults(results);
      setPushingFrame(null);
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPushingFrame(null);
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

      {/* Brand Selection */}
      {step === 'key_setup' && (
        <div class="step-panel">
          {connectError && (
            <div class="error-banner" style={{ marginBottom: 10 }}>
              ⚠ {connectError}
              <button onClick={() => setConnectError(null)}>✕</button>
            </div>
          )}
          {connecting ? (
            <div class="loading" style={{ padding: '24px 0', textAlign: 'center' }}>
              <div class="spinner" />
              <p style={{ marginTop: 10 }}>Connecting…</p>
            </div>
          ) : (
            <BrandKeyManager onSelect={handleBrandSelect} />
          )}
        </div>
      )}

      {/* Configure & Push */}
      {step === 'configure' && (
        <div class="step-panel">
          <div class="connected-banner">
            <span>✓ Connected — {activeBrand}</span>
            <button class="btn-link" onClick={handleChangeKey}>Switch brand</button>
          </div>

          {readyFrames.length === 0 ? (
            <div class="warning-box">⚠ No sliced frames found. Have the Design team slice frames first.</div>
          ) : (
            <>
              <div class="design-summary">
                <span>📧</span>
                <div>
                  <strong>
                    {readyFrames.length === 1
                      ? readyFrames[0].name
                      : `${readyFrames.length} frames → ${readyFrames.length} templates`}
                  </strong>
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
              {readyFrames.length > 1 && (
                <p class="multi-frame-note">
                  ℹ {readyFrames.length} frames selected — each will create a separate template
                  {klaviyoConfig?.mode === 'campaign' ? ' and campaign' : ''}.
                </p>
              )}
              <KlaviyoConfig
                apiKey={klaviyoKey!}
                backendUrl={BACKEND_URL}
                defaultTemplateName={readyFrames.length === 1 ? readyFrames[0].name : ''}
                onChange={setKlaviyoConfig}
              />

              <div class="action-row">
                <button class="btn-secondary" onClick={handlePreviewHtml}>Preview HTML</button>
                <button
                  class="btn-primary"
                  disabled={!klaviyoConfig?.templateName}
                  onClick={handlePush}
                >
                  {readyFrames.length > 1
                    ? `Push ${readyFrames.length} Frames →`
                    : 'Push to Klaviyo →'}
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
          <p>Uploading to Klaviyo…{pushingFrame ? ` (${pushingFrame})` : ''}</p>
          {pushResults.length > 0 && (
            <p class="push-progress">{pushResults.length} of {readyFrames.length} done</p>
          )}
        </div>
      )}

      {step === 'done' && pushResults.length > 0 && (
        <div class="step-panel success">
          <p>✓ Successfully pushed {pushResults.length} frame{pushResults.length !== 1 ? 's' : ''} to Klaviyo!</p>
          <div class="push-results-list">
            {pushResults.map((r, i) => (
              <div key={i} class="push-result-item">
                {pushResults.length > 1 && <strong class="result-frame-name">📄 {r.frameName}</strong>}
                <div class="result-links">
                  {r.templateUrl && (
                    <a href={r.templateUrl} target="_blank" rel="noreferrer">View Template →</a>
                  )}
                  {r.campaignUrl && (
                    <a href={r.campaignUrl} target="_blank" rel="noreferrer">View Campaign →</a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button class="btn-secondary" onClick={() => setStep('configure')}>Push Again</button>
        </div>
      )}
    </div>
  );
}

/**
 * Ask Figma to export the slice nodes on a frame and return a name→base64 map.
 * Uses correlation ID to avoid race conditions.
 * Warns (but doesn't throw) if there are no slice nodes or the request times out.
 */
function fetchFigmaSliceImages(frameId: string): Promise<Map<string, string>> {
  const reqId = generateId();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      console.warn(`fetchFigmaSliceImages: timed out for frame ${frameId} — using cached data`);
      resolve(new Map());
    }, 15000);

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg || msg._reqId !== reqId) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      const map = new Map<string, string>();
      if (msg.type === 'FIGMA_SLICES_LOADED') {
        for (const s of msg.slices as Array<{ name: string; imageBase64: string }>) {
          map.set(s.name, s.imageBase64);
        }
      }
      resolve(map);
    };

    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'GET_FIGMA_SLICES', frameId, _reqId: reqId } }, '*');
  });
}
