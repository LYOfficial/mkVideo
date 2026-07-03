'use client';

import { useApp } from '@/lib/AppContext';
import { usePlayer } from '@/lib/PlayerContext';
import VideoList from './VideoList';
import VideoPlayer from './VideoPlayer';

export default function MainView() {
  const { data } = useApp();
  const { selectedCollectionId } = usePlayer();
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
            Welcome to mkVideo
          </div>
          <div style={{ fontSize: 13, maxWidth: 420, lineHeight: 1.5 }}>
            Add a folder of videos from the sidebar to get started. Draw mask shapes over the video to hide
            watermarks, subtitles, and other unwanted content.
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
      <VideoList collection={collection} />
      <VideoPlayer collection={collection} />
    </main>
  );
}