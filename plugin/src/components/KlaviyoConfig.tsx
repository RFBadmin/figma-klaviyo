import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { KlaviyoList, KlaviyoCampaignConfig } from '../types';

interface Props {
  apiKey: string;
  backendUrl: string;
  /** Pre-fills template name (e.g. frame name). User can override. */
  defaultTemplateName?: string;
  onChange: (config: KlaviyoCampaignConfig) => void;
}

export function KlaviyoConfig({ apiKey, backendUrl, defaultTemplateName = '', onChange }: Props) {
  const [lists, setLists] = useState<KlaviyoList[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [config, setConfig] = useState<KlaviyoCampaignConfig>({
    mode: 'template',
    templateName: defaultTemplateName,
    campaignName: defaultTemplateName,
    subject: '',
    previewText: '',
    fromEmail: '',
    fromLabel: '',
    listId: '',
    sendTime: undefined
  });

  // Sync defaultTemplateName into state when it changes (e.g. on first render with a value)
  useEffect(() => {
    if (!defaultTemplateName) return;
    setConfig(prev => ({
      ...prev,
      templateName: prev.templateName || defaultTemplateName,
      campaignName: prev.campaignName || defaultTemplateName
    }));
  }, [defaultTemplateName]);

  useEffect(() => {
    fetchLists();
  }, [apiKey]);

  useEffect(() => {
    onChange(config);
  }, [config]);

  async function fetchLists() {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch(`${backendUrl}/api/klaviyo/lists`, {
        headers: { 'X-Klaviyo-Key': apiKey }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setListError(err.error || `Failed to load lists (${res.status})`);
        return;
      }
      const data = await res.json();
      setLists(data.lists);
      if (data.lists.length > 0) {
        update('listId', data.lists[0].id);
      }
    } catch {
      setListError('Could not reach backend — check your connection.');
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof KlaviyoCampaignConfig>(key: K, value: KlaviyoCampaignConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div class="klaviyo-config">
      <div class="mode-selector">
        <label>
          <input
            type="radio"
            name="mode"
            value="template"
            checked={config.mode === 'template'}
            onChange={() => update('mode', 'template')}
          />
          Template (reusable)
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="campaign"
            checked={config.mode === 'campaign'}
            onChange={() => update('mode', 'campaign')}
          />
          Campaign (one-time send)
        </label>
      </div>

      <div class="form-field">
        <label>Template Name</label>
        <input
          type="text"
          value={config.templateName}
          placeholder="e.g. Summer Sale 2026"
          onInput={(e) => update('templateName', (e.target as HTMLInputElement).value)}
        />
      </div>

      {config.mode === 'campaign' && (
        <>
          <div class="form-field">
            <label>Campaign Name</label>
            <input
              type="text"
              value={config.campaignName}
              placeholder="e.g. Summer Sale - June 2026"
              onInput={(e) => update('campaignName', (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="form-field">
            <label>From Email</label>
            <input
              type="email"
              value={config.fromEmail}
              placeholder="e.g. store@mycompany.com"
              onInput={(e) => update('fromEmail', (e.target as HTMLInputElement).value)}
            />
            {config.fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.fromEmail) && (
              <p style={{ fontSize: 11, color: '#e74c3c', margin: '4px 0 0' }}>Invalid email address</p>
            )}
          </div>

          <div class="form-field">
            <label>From Name</label>
            <input
              type="text"
              value={config.fromLabel}
              placeholder="e.g. My Company"
              onInput={(e) => update('fromLabel', (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="form-field">
            <label>Subject Line</label>
            <input
              type="text"
              value={config.subject}
              placeholder="e.g. Summer Sale - 40% Off!"
              onInput={(e) => update('subject', (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="form-field">
            <label>Preview Text</label>
            <input
              type="text"
              value={config.previewText}
              placeholder="e.g. Don't miss out on our biggest sale…"
              onInput={(e) => update('previewText', (e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="form-field">
            <label>Send To List</label>
            {loading ? (
              <p style={{ fontSize: 12, color: '#666' }}>Loading lists…</p>
            ) : listError ? (
              <p style={{ fontSize: 12, color: '#e74c3c' }}>⚠ {listError}</p>
            ) : (
              <select
                value={config.listId}
                onChange={(e) => update('listId', (e.target as HTMLSelectElement).value)}
              >
                {lists.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.member_count.toLocaleString()})
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}
    </div>
  );
}
