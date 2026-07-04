'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import MainView from '@/components/MainView';
import TitleBar from '@/components/TitleBar';
import { useApp } from '@/lib/AppContext';
import { usePlayer } from '@/lib/PlayerContext';

export default function HomePage() {
  const { loaded } = useApp();
  const { fitToWindow } = usePlayer();
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    if (loaded) {
      const t = setTimeout(() => setShowLoading(false), 200);
      return () => clearTimeout(t);
    }
  }, [loaded]);

  if (showLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', width: '100vw' }}>
        <div className="flex items-center gap-3">
          <div className="spinner"></div>
          <span className="text-secondary">Loading mkVideo…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', width: '100vw' }}>
      <TitleBar />
      <div className="flex flex-1" style={{ minHeight: 0 }}>
        {!fitToWindow && <Sidebar />}
        <MainView />
      </div>
    </div>
  );
}