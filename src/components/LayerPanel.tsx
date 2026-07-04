'use client';

import { useState } from 'react';
import type { Mask } from '@/lib/types';
import type { MaskWithTemplate } from './MaskCanvas';
import { useT } from '@/lib/i18n';

interface Props {
  masks: (Mask | MaskWithTemplate)[];
  videoId: string;
  collectionId: string;
  onClose: () => void;
}

const SHAPE_ICONS: Record<string, string> = {
  rect: '▭',
  circle: '○',
  ellipse: '⬭',
  polygon: '⬡',
  curve: '∿',
};

export default function LayerPanel({ masks, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'rect' | 'circle' | 'ellipse' | 'polygon' | 'curve'>('select');
  const [fillColor, setFillColor] = useState('#000000');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const t = useT();

  const handleSetTool = (tt: typeof tool) => {
    setTool(tt);
    setSelectedId(null);
    if (window.__maskCanvasApi) {
      if (tt === 'select') {
        window.__maskCanvasApi.setTool({ kind: 'select' });
      } else {
        window.__maskCanvasApi.setTool({ kind: 'draw', shape: tt, fill: fillColor });
      }
    }
  };

  const handleFillChange = (c: string) => {
    setFillColor(c);
    const tool = window.__maskTool;
    const api = window.__maskCanvasApi;
    if (tool && tool.kind === 'draw') {
      // While in draw mode, the colour applies to the *next* mask being drawn.
      window.__maskTool = { ...tool, fill: c };
    } else if (api && api.getSelectedId()) {
      // In select mode with a selected mask, apply the colour directly.
      // Empty string / 'transparent' falls through to the same channel.
      api.updateSelectedFill(c);
    }
  };

  const handleSelectLayer = (id: string) => {
    setSelectedId(id);
    if (window.__maskCanvasApi) {
      window.__maskCanvasApi.setTool({ kind: 'select' });
    }
    setTool('select');
  };

  const handleDeleteLayer = (id: string) => {
    if (window.__maskCanvasApi) {
      const cur = window.__maskCanvasApi.getSelectedId();
      if (cur === id) {
        window.__maskCanvasApi.removeSelected();
      } else {
        window.dispatchEvent(new CustomEvent('mk:remove-mask', { detail: { id } }));
      }
    }
  };

  const handleEditToggle = (id: string) => {
    setEditingLayerId((cur) => {
      const next = cur === id ? null : id;
      if (window.__maskCanvasApi) {
        if (next) {
          window.__maskCanvasApi.startEdit();
        } else {
          window.__maskCanvasApi.stopEdit();
        }
      }
      return next;
    });
  };

  const toolButton = (tt: typeof tool, label: string, key: string) => (
    <button
      key={key}
      className={`btn ${tool === tt ? 'btn-primary' : ''}`}
      onClick={() => handleSetTool(tt)}
      title={label}
      style={{ flex: 1, padding: '6px 4px', fontSize: 11 }}
    >
      {label}
    </button>
  );

  return (
    <aside
      className="flex flex-col"
      style={{
        width: 280,
        minWidth: 280,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>{t.maskTools}</span>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          style={{ width: 22, height: 22, fontSize: 12 }}
          title={t.hidePanel}
          aria-label={t.hidePanel}
        >
          ✕
        </button>
      </div>

      {/* Tool buttons */}
      <div style={{ padding: 10, borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex" style={{ gap: 4 }}>
          {toolButton('select', t.selectTool, 'select')}
          {toolButton('rect', t.rectTool, 'rect')}
        </div>
        <div className="flex" style={{ gap: 4, marginTop: 4 }}>
          {toolButton('circle', t.circleTool, 'circle')}
          {toolButton('ellipse', t.ellipseTool, 'ellipse')}
        </div>
        <div className="flex" style={{ gap: 4, marginTop: 4 }}>
          {toolButton('polygon', t.polygonTool, 'polygon')}
          {toolButton('curve', t.curveTool, 'curve')}
        </div>

        <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
          <label className="text-tertiary" style={{ fontSize: 11, minWidth: 38 }}>
            {t.fillLabel}
          </label>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => handleFillChange(e.target.value)}
            style={{
              width: 32,
              height: 24,
              padding: 0,
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              background: 'transparent',
            }}
            title={t.fillLabel}
          />
          <input
            type="text"
            value={fillColor}
            onChange={(e) => handleFillChange(e.target.value)}
            style={{ flex: 1, fontSize: 11, fontFamily: 'monospace' }}
          />
          <button
            className="btn btn-ghost"
            onClick={() => handleFillChange('transparent')}
            style={{ fontSize: 10, padding: '4px 8px' }}
            title={t.resetColor}
          >
            ⟲
          </button>
        </div>

        <div
          className="text-tertiary"
          style={{ fontSize: 10, marginTop: 8, lineHeight: 1.4 }}
        >
          {tool === 'select'
            ? t.selectToolHint
            : tool === 'rect' || tool === 'circle' || tool === 'ellipse'
            ? t.drawShapeHint
            : t.drawPolyHint}
        </div>
      </div>

      {/* Layers list */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '8px 12px 4px 12px' }}
      >
        <span className="text-secondary" style={{ fontSize: 11, fontWeight: 600 }}>
          {t.layersCount(masks.length)}
        </span>
      </div>
      <div className="flex-1" style={{ overflowY: 'auto' }}>
        {masks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>🎭</div>
            <div>{t.noMasks}</div>
            <div>{t.noMasksHint}</div>
          </div>
        ) : (
          [...masks].reverse().map((m: any) => {
            const isSelected = selectedId === m.id;
            const isEditing = editingLayerId === m.id;
            return (
              <div
                key={m.id}
                onClick={() => handleSelectLayer(m.id)}
                className="flex items-center"
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLDivElement).style.background = '#1a1a20';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    background: m.fill === 'transparent' ? '#444' : m.fill,
                    borderRadius: 4,
                    marginRight: 8,
                    border: '1px solid #3a3a44',
                    opacity: m.visible ? 1 : 0.4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: 'white',
                  }}
                  title={m.fill}
                >
                  {SHAPE_ICONS[m.type] || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="truncate"
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {m.name || m.type}
                  </div>
                  <div className="text-tertiary" style={{ fontSize: 10 }}>
                    不透明度 {(m.opacity * 100).toFixed(0)}%{m._templateId ? t.fromTemplate : ''}
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: 2 }}>
                  {(m.type === 'polygon' || m.type === 'curve') && (
                    <button
                      className={`btn btn-ghost btn-icon ${isEditing ? 'btn-primary' : ''}`}
                      title={isEditing ? t.stopEditing : t.editPoints}
                      aria-label={t.editPoints}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditToggle(m.id);
                      }}
                      style={{ width: 22, height: 22, fontSize: 10 }}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-icon"
                    title={t.deleteLayer}
                    aria-label={t.deleteLayer}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(m.id);
                    }}
                    style={{ width: 22, height: 22, fontSize: 10, color: 'var(--danger)' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center"
        style={{
          padding: 10,
          borderTop: '1px solid var(--border-color)',
          gap: 6,
        }}
      >
        <button
          className="btn"
          style={{ flex: 1, fontSize: 11 }}
          onClick={() => {
            if (window.__maskCanvasApi) window.__maskCanvasApi.clearAll();
          }}
          disabled={masks.length === 0}
        >
          {t.clearAll}
        </button>
      </div>
    </aside>
  );
}