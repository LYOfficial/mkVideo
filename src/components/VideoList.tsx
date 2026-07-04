'use client';

import { useState, useMemo } from 'react';
import { usePlayer } from '@/lib/PlayerContext';
import { useT } from '@/lib/i18n';
import type { Collection } from '@/lib/types';

interface Props {
  collection: Collection;
}

export default function VideoList({ collection }: Props) {
  const { selectedVideoId, setSelectedVideoId } = usePlayer();
  const t = useT();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return collection.videos;
    const q = query.toLowerCase();
    return collection.videos.filter((v) => v.name.toLowerCase().includes(q));
  }, [collection.videos, query]);

  return (
    <div
      className="flex flex-col"
      style={{
        width: 260,
        minWidth: 260,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
        <div
          className="truncate"
          style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}
          title={collection.name}
        >
          {collection.name}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchVideosPlaceholder}
          style={{ width: '100%', fontSize: 12 }}
        />
      </div>
      <div className="flex-1" style={{ overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 12,
            }}
          >
            {collection.videos.length === 0 ? t.noVideosInFolder : t.noVideosMatchSearch}
          </div>
        ) : (
          filtered.map((v) => {
            const isSelected = selectedVideoId === v.id;
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVideoId(v.id)}
                className="flex items-center"
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#1a1a20';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <div style={{ marginRight: 8, fontSize: 16, opacity: 0.6 }}>🎞️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="truncate"
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 400,
                      color: 'var(--text-primary)',
                    }}
                    title={v.name}
                  >
                    {v.name}
                  </div>
                  <div className="text-tertiary" style={{ fontSize: 10, marginTop: 2 }}>
                    {formatSize(v.size)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}