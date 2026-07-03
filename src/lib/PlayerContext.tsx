'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

interface PlayerContextValue {
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
  selectedVideoId: string | null;
  setSelectedVideoId: (id: string | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const value = useMemo<PlayerContextValue>(
    () => ({
      selectedCollectionId,
      setSelectedCollectionId,
      selectedVideoId,
      setSelectedVideoId,
    }),
    [selectedCollectionId, selectedVideoId],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}