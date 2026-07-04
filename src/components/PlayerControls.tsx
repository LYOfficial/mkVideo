'use client';

import { useEffect, useRef, useState } from 'react';
import type { VideoFile } from '@/lib/types';
import type { RefObject } from 'react';
import { useT } from '@/lib/i18n';

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  video: VideoFile;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  loop: boolean;
  showLayers: boolean;
  onToggleLayers: () => void;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onSetVolume: (v: number) => void;
  onToggleMute: () => void;
  onSetRate: (r: number) => void;
  onToggleLoop: () => void;
  onToggleFullscreen: () => void;
  onStepFrame: (d: 1 | -1) => void;
  onSaveTemplate: () => void;
}

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export default function PlayerControls({
  video,
  playing,
  currentTime,
  duration,
  volume,
  muted,
  playbackRate,
  loop,
  showLayers,
  onTogglePlay,
  onSeek,
  onSetVolume,
  onToggleMute,
  onSetRate,
  onToggleLoop,
  onToggleFullscreen,
  onStepFrame,
  onSaveTemplate,
  onToggleLayers,
}: Props) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const speedRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (speedRef.current && !speedRef.current.contains(e.target as Node)) setShowSpeedMenu(false);
      if (volRef.current && !volRef.current.contains(e.target as Node)) setShowVolume(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="flex flex-col no-select"
      style={{
        background: '#0a0a0c',
        borderTop: '1px solid var(--border-color)',
        flexShrink: 0,
      }}
    >
      {/* Progress bar */}
      <div
        className="flex items-center"
        style={{ padding: '6px 12px 0 12px', gap: 10 }}
      >
        <span style={{ fontSize: 11, fontFamily: 'monospace', minWidth: 50, color: 'var(--text-secondary)' }}>
          {formatTime(currentTime)}
        </span>
        <div
          style={{
            flex: 1,
            position: 'relative',
            height: 18,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              margin: 'auto 0',
              height: 4,
              background: '#2a2a33',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              margin: 'auto 0',
              height: 4,
              width: `${pct}%`,
              background: 'var(--accent)',
              borderRadius: 2,
            }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', minWidth: 50, textAlign: 'right', color: 'var(--text-secondary)' }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Buttons row */}
      <div className="flex items-center" style={{ padding: '6px 12px', gap: 6 }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => onStepFrame(-1)}
          title={`${t.previousFrame} (←)`}
          aria-label={t.previousFrame}
        >
          ⏮
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onTogglePlay}
          title={playing ? `${t.pause} (空格)` : `${t.play} (空格)`}
          aria-label={playing ? t.pause : t.play}
          style={{ fontSize: 18, width: 36, height: 30 }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => onStepFrame(1)}
          title={`${t.nextFrame} (→)`}
          aria-label={t.nextFrame}
        >
          ⏭
        </button>

        {/* Volume control */}
        <div ref={volRef} style={{ position: 'relative' }} onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onToggleMute}
            title={muted ? `${t.unmute} (M)` : `${t.mute} (M)`}
            aria-label={muted ? t.unmute : t.mute}
          >
            {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔈' : '🔊'}
          </button>
          {showVolume && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                padding: '12px 8px',
                height: 110,
                width: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                style={{
                  writingMode: 'vertical-lr' as any,
                  WebkitAppearance: 'slider-vertical' as any,
                  width: 16,
                  height: 86,
                }}
                {...({ orient: 'vertical' } as any)}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Mask toolbar buttons */}
        <button
          className={`btn ${showLayers ? 'btn-primary' : ''}`}
          onClick={onToggleLayers}
          title={t.toggleMaskPanel}
          aria-label={t.toggleMaskPanel}
          style={{ fontSize: 12 }}
        >
          🎭 {t.toggleMaskPanel}
        </button>
        <button
          className="btn"
          onClick={onSaveTemplate}
          title={t.saveAsTemplateHint}
          style={{ fontSize: 12 }}
        >
          💾 {t.saveAsTemplate}
        </button>

        <div style={{ width: 8 }} />

        {/* Loop */}
        <button
          className={`btn btn-ghost btn-icon ${loop ? 'btn-primary' : ''}`}
          onClick={onToggleLoop}
          title={loop ? `${t.loopOn} (L)` : `${t.loopOff} (L)`}
          aria-label={t.toggleLoop}
        >
          🔁
        </button>

        {/* Speed */}
        <div ref={speedRef} style={{ position: 'relative' }}>
          <button
            className="btn"
            onClick={() => setShowSpeedMenu((v) => !v)}
            title={t.playbackSpeed}
            style={{ fontSize: 12, minWidth: 56 }}
          >
            {playbackRate}×
          </button>
          {showSpeedMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                padding: 4,
                zIndex: 10,
                minWidth: 80,
              }}
            >
              {RATES.map((r) => (
                <button
                  key={r}
                  className={`btn btn-ghost ${playbackRate === r ? 'btn-primary' : ''}`}
                  onClick={() => {
                    onSetRate(r);
                    setShowSpeedMenu(false);
                  }}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '4px 10px',
                    fontSize: 12,
                  }}
                >
                  {r}×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fullscreen */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={onToggleFullscreen}
          title={`${t.fullscreen} (F)`}
          aria-label={t.fullscreen}
        >
          ⛶
        </button>
      </div>
    </div>
  );
}

function formatTime(t: number): string {
  if (!isFinite(t) || t < 0) return '00:00';
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}