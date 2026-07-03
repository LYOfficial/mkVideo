'use client';

import { useApp } from '@/lib/AppContext';
import { usePlayer } from '@/lib/PlayerContext';

interface Props {
  onRename: (id: string) => void;
}

export default function CollectionList({ onRename }: Props) {
  const { data, removeCollection } = useApp();
  const { selectedCollectionId, setSelectedCollectionId } = usePlayer();

  return (
    <div>
      {data.collections.map((c) => {
        const isSelected = selectedCollectionId === c.id;
        const totalSize = c.videos.reduce((sum, v) => sum + v.size, 0);
        const sizeStr = totalSize > 0 ? formatSize(totalSize) : '';
        return (
          <div
            key={c.id}
            onClick={() => setSelectedCollectionId(c.id)}
            onDoubleClick={() => onRename(c.id)}
            className="flex items-center justify-between"
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
              borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#1a1a20';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="truncate"
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: 'var(--text-primary)',
                }}
                title={c.name}
              >
                {c.name}
              </div>
              <div
                className="truncate text-tertiary"
                style={{ fontSize: 11, marginTop: 2 }}
                title={c.path}
              >
                {c.videos.length} video{c.videos.length === 1 ? '' : 's'} · {sizeStr}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-ghost btn-icon"
                title="Rename"
                aria-label="Rename"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(c.id);
                }}
                style={{ width: 24, height: 24, fontSize: 11 }}
              >
                ✎
              </button>
              <button
                className="btn btn-ghost btn-icon"
                title="Remove"
                aria-label="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove collection "${c.name}"?\nThis will not delete files from disk.`)) {
                    if (selectedCollectionId === c.id) {
                      setSelectedCollectionId(null);
                    }
                    removeCollection(c.id);
                  }
                }}
                style={{ width: 24, height: 24, fontSize: 11, color: 'var(--danger)' }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}