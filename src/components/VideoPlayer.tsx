'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { isTauriEnv } from '@/lib/storage';
import { useApp } from '@/lib/AppContext';
import { usePlayer } from '@/lib/PlayerContext';
import type { Collection, Mask, MaskTemplate, VideoFile } from '@/lib/types';
import MaskCanvas, { type MaskWithTemplate } from './MaskCanvas';
import PlayerControls from './PlayerControls';
import LayerPanel from './LayerPanel';
import SaveTemplateDialog from './SaveTemplateDialog';

interface Props {
  collection: Collection;
}

export default function VideoPlayer({ collection }: Props) {
  const { selectedVideoId, setSelectedVideoId } = usePlayer();
  const { data, updateTemplate, getTemplatesForVideo } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [layerMasks, setLayerMasks] = useState<MaskWithTemplate[]>([]);

  const video = collection.videos.find((v) => v.id === selectedVideoId);

  // When the video changes, reset state
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setSelectedMaskId(null);
    setLayerMasks([]);
  }, [selectedVideoId]);

  // Build the effective list of masks (with template annotations) for the current video
  const effectiveMasks = useMemo<MaskWithTemplate[]>(() => {
    if (!video) return [];
    const templates = getTemplatesForVideo(video.id, collection.id);
    const out: MaskWithTemplate[] = [];
    for (const t of templates) {
      for (const m of t.masks) {
        out.push({ ...m, _templateId: t.id });
      }
    }
    return out;
  }, [video, collection.id, getTemplatesForVideo, data.templates, data.applications]);

  // When the effective masks from templates change, reset the local working copy.
  // (The user can edit freely; we only sync back to templates when they explicitly save
  // OR via the auto-save effect below.)
  useEffect(() => {
    setLayerMasks(effectiveMasks);
  }, [effectiveMasks]);

  // Auto-persist edits back to templates.
  // Strategy: for each mask in layerMasks with a _templateId, replace that mask in its template
  // by id. For new masks (no _templateId), we ignore them here - they're saved via "Save Template".
  const persistTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!video) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      const byTemplate = new Map<string, Mask[]>();
      for (const m of layerMasks) {
        if (!m._templateId) continue;
        const arr = byTemplate.get(m._templateId) || [];
        // Strip _templateId before writing back
        const { _templateId, ...rest } = m as any;
        arr.push(rest as Mask);
        byTemplate.set(m._templateId, arr);
      }
      // For each affected template, we need to update only masks belonging to the current video's effective masks.
      // Since templates may contain masks for multiple videos (template can be applied to different things),
      // we must preserve masks from other videos. To do that we apply edits to masks whose id matches
      // an existing template mask by id. New masks (no original) we discard here.
      for (const [tplId, edited] of byTemplate) {
        const tpl = data.templates.find((t) => t.id === tplId);
        if (!tpl) continue;
        const editedIds = new Set(edited.map((m) => m.id));
        const next = tpl.masks.map((m) => {
          const e = edited.find((em) => em.id === m.id);
          return e ? e : m;
        });
        // Drop any edited masks that don't match an existing template mask id
        // (these were removed from the template and we shouldn't add them back)
        const final = next.filter((m) => editedIds.has(m.id) || !edited.some((em) => em.id === m.id));
        // Simpler logic: keep masks present in tpl.masks; replace those that have an edited counterpart.
        const final2 = tpl.masks
          .map((m) => edited.find((e) => e.id === m.id) || m);
        if (JSON.stringify(final2) !== JSON.stringify(tpl.masks)) {
          updateTemplate(tplId, { masks: final2 });
        }
      }
    }, 200);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [layerMasks, data.templates, updateTemplate, video]);

  // Handle mask removal event from LayerPanel (when the selected mask != current selection)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      if (!detail?.id) return;
      setLayerMasks((prev) => prev.filter((m) => m.id !== detail.id));
      if (selectedMaskId === detail.id) setSelectedMaskId(null);
    };
    window.addEventListener('mk:remove-mask', handler as EventListener);
    return () => window.removeEventListener('mk:remove-mask', handler as EventListener);
  }, [selectedMaskId]);

  // Auto-play next video when current ends
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleEnded = () => {
      if (loop) {
        v.currentTime = 0;
        v.play().catch(() => {});
        return;
      }
      const idx = collection.videos.findIndex((vv) => vv.id === selectedVideoId);
      if (idx >= 0 && idx < collection.videos.length - 1) {
        setSelectedVideoId(collection.videos[idx + 1].id);
      } else {
        setPlaying(false);
      }
    };
    v.addEventListener('ended', handleEnded);
    return () => v.removeEventListener('ended', handleEnded);
  }, [selectedVideoId, collection.videos, loop, setSelectedVideoId]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch((e) => setError(`Cannot play: ${e.message || e}`));
    } else {
      v.pause();
    }
  }, []);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration || 0, t));
    setCurrentTime(v.currentTime);
  }, [duration]);

  const setRate = useCallback((r: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setPlaybackRate(r);
  }, []);

  const setVol = useCallback((vol: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, vol));
    v.muted = v.volume === 0;
    setVolume(v.volume);
    setMuted(v.muted);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const toggleLoop = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.loop = !v.loop;
    setLoop(v.loop);
  }, []);

  const stepFrame = useCallback((direction: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + direction / 30));
  }, [duration]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            const idx = collection.videos.findIndex((v) => v.id === selectedVideoId);
            if (idx > 0) setSelectedVideoId(collection.videos[idx - 1].id);
          } else {
            seek((videoRef.current?.currentTime || 0) - 5);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            const idx = collection.videos.findIndex((v) => v.id === selectedVideoId);
            if (idx >= 0 && idx < collection.videos.length - 1)
              setSelectedVideoId(collection.videos[idx + 1].id);
          } else {
            seek((videoRef.current?.currentTime || 0) + 5);
          }
          break;
        case ',':
          e.preventDefault();
          stepFrame(-1);
          break;
        case '.':
          e.preventDefault();
          stepFrame(1);
          break;
        case 'm':
          toggleMute();
          break;
        case 'l':
          toggleLoop();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedMaskId && window.__maskCanvasApi) {
            e.preventDefault();
            window.__maskCanvasApi.removeSelected();
          }
          break;
        case 'Escape':
          if (window.__maskCanvasApi) {
            window.__maskCanvasApi.stopEdit();
            window.__maskCanvasApi.setTool({ kind: 'select' });
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    togglePlay, seek, stepFrame, toggleMute, toggleLoop,
    collection.videos, selectedVideoId, setSelectedVideoId, selectedMaskId,
  ]);

  const videoSrc = video && isTauriEnv() ? convertFileSrc(video.path) : '';
  const fallbackSrc = video && !isTauriEnv() ? `file://${video.path}` : '';

  if (!video) {
    return (
      <section
        className="flex-1 flex items-center justify-center"
        style={{ background: '#000' }}
      >
        <div
          className="flex flex-col items-center"
          style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 40 }}
        >
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎞️</div>
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Select a video
          </div>
          <div style={{ fontSize: 12 }}>
            Pick a video from the list, or press <kbd>←</kbd>/<kbd>→</kbd> to switch.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="flex-1 flex flex-col"
      style={{ minWidth: 0, minHeight: 0, background: '#000' }}
    >
      <div
        className="flex-1 flex"
        style={{ minHeight: 0, position: 'relative', overflow: 'hidden' }}
      >
        <div
          className="flex-1 flex items-center justify-center"
          style={{ position: 'relative', minWidth: 0 }}
        >
          {error && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fff',
                borderRadius: 8,
                fontSize: 12,
                zIndex: 10,
              }}
            >
              {error}
            </div>
          )}
          <MaskCanvas
            videoRef={videoRef}
            masks={layerMasks}
            videoId={video.id}
            collectionId={collection.id}
            onMasksChange={setLayerMasks}
            onSelectMask={setSelectedMaskId}
            selectedMaskId={selectedMaskId}
          >
            <video
              ref={videoRef}
              src={videoSrc || fallbackSrc}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                display: 'block',
                background: '#000',
              }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDuration(v.duration || 0);
                v.volume = volume;
                v.muted = muted;
                v.playbackRate = playbackRate;
                v.loop = loop;
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onVolumeChange={(e) => {
                const v = e.currentTarget;
                setVolume(v.volume);
                setMuted(v.muted);
              }}
              onError={() => {
                setError(
                  `Cannot play "${video.name}". The codec may not be supported by this build. Try installing additional codecs.`,
                );
              }}
              onClick={togglePlay}
              preload="metadata"
              playsInline
            />
          </MaskCanvas>
        </div>

        {showLayers && (
          <LayerPanel
            masks={layerMasks}
            videoId={video.id}
            collectionId={collection.id}
            onClose={() => setShowLayers(false)}
          />
        )}
      </div>

      <PlayerControls
        videoRef={videoRef}
        video={video}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        loop={loop}
        showLayers={showLayers}
        onToggleLayers={() => setShowLayers((v) => !v)}
        onTogglePlay={togglePlay}
        onSeek={seek}
        onSetVolume={setVol}
        onToggleMute={toggleMute}
        onSetRate={setRate}
        onToggleLoop={toggleLoop}
        onToggleFullscreen={toggleFullscreen}
        onStepFrame={stepFrame}
        onSaveTemplate={() => setShowSaveTemplate(true)}
      />

      {showSaveTemplate && (
        <SaveTemplateDialog
          masks={layerMasks}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
    </section>
  );
}