'use client';

import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { isTauriEnv } from '@/lib/storage';
import { useT } from '@/lib/i18n';

interface Props {
  onClose: () => void;
  onSelect: (path: string) => void;
  scanning: boolean;
  error: string | null;
}

export default function AddCollectionDialog({ onClose, onSelect, scanning, error }: Props) {
  const [path, setPath] = useState('');
  const t = useT();

  const browse = async () => {
    if (!isTauriEnv()) {
      alert(t.browseOnlyInDesktop);
      return;
    }
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: t.addCollectionDialogTitle,
      });
      if (typeof result === 'string') {
        setPath(result);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div
      className="flex items-center justify-center"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 100,
      }}
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
        <div style={{ fontSize: 16, fontWeight: 600 }}>{t.addCollectionDialogTitle}</div>
        <div className="text-secondary" style={{ fontSize: 12 }}>
          {t.addCollectionDialogDesc}
        </div>

        <div className="flex items-center" style={{ gap: 8 }}>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder={t.browsePlaceholder}
            style={{ flex: 1 }}
          />
          <button className="btn" onClick={browse} disabled={scanning}>
            {t.browse}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={onClose} disabled={scanning}>
            {t.cancel}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (path.trim()) onSelect(path.trim());
            }}
            disabled={!path.trim() || scanning}
          >
            {scanning ? t.scanning : t.add}
          </button>
        </div>
      </div>
    </div>
  );
}