'use client';

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type RefObject,
  type ReactNode,
} from 'react';
import {
  drawMask,
  hitTestMask,
  translateMask,
  getMaskBBox,
  newId,
} from '@/lib/masks';
import type {
  Mask,
  MaskShapeType,
  RectMask,
  CircleMask,
  EllipseMask,
  PolygonMask,
  CurveMask,
} from '@/lib/types';

export type ToolMode =
  | { kind: 'select' }
  | { kind: 'draw'; shape: MaskShapeType; fill: string };

export type MaskWithTemplate = Mask & { _templateId?: string };

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  masks: MaskWithTemplate[];
  videoId: string;
  collectionId: string;
  onMasksChange?: (masks: MaskWithTemplate[]) => void;
  onSelectMask?: (id: string | null) => void;
  selectedMaskId?: string | null;
  children: ReactNode;
}

// Mask drawing and editing canvas overlay.
// All coordinates are normalized 0..1 over the video display area.
export default function MaskCanvas({
  videoRef,
  masks,
  onMasksChange,
  onSelectMask,
  selectedMaskId,
  children,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoRect, setVideoRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [localMasks, setLocalMasks] = useState<MaskWithTemplate[]>(masks);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedId = selectedMaskId !== undefined ? selectedMaskId : internalSelectedId;
  const setSelectedId = (id: string | null) => {
    if (selectedMaskId === undefined) setInternalSelectedId(id);
    if (onSelectMask) onSelectMask(id);
  };

  const [editingMaskId, setEditingMaskId] = useState<string | null>(null);
  const drawingRef = useRef<{
    type: 'draw-new' | 'translate' | 'resize' | 'edit-point';
    startNx: number;
    startNy: number;
    origMask?: MaskWithTemplate;
    handle?: string;
    pointIndex?: number;
    shape?: MaskShapeType;
    fill?: string;
    baseMask?: MaskWithTemplate;
  } | null>(null);

  // Polygon / curve drafting state
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[] | null>(null);
  const draftFillRef = useRef<string>('#000000');

  // Sync incoming masks -> local state (only when masks reference changes)
  useEffect(() => {
    setLocalMasks(masks);
  }, [masks]);

  // Notify parent of changes
  const emitChange = useCallback(
    (next: MaskWithTemplate[]) => {
      setLocalMasks(next);
      if (onMasksChange) onMasksChange(next);
    },
    [onMasksChange],
  );

  // ----- Coordinate helpers -----
  const toNorm = useCallback(
    (clientX: number, clientY: number): { nx: number; ny: number } | null => {
      const c = canvasRef.current;
      if (!c || videoRect.w <= 0 || videoRect.h <= 0) return null;
      const cRect = c.getBoundingClientRect();
      const px = clientX - cRect.left - videoRect.x;
      const py = clientY - cRect.top - videoRect.y;
      return {
        nx: Math.max(0, Math.min(1, px / videoRect.w)),
        ny: Math.max(0, Math.min(1, py / videoRect.h)),
      };
    },
    [videoRect],
  );

  const replaceMask = useCallback(
    (id: string, next: MaskWithTemplate) => {
      emitChange(localMasks.map((m) => (m.id === id ? next : m)));
    },
    [emitChange, localMasks],
  );

  const addMask = useCallback(
    (m: MaskWithTemplate) => {
      emitChange([...localMasks, m]);
      setSelectedId(m.id);
    },
    [emitChange, localMasks, setSelectedId],
  );

  const removeMask = useCallback(
    (id: string) => {
      emitChange(localMasks.filter((m) => m.id !== id));
      if (selectedId === id) setSelectedId(null);
      if (editingMaskId === id) setEditingMaskId(null);
    },
    [emitChange, localMasks, selectedId, editingMaskId, setSelectedId],
  );

  // ----- Resize observer -----
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const v = videoRef.current;
      const wEl = wrapperRef.current;
      if (!v || !wEl) return;
      const wRect = wEl.getBoundingClientRect();
      const vRect = v.getBoundingClientRect();
      const x = vRect.left - wRect.left;
      const y = vRect.top - wRect.top;
      const w = vRect.width;
      const h = vRect.height;

      const c = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      if (c) {
        const newCw = Math.max(1, Math.floor(wRect.width * dpr));
        const newCh = Math.max(1, Math.floor(wRect.height * dpr));
        // IMPORTANT: assigning canvas.width (or .height) clears the canvas
        // state, even when the value matches the current size.  That's why
        // the previous version, which reset the size every 500 ms, made the
        // mask flicker — the canvas was wiped between paint frames.
        if (c.width !== newCw || c.height !== newCh) {
          c.width = newCw;
          c.height = newCh;
        }
        c.style.width = `${wRect.width}px`;
        c.style.height = `${wRect.height}px`;
        const ctx = c.getContext('2d');
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Only update state if the rect actually changed, so React doesn't
      // re-render and force a redraw every 500 ms.
      setVideoRect((prev) =>
        prev.x === x && prev.y === y && prev.w === w && prev.h === h
          ? prev
          : { x, y, w, h },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    // A handful of delayed measurements is enough to catch the moment when
    // the <video> element finishes loading metadata and gets its real size.
    const pending: number[] = [];
    [100, 400, 800, 1500, 3000].forEach((delay) => {
      pending.push(window.setTimeout(measure, delay));
    });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      pending.forEach((id) => clearTimeout(id));
    };
  }, [videoRef]);

  // ----- Redraw -----
  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    if (videoRect.w <= 0 || videoRect.h <= 0) return;

    ctx.save();
    ctx.translate(videoRect.x, videoRect.y);
    ctx.scale(videoRect.w, videoRect.h);

    for (const m of localMasks) {
      drawMask(ctx, m);
    }

    if (selectedId && editingMaskId !== selectedId) {
      const m = localMasks.find((mm) => mm.id === selectedId);
      if (m && m.visible && !m.locked) {
        drawSelectionOverlay(ctx, m);
      }
    }

    if (draftPoints && draftPoints.length > 0) {
      ctx.save();
      ctx.fillStyle = draftFillRef.current;
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 0.003;
      ctx.beginPath();
      ctx.moveTo(draftPoints[0].x, draftPoints[0].y);
      for (let i = 1; i < draftPoints.length; i++) {
        ctx.lineTo(draftPoints[i].x, draftPoints[i].y);
      }
      ctx.stroke();
      // Preview fill if at least 3 points
      if (draftPoints.length >= 3) {
        ctx.fill();
      }
      // Draw anchor points
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      for (const p of draftPoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.007, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (editingMaskId) {
      const m = localMasks.find((mm) => mm.id === editingMaskId);
      if (m && (m.type === 'polygon' || m.type === 'curve')) {
        ctx.save();
        for (const p of m.points) {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#0ea5e9';
          ctx.lineWidth = 0.003;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.008, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }, [localMasks, selectedId, editingMaskId, draftPoints, videoRect]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ----- Hit testing & handle detection -----
  const findTopmostMask = useCallback(
    (nx: number, ny: number): MaskWithTemplate | null => {
      for (let i = localMasks.length - 1; i >= 0; i--) {
        const m = localMasks[i];
        if (hitTestMask(m, nx, ny)) return m;
      }
      return null;
    },
    [localMasks],
  );

  const getResizeHandle = useCallback(
    (m: MaskWithTemplate, nx: number, ny: number): string | null => {
      if (m.locked || !m.visible) return null;
      const handleSize = 0.012;
      if (m.type === 'rect') {
        const r = m as RectMask;
        const handles = [
          { name: 'nw', x: r.x, y: r.y },
          { name: 'n', x: r.x + r.w / 2, y: r.y },
          { name: 'ne', x: r.x + r.w, y: r.y },
          { name: 'e', x: r.x + r.w, y: r.y + r.h / 2 },
          { name: 'se', x: r.x + r.w, y: r.y + r.h },
          { name: 's', x: r.x + r.w / 2, y: r.y + r.h },
          { name: 'sw', x: r.x, y: r.y + r.h },
          { name: 'w', x: r.x, y: r.y + r.h / 2 },
        ];
        for (const h of handles) {
          if (Math.abs(nx - h.x) < handleSize && Math.abs(ny - h.y) < handleSize) return h.name;
        }
        return null;
      }
      if (m.type === 'circle') {
        const handles = [
          { name: 'n', x: m.cx, y: m.cy - m.r },
          { name: 'e', x: m.cx + m.r, y: m.cy },
          { name: 's', x: m.cx, y: m.cy + m.r },
          { name: 'w', x: m.cx - m.r, y: m.cy },
        ];
        for (const h of handles) {
          if (Math.abs(nx - h.x) < handleSize && Math.abs(ny - h.y) < handleSize) return h.name;
        }
        return null;
      }
      if (m.type === 'ellipse') {
        const handles = [
          { name: 'n', x: m.cx, y: m.cy - m.ry },
          { name: 'e', x: m.cx + m.rx, y: m.cy },
          { name: 's', x: m.cx, y: m.cy + m.ry },
          { name: 'w', x: m.cx - m.rx, y: m.cy },
        ];
        for (const h of handles) {
          if (Math.abs(nx - h.x) < handleSize && Math.abs(ny - h.y) < handleSize) return h.name;
        }
        return null;
      }
      return null;
    },
    [],
  );

  // ----- Mouse handlers -----
  //
  // Single-click on empty video area → toggle play/pause.
  // The canvas overlay sits on top of the <video> element, so clicks never
  // reach the video's own onClick. To preserve "click-to-play/pause" without
  // breaking mask editing, we:
  //   1. on mousedown in select mode over empty space, remember the start
  //      position and mark it as "candidate click on empty video area".
  //   2. on mouseup, if the mouse barely moved AND we're still in the
  //      "candidate click" state, call v.play() / v.pause() ourselves.
  // A drag (mouse moved > ~5 px) cancels the candidate so resize/translate
  // of an existing mask still works.
  const CLICK_DRAG_THRESHOLD_PX = 5;
  const pendingClickRef = useRef<{
    clientX: number;
    clientY: number;
    onEmptyVideoArea: boolean;
    nx: number;
    ny: number;
  } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      // Polygon/curve drafting - click adds point
      if (draftPoints) {
        const norm = toNorm(e.clientX, e.clientY);
        if (!norm) return;
        setDraftPoints((prev) => [...(prev || []), { x: norm.nx, y: norm.ny }]);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const norm = toNorm(e.clientX, e.clientY);
      if (!norm) return;

      // Editing-mode point drag
      if (editingMaskId) {
        const m = localMasks.find((mm) => mm.id === editingMaskId);
        if (m && (m.type === 'polygon' || m.type === 'curve')) {
          for (let i = 0; i < m.points.length; i++) {
            const p = m.points[i];
            if (Math.abs(p.x - norm.nx) < 0.015 && Math.abs(p.y - norm.ny) < 0.015) {
              drawingRef.current = {
                type: 'edit-point',
                startNx: norm.nx,
                startNy: norm.ny,
                origMask: m,
                pointIndex: i,
                baseMask: m,
              };
              e.preventDefault();
              pendingClickRef.current = null;
              return;
            }
          }
        }
      }

      // Draw new simple shape
      if (
        window.__maskTool &&
        window.__maskTool.kind === 'draw' &&
        (window.__maskTool.shape === 'rect' ||
          window.__maskTool.shape === 'circle' ||
          window.__maskTool.shape === 'ellipse')
      ) {
        drawingRef.current = {
          type: 'draw-new',
          startNx: norm.nx,
          startNy: norm.ny,
          shape: window.__maskTool.shape,
          fill: window.__maskTool.fill,
        };
        e.preventDefault();
        pendingClickRef.current = null;
        return;
      }

      // Select mode
      const top = findTopmostMask(norm.nx, norm.ny);
      if (!top) {
        setSelectedId(null);
        // Remember this mousedown as a potential click-to-toggle-play/pause.
        // We only treat it as such on mouseup, and only if the mouse barely
        // moved, so accidental drags over empty area don't toggle playback.
        pendingClickRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          onEmptyVideoArea: true,
          nx: norm.nx,
          ny: norm.ny,
        };
        return;
      }
      setSelectedId(top.id);
      // Click on a mask — not a video-toggle candidate.
      pendingClickRef.current = null;

      const handle = getResizeHandle(top, norm.nx, norm.ny);
      if (handle) {
        drawingRef.current = {
          type: 'resize',
          startNx: norm.nx,
          startNy: norm.ny,
          origMask: top,
          handle,
          baseMask: top,
        };
      } else {
        drawingRef.current = {
          type: 'translate',
          startNx: norm.nx,
          startNy: norm.ny,
          origMask: top,
          baseMask: top,
        };
      }
    },
    [draftPoints, toNorm, findTopmostMask, getResizeHandle, localMasks, editingMaskId, setSelectedId],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const d = drawingRef.current;
      // If we never started a real drag (drawingRef is null) but the mouse
      // moved beyond the click-drag threshold while a click was pending,
      // cancel the click — the user is dragging across empty video area,
      // not clicking.
      if (!d && pendingClickRef.current) {
        const pc = pendingClickRef.current;
        const dx = e.clientX - pc.clientX;
        const dy = e.clientY - pc.clientY;
        if (dx * dx + dy * dy > CLICK_DRAG_THRESHOLD_PX * CLICK_DRAG_THRESHOLD_PX) {
          pendingClickRef.current = null;
        }
      }
      if (!d) return;
      const norm = toNorm(e.clientX, e.clientY);
      if (!norm) return;

      if (d.type === 'draw-new') {
        const x = Math.min(d.startNx, norm.nx);
        const y = Math.min(d.startNy, norm.ny);
        const w = Math.abs(norm.nx - d.startNx);
        const h = Math.abs(norm.ny - d.startNy);
        const fill = d.fill || '#000000';
        let draft: MaskWithTemplate | null = null;
        if (d.shape === 'rect') {
          draft = {
            id: 'draft',
            type: 'rect',
            x,
            y,
            w: Math.max(0.001, w),
            h: Math.max(0.001, h),
            fill,
            opacity: 1,
            locked: false,
            visible: true,
            name: 'Rectangle',
          };
        } else if (d.shape === 'circle') {
          const r = Math.max(w, h) / 2;
          draft = {
            id: 'draft',
            type: 'circle',
            cx: x + w / 2,
            cy: y + h / 2,
            r: Math.max(0.001, r),
            fill,
            opacity: 1,
            locked: false,
            visible: true,
            name: 'Circle',
          };
        } else if (d.shape === 'ellipse') {
          draft = {
            id: 'draft',
            type: 'ellipse',
            cx: x + w / 2,
            cy: y + h / 2,
            rx: Math.max(0.001, w / 2),
            ry: Math.max(0.001, h / 2),
            fill,
            opacity: 1,
            locked: false,
            visible: true,
            name: 'Ellipse',
          };
        }
        if (draft) {
          emitChange([...localMasks.filter((m) => m.id !== 'draft'), draft]);
        }
      } else if (d.type === 'translate' && d.baseMask) {
        const base = d.baseMask;
        const moved = translateMask(base, norm.nx - d.startNx, norm.ny - d.startNy);
        replaceMask(base.id, { ...moved, _templateId: base._templateId } as MaskWithTemplate);
        // Update the base for incremental movement
        drawingRef.current = { ...d, startNx: norm.nx, startNy: norm.ny, baseMask: moved };
      } else if (d.type === 'resize' && d.baseMask && d.handle) {
        const base = d.baseMask;
        let updated: MaskWithTemplate = base;
        if (base.type === 'rect') {
          let { x, y, w, h } = base;
          const right = base.x + base.w;
          const bottom = base.y + base.h;
          switch (d.handle) {
            case 'nw':
              x = norm.nx; y = norm.ny;
              w = right - x; h = bottom - y;
              break;
            case 'n':
              y = norm.ny;
              h = bottom - y;
              break;
            case 'ne':
              y = norm.ny;
              w = norm.nx - base.x; h = bottom - y;
              break;
            case 'e':
              w = norm.nx - base.x;
              break;
            case 'se':
              w = norm.nx - base.x; h = norm.ny - base.y;
              break;
            case 's':
              h = norm.ny - base.y;
              break;
            case 'sw':
              x = norm.nx;
              w = right - x; h = norm.ny - base.y;
              break;
            case 'w':
              x = norm.nx;
              w = right - x;
              break;
          }
          if (w < 0.005) { w = 0.005; if (['nw','ne','e','se','s','sw','w'].includes(d.handle)) x = right - w; }
          if (h < 0.005) { h = 0.005; if (['nw','n','ne','sw','s','w'].includes(d.handle)) y = bottom - h; }
          updated = { ...base, x, y, w, h };
        } else if (base.type === 'circle') {
          let r = base.r;
          if (d.handle === 'n' || d.handle === 's') r = Math.abs(norm.ny - base.cy);
          else if (d.handle === 'e' || d.handle === 'w') r = Math.abs(norm.nx - base.cx);
          r = Math.max(0.005, r);
          updated = { ...base, r };
        } else if (base.type === 'ellipse') {
          let { rx, ry } = base;
          if (d.handle === 'n' || d.handle === 's') ry = Math.abs(norm.ny - base.cy);
          else if (d.handle === 'e' || d.handle === 'w') rx = Math.abs(norm.nx - base.cx);
          rx = Math.max(0.005, rx);
          ry = Math.max(0.005, ry);
          updated = { ...base, rx, ry };
        }
        replaceMask(base.id, updated);
        drawingRef.current = { ...d, baseMask: updated };
      } else if (d.type === 'edit-point' && d.baseMask && d.pointIndex != null) {
        const base = d.baseMask;
        if (base.type === 'polygon' || base.type === 'curve') {
          const newPts = base.points.map((p, i) =>
            i === d.pointIndex ? { x: norm.nx, y: norm.ny } : p,
          );
          const updated = { ...base, points: newPts };
          replaceMask(base.id, updated);
          drawingRef.current = { ...d, baseMask: updated };
        }
      }
    },
    [toNorm, emitChange, localMasks, replaceMask],
  );

  const onMouseUp = useCallback(
    (e?: MouseEvent) => {
      const d = drawingRef.current;
      // If we were dragging (draw/translate/resize/edit-point), finalise it.
      if (d && d.type === 'draw-new') {
        // Replace draft with real id
        const draft = localMasks.find((p) => p.id === 'draft');
        if (draft) {
          const real: MaskWithTemplate = { ...draft, id: newId('mk') } as MaskWithTemplate;
          emitChange([...localMasks.filter((m) => m.id !== 'draft'), real]);
          setSelectedId(real.id);
        }
      }

      // Click-to-toggle-play/pause:
      //   - pendingClickRef was set on mousedown over empty video area in
      //     select mode (no mask under cursor).
      //   - no real drag ever started (drawingRef is null).
      //   - the mouse barely moved between mousedown and mouseup.
      // → toggle video play/pause. Mirrors the <video onClick> behaviour
      // that the canvas overlay would otherwise swallow.
      const pc = pendingClickRef.current;
      if (pc && !d && e) {
        const dx = e.clientX - pc.clientX;
        const dy = e.clientY - pc.clientY;
        if (dx * dx + dy * dy <= CLICK_DRAG_THRESHOLD_PX * CLICK_DRAG_THRESHOLD_PX) {
          const v = videoRef.current;
          if (v) {
            if (v.paused) {
              v.play().catch(() => {});
            } else {
              v.pause();
            }
          }
        }
      }

      drawingRef.current = null;
      pendingClickRef.current = null;
    },
    [emitChange, localMasks, setSelectedId, videoRef],
  );

  // ----- Global mousemove / mouseup listeners -----
  // IMPORTANT: the listeners must be attached for the entire lifetime of the
  // component, NOT conditionally on `drawingRef.current` being truthy.
  // The previous implementation wrapped `addEventListener` in
  // `if (drawingRef.current) { ... }`, but useEffect only re-runs when its
  // dependency array changes. Setting `drawingRef.current` imperatively in
  // `onMouseDown` does NOT trigger a re-run, so the listeners were never
  // attached at all — drawing silently did nothing.
  //
  // We instead register the listeners exactly once on mount, and route them
  // through refs that always point at the latest version of the callbacks.
  // This avoids stale-closure problems while keeping the listeners alive
  // for the full life of the component.
  const moveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const upHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  moveHandlerRef.current = onMouseMove;
  upHandlerRef.current = onMouseUp;
  useEffect(() => {
    const onMove = (e: MouseEvent) => moveHandlerRef.current?.(e);
    const onUp = (e: MouseEvent) => upHandlerRef.current?.(e);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Double-click to finalize polygon/curve
  const onDoubleClick = useCallback(() => {
    if (
      window.__maskTool &&
      window.__maskTool.kind === 'draw' &&
      (window.__maskTool.shape === 'polygon' || window.__maskTool.shape === 'curve') &&
      draftPoints &&
      draftPoints.length >= 3
    ) {
      const fill = window.__maskTool.fill;
      const id = newId('mk');
      if (window.__maskTool.shape === 'polygon') {
        const m: PolygonMask = {
          id, type: 'polygon', name: 'Polygon',
          points: draftPoints, fill, opacity: 1, locked: false, visible: true,
        };
        emitChange([...localMasks, m]);
      } else {
        const m: CurveMask = {
          id, type: 'curve', name: 'Curve',
          points: draftPoints, closed: true, fill, opacity: 1, locked: false, visible: true,
        };
        emitChange([...localMasks, m]);
      }
      setDraftPoints(null);
      setSelectedId(id);
    }
  }, [draftPoints, emitChange, localMasks, setSelectedId]);

  useEffect(() => {
    if (!draftPoints) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraftPoints(null);
        window.__maskTool = { kind: 'select' };
      } else if (e.key === 'Enter') {
        onDoubleClick();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [draftPoints, onDoubleClick]);

  // Public API exposed via window for toolbar integration
  useEffect(() => {
    window.__maskCanvasApi = {
      setTool: (tool: ToolMode) => {
        if (tool.kind === 'draw' && (tool.shape === 'polygon' || tool.shape === 'curve')) {
          draftFillRef.current = tool.fill;
          setDraftPoints([]);
          window.__maskTool = tool;
        } else {
          setDraftPoints(null);
          window.__maskTool = tool;
        }
      },
      removeSelected: () => {
        if (selectedId) removeMask(selectedId);
      },
      startEdit: () => {
        if (selectedId) setEditingMaskId(selectedId);
      },
      stopEdit: () => setEditingMaskId(null),
      clearAll: () => emitChange([]),
      getMasks: () => localMasks,
      getSelectedId: () => selectedId,
      // Update the fill color of the currently selected mask in place.
      // No-op if nothing is selected or if the mask is locked.
      updateSelectedFill: (color: string) => {
        if (!selectedId) return;
        const target = localMasks.find((mm) => mm.id === selectedId);
        if (!target || target.locked) return;
        emitChange(
          localMasks.map((mm) =>
            mm.id === selectedId ? ({ ...mm, fill: color } as MaskWithTemplate) : mm,
          ),
        );
      },
      // Update the opacity of the currently selected mask in place.
      updateSelectedOpacity: (opacity: number) => {
        if (!selectedId) return;
        const target = localMasks.find((mm) => mm.id === selectedId);
        if (!target || target.locked) return;
        const clamped = Math.max(0, Math.min(1, opacity));
        emitChange(
          localMasks.map((mm) =>
            mm.id === selectedId ? ({ ...mm, opacity: clamped } as MaskWithTemplate) : mm,
          ),
        );
      },
      // Toggle visibility of the currently selected mask.
      toggleSelectedVisible: () => {
        if (!selectedId) return;
        const target = localMasks.find((mm) => mm.id === selectedId);
        if (!target) return;
        emitChange(
          localMasks.map((mm) =>
            mm.id === selectedId ? ({ ...mm, visible: !mm.visible } as MaskWithTemplate) : mm,
          ),
        );
      },
      // Toggle lock state of the currently selected mask.
      toggleSelectedLocked: () => {
        if (!selectedId) return;
        const target = localMasks.find((mm) => mm.id === selectedId);
        if (!target) return;
        emitChange(
          localMasks.map((mm) =>
            mm.id === selectedId ? ({ ...mm, locked: !mm.locked } as MaskWithTemplate) : mm,
          ),
        );
      },
    };
  }, [selectedId, removeMask, localMasks, emitChange]);

  return (
    <div
      ref={wrapperRef}
      className="flex items-center justify-center"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {children}
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: drawingRef.current ? 'grabbing' : 'default',
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}

function drawSelectionOverlay(ctx: CanvasRenderingContext2D, m: Mask) {
  ctx.save();
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 0.003;
  ctx.setLineDash([0.012, 0.008]);

  switch (m.type) {
    case 'rect':
      ctx.strokeRect(m.x, m.y, m.w, m.h);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(m.cx, m.cy, m.rx, m.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'polygon':
    case 'curve': {
      const pts = m.points;
      if (pts.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (m.type === 'polygon') ctx.closePath();
      ctx.stroke();
      break;
    }
  }
  ctx.setLineDash([]);

  // Resize handles
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 0.002;
  const drawHandle = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.007, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  if (m.type === 'rect') {
    drawHandle(m.x, m.y);
    drawHandle(m.x + m.w / 2, m.y);
    drawHandle(m.x + m.w, m.y);
    drawHandle(m.x + m.w, m.y + m.h / 2);
    drawHandle(m.x + m.w, m.y + m.h);
    drawHandle(m.x + m.w / 2, m.y + m.h);
    drawHandle(m.x, m.y + m.h);
    drawHandle(m.x, m.y + m.h / 2);
  } else if (m.type === 'circle') {
    drawHandle(m.cx, m.cy - m.r);
    drawHandle(m.cx + m.r, m.cy);
    drawHandle(m.cx, m.cy + m.r);
    drawHandle(m.cx - m.r, m.cy);
  } else if (m.type === 'ellipse') {
    drawHandle(m.cx, m.cy - m.ry);
    drawHandle(m.cx + m.rx, m.cy);
    drawHandle(m.cx, m.cy + m.ry);
    drawHandle(m.cx - m.rx, m.cy);
  }
  ctx.restore();
}

// Augment window type for cross-component communication
declare global {
  interface Window {
    __maskTool?:
      | { kind: 'select' }
      | { kind: 'draw'; shape: MaskShapeType; fill: string };
    __maskCanvasApi?: {
      setTool: (tool: ToolMode) => void;
      removeSelected: () => void;
      startEdit: () => void;
      stopEdit: () => void;
      clearAll: () => void;
      getMasks: () => MaskWithTemplate[];
      getSelectedId: () => string | null;
      updateSelectedFill: (color: string) => void;
      updateSelectedOpacity: (opacity: number) => void;
      toggleSelectedVisible: () => void;
      toggleSelectedLocked: () => void;
    };
  }
}