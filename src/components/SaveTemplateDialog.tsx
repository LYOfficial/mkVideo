'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { useT } from '@/lib/i18n';
import type { Mask } from '@/lib/types';

interface Props {
  masks: Mask[];
  onClose: () => void;
}

export default function SaveTemplateDialog({ masks, onClose }: Props) {
  const { addTemplate, updateTemplate, data } = useApp();
  const t = useT();
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
            {t.noMasksToSave}
          </div>
          <div className="text-tertiary" style={{ fontSize: 12, marginBottom: 16 }}>
            {t.noMasksToSaveHint}
          </div>
          <button className="btn btn-primary" onClick={onClose}>
            {t.ok}
          </button>
        </div>
      </div>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed && !updateExisting) return;
    if (updateExisting) {
      const tpl = data.templates.find((tt) => tt.id === updateExisting);
      if (tpl) {
        updateTemplate(tpl.id, { name: trimmed || tpl.name, masks });
      }
    } else {
      addTemplate(trimmed || t.untitledTemplate, masks);
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
        <div style={{ fontSize: 16, fontWeight: 600 }}>{t.saveTemplateTitle}</div>
        <div className="text-secondary" style={{ fontSize: 12 }}>
          {t.saveTemplateDesc(masks.length)}
        </div>

        <div className="text-tertiary" style={{ fontSize: 11 }}>
          模板名称
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.templateNamePlaceholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
        />

        {data.templates.length > 0 && (
          <div>
            <div className="text-tertiary" style={{ fontSize: 11, marginBottom: 6 }}>
              {t.orUpdateExisting}
            </div>
            <div
              style={{
                maxHeight: 140,
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
              }}
            >
              {data.templates.map((tt) => (
                <div
                  key={tt.id}
                  onClick={() => setUpdateExisting(updateExisting === tt.id ? null : tt.id)}
                  style={{
                    padding: '6px 10px',
                    cursor: 'pointer',
                    background: updateExisting === tt.id ? 'var(--bg-tertiary)' : 'transparent',
                    borderLeft:
                      updateExisting === tt.id ? '3px solid var(--accent)' : '3px solid transparent',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{tt.name}</div>
                  <div className="text-tertiary" style={{ fontSize: 10 }}>
                    {t.videoCount(tt.masks.length)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!name.trim() && !updateExisting}
          >
            {updateExisting ? t.update : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}