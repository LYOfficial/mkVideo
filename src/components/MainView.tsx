'use client';

import { useApp } from '@/lib/AppContext';
import { usePlayer } from '@/lib/PlayerContext';
import { useT } from '@/lib/i18n';
import VideoList from './VideoList';
import VideoPlayer from './VideoPlayer';

export default function MainView() {
  const { data } = useApp();
  const { selectedCollectionId, fitToWindow } = usePlayer();
  const t = useT();
  const collection = data.collections.find((c) => c.id === selectedCollectionId);

  if (!collection) {
    return (
      <main
        className="flex-1 flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            padding: 40,
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎬</div>
          <div
            style={{
              marginBottom: 6,
              color: 'var(--text-secondary)',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {t.welcome}
          </div>
          <div style={{ fontSize: 13, maxWidth: 420, lineHeight: 1.5 }}>
            {t.welcomeHint}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1"
      style={{ minWidth: 0, minHeight: 0, background: 'var(--bg-primary)' }}
    >
      {!fitToWindow && <VideoList collection={collection} />}
      <VideoPlayer collection={collection} />
    </main>
  );
}