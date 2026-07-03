'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import type { Mask } from '@/lib/types';

interface Props {
  masks: Mask[];
  onClose: () => void;
}

export default function SaveTemplateDialog({ masks, onClose }: Props) {
  const { addTemplate, updateTemplate, data } = useApp();
  const [name, setName] = useState('');
  const [updateExisting, setUpdateExisting] = useState<string | null>(null);

  if (masks.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            width: 420,
            padding: 24,
            textAlign: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎭</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            No masks to save
          </div>
          <div className="text-tertiary" style={{ fontSize: 12, marginBottom: 16 }}>
            Draw some masks first, then come back to save them as a reusable template.
          </div>
          <button className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed && !updateExisting) return;
    if (updateExisting) {
      // Replace masks of an existing template
      const tpl = data.templates.find((t) => t.id === updateExisting);
      if (tpl) {
        updateTemplate(tpl.id, { name: trimmed || tpl.name, masks });
      }
    } else {
      addTemplate(trimmed || 'Untitled Template', masks);
    }
    onClose();
  };

  return (
    <div
      className="flex items-center justify-center"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        className="flex flex-col"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          width: 480,
          maxWidth: '90vw',
          padding: 20,
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>Save mask template</div>
        <div className="text-secondary" style={{ fontSize: 12 }}>
          Save these {masks.length} mask{masks.length === 1 ? '' : 's'} as a reusable template.
          You can then apply this template to a video, a whole collection, or all videos at once.
        </div>

        <div className="text-tertiary" style={{ fontSize: 11 }}>
          Template name
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Watermark removal"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
        />

        {data.templates.length > 0 && (
          <div>
            <div className="text-tertiary" style={{ fontSize: 11, marginBottom: 6 }}>
              Or update an existing template:
            </div>
            <div
              style={{
                maxHeight: 140,
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
              }}
            >
              {data.templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setUpdateExisting(updateExisting === t.id ? null : t.id)}
                  style={{
                    padding: '6px 10px',
                    cursor: 'pointer',
                    background: updateExisting === t.id ? 'var(--bg-tertiary)' : 'transparent',
                    borderLeft:
                      updateExisting === t.id ? '3px solid var(--accent)' : '3px solid transparent',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div className="text-tertiary" style={{ fontSize: 10 }}>
                    {t.masks.length} mask{t.masks.length === 1 ? '' : 's'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!name.trim() && !updateExisting}
          >
            {updateExisting ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}