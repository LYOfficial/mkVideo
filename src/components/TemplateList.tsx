'use client';

import { useApp } from '@/lib/AppContext';
import { usePlayer } from '@/lib/PlayerContext';

export default function TemplateList() {
  const { data, removeTemplate, updateTemplate, applyTemplate, removeApplication } = useApp();
  const { selectedCollectionId, selectedVideoId } = usePlayer();

  const templatesEmpty = data.templates.length === 0;

  const isApplied = (templateId: string, scope: 'video' | 'collection' | 'all', targetId: string) => {
    return data.applications.some(
      (a) => a.templateId === templateId && a.scope === scope && a.targetId === targetId,
    );
  };

  return (
    <div style={{ padding: '0 12px 12px 12px' }}>
      {templatesEmpty ? (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            padding: '40px 12px',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: 12,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎭</div>
          <div style={{ marginBottom: 4, color: 'var(--text-secondary)', fontWeight: 600 }}>
            No templates yet
          </div>
          <div>
            While watching a video, draw some masks and click "Save as Template" to create a reusable mask template.
          </div>
        </div>
      ) : (
        <>
          <div className="text-tertiary" style={{ fontSize: 11, margin: '8px 0 6px 0' }}>
            Templates can be batch-applied to a video, a collection, or all videos.
          </div>
          {data.templates.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 6,
                marginBottom: 8,
                border: '1px solid var(--border-color)',
              }}
            >
              <div className="flex items-center justify-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }} title={t.name}>
                    {t.name}
                  </div>
                  <div className="text-tertiary" style={{ fontSize: 11, marginTop: 2 }}>
                    {t.masks.length} mask{t.masks.length === 1 ? '' : 's'}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ width: 24, height: 24, color: 'var(--danger)' }}
                  title="Delete template"
                  aria-label="Delete template"
                  onClick={() => {
                    if (confirm(`Delete template "${t.name}"?\nThis will also remove all its applications.`)) {
                      removeTemplate(t.id);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center" style={{ gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="text-tertiary" style={{ fontSize: 11 }}>Apply to:</span>
                {selectedVideoId && selectedCollectionId ? (
                  <button
                    className={`btn ${isApplied(t.id, 'video', selectedVideoId) ? 'btn-primary' : ''}`}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      if (isApplied(t.id, 'video', selectedVideoId)) {
                        removeApplication(t.id, 'video', selectedVideoId);
                      } else {
                        applyTemplate(t.id, 'video', selectedVideoId);
                      }
                    }}
                    title="Current video"
                  >
                    🎬 Video
                  </button>
                ) : null}
                {selectedCollectionId ? (
                  <button
                    className={`btn ${
                      isApplied(t.id, 'collection', selectedCollectionId) ? 'btn-primary' : ''
                    }`}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      if (isApplied(t.id, 'collection', selectedCollectionId)) {
                        removeApplication(t.id, 'collection', selectedCollectionId);
                      } else {
                        applyTemplate(t.id, 'collection', selectedCollectionId);
                      }
                    }}
                    title="Current collection"
                  >
                    📁 Collection
                  </button>
                ) : null}
                <button
                  className={`btn ${isApplied(t.id, 'all', 'all') ? 'btn-primary' : ''}`}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => {
                    if (isApplied(t.id, 'all', 'all')) {
                      removeApplication(t.id, 'all', 'all');
                    } else {
                      applyTemplate(t.id, 'all', 'all');
                    }
                  }}
                  title="All videos"
                >
                  🌐 All
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}