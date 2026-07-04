'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { useT } from '@/lib/i18n';

interface Props {
  collectionId: string;
  onClose: () => void;
}

export default function RenameCollectionDialog({ collectionId, onClose }: Props) {
  const { data, renameCollection } = useApp();
  const t = useT();
  const collection = data.collections.find((c) => c.id === collectionId);
  const [name, setName] = useState(collection?.name || '');

  if (!collection) {
    onClose();
    return null;
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    renameCollection(collectionId, trimmed);
    onClose();
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
          width: 420,
          maxWidth: '90vw',
          padding: 20,
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>{t.renameDialogTitle}</div>
        <div className="text-secondary" style={{ fontSize: 12 }}>
          {t.renameDialogDesc}
        </div>
        <div className="text-tertiary" style={{ fontSize: 11 }}>
          {t.folderLabel} {collection.path}
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.collectionNamePlaceholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex items-center justify-end" style={{ gap: 8 }}>
          <button className="btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={!name.trim()}>
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}