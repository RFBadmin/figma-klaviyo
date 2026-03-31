import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

import { BACKEND_URL } from '../config';

interface Props {
  onSelect: (brandName: string, apiKey: string) => void;
}

export function BrandKeyManager({ onSelect }: Props) {
  const [brands, setBrands] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingBrand, setSelectingBrand] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  // Edit state
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add new brand state
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchBrands = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/brands`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setBrands(data.brands ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const filteredBrands = brands.filter(b =>
    b.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (name: string) => {
    setSelectingBrand(name);
    setSelectError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/brands/${encodeURIComponent(name)}/key`);
      if (!res.ok) throw new Error(`Failed to retrieve key for "${name}"`);
      const data = await res.json();
      onSelect(name, data.apiKey);
    } catch (e) {
      setSelectError(e instanceof Error ? e.message : 'Failed to retrieve key');
      setSelectingBrand(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete brand "${name}"?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/brands/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      setBrands(prev => prev.filter(b => b !== name));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const startEdit = (name: string) => {
    setEditingBrand(name);
    setEditName(name);
    setEditKey('');
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingBrand(null);
    setEditName('');
    setEditKey('');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingBrand) return;
    if (!editName.trim()) { setEditError('Brand name is required'); return; }
    if (editKey && !editKey.startsWith('pk_')) {
      setEditError('API key must start with pk_');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const body: Record<string, string> = { name: editName.trim() };
      if (editKey.trim()) body.apiKey = editKey.trim();
      const res = await fetch(
        `${BACKEND_URL}/api/brands/${encodeURIComponent(editingBrand)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }
      await fetchBrands();
      cancelEdit();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) { setAddError('Brand name is required'); return; }
    if (!newKey.trim()) { setAddError('API key is required'); return; }
    if (!newKey.startsWith('pk_')) { setAddError('API key must start with pk_'); return; }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), apiKey: newKey.trim() })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Add failed');
      }
      setNewName('');
      setNewKey('');
      await fetchBrands();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div class="brand-manager">
      <div class="key-setup-header">
        <div class="key-icon">🏷️</div>
        <p>Select a brand to connect its Klaviyo account, or add a new brand below.</p>
      </div>

      {error && (
        <div class="error-banner">
          ⚠ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {selectError && (
        <div class="error-banner">
          ⚠ {selectError}
          <button onClick={() => setSelectError(null)}>✕</button>
        </div>
      )}

      {/* Search */}
      <div class="form-field" style={{ marginBottom: 6 }}>
        <input
          type="text"
          placeholder="🔍 Search brand..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Brand list */}
      {loading ? (
        <div class="brand-empty">Loading brands…</div>
      ) : filteredBrands.length === 0 ? (
        <div class="brand-empty">
          {brands.length === 0 ? 'No brands yet — add one below.' : 'No brands match your search.'}
        </div>
      ) : (
        <div class="brand-list">
          {filteredBrands.map(name => (
            editingBrand === name ? (
              <div key={name} class="brand-row brand-row-edit">
                <input
                  type="text"
                  class="brand-edit-input"
                  value={editName}
                  placeholder="Brand name"
                  onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
                />
                <input
                  type="password"
                  class="brand-edit-input"
                  value={editKey}
                  placeholder="New key (leave blank to keep)"
                  onInput={(e) => setEditKey((e.target as HTMLInputElement).value)}
                />
                <div class="brand-row-actions">
                  <button
                    class="btn-xs btn-primary"
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                  >
                    {editSaving ? '…' : 'Save'}
                  </button>
                  <button class="btn-xs btn-secondary" onClick={cancelEdit}>Cancel</button>
                </div>
                {editError && <span class="field-error" style={{ gridColumn: '1/-1' }}>{editError}</span>}
              </div>
            ) : (
              <div key={name} class="brand-row">
                <span class="brand-row-name">{name}</span>
                <div class="brand-row-actions">
                  <button
                    class="btn-xs btn-primary"
                    onClick={() => handleSelect(name)}
                    disabled={selectingBrand === name}
                  >
                    {selectingBrand === name ? '…' : 'Use'}
                  </button>
                  <button class="btn-xs btn-secondary" onClick={() => startEdit(name)}>Edit</button>
                  <button class="btn-xs btn-danger" onClick={() => handleDelete(name)}>✕</button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Add new brand */}
      <div class="brand-add-section">
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
          Add new brand
        </div>
        <div class="brand-add-row">
          <input
            type="text"
            placeholder="Brand name"
            value={newName}
            onInput={(e) => { setNewName((e.target as HTMLInputElement).value); setAddError(null); }}
          />
          <input
            type="password"
            placeholder="pk_•• API Key"
            value={newKey}
            onInput={(e) => { setNewKey((e.target as HTMLInputElement).value); setAddError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            class="btn-primary"
            onClick={handleAdd}
            disabled={adding || !newName.trim() || !newKey.trim()}
          >
            {adding ? '…' : '+ Add'}
          </button>
        </div>
        {addError && <span class="field-error">{addError}</span>}
      </div>
    </div>
  );
}
