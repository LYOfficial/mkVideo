'use client';

import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauriEnv } from '@/lib/storage';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauriEnv()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const w = getCurrentWindow();
        const m = await w.isMaximized();
        setIsMaximized(m);
        unlisten = await w.onResized(async () => {
          const mm = await w.isMaximized();
          setIsMaximized(mm);
        });
      } catch (e) {
        // not in Tauri or window not available
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const minimize = async () => {
    if (!isTauriEnv()) return;
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleMaximize = async () => {
    if (!isTauriEnv()) return;
    try {
      const w = getCurrentWindow();
      if (await w.isMaximized()) {
        await w.unmaximize();
      } else {
        await w.maximize();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const close = async () => {
    if (!isTauriEnv()) return;
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div
      className="flex items-center justify-between no-select"
      style={{
        height: 32,
        background: '#0a0a0c',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2" style={{ paddingLeft: 12, paddingRight: 12 }}>
        <div
          style={{
            width: 18,
            height: 18,
            background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          mk
        </div>
        <span style={{ fontSize: 12, fontWeight: 600 }}>mkVideo</span>
        <span className="text-tertiary" style={{ fontSize: 11, marginLeft: 4 }}>
          MarkAVideo
        </span>
      </div>
      <div className="flex items-center" style={{ height: '100%' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={minimize}
          style={{ height: '100%', width: 46, borderRadius: 0, fontSize: 16 }}
          title="Minimize"
          aria-label="Minimize"
        >
          ─
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleMaximize}
          style={{ height: '100%', width: 46, borderRadius: 0, fontSize: 14 }}
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label="Maximize"
        >
          {isMaximized ? '❐' : '☐'}
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={close}
          style={{ height: '100%', width: 46, borderRadius: 0, fontSize: 14 }}
          title="Close"
          aria-label="Close"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#ef4444';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}