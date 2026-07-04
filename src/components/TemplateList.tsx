'use client';

import { useApp } from '@/lib/AppContext';
import { usePlayer } from '@/lib/PlayerContext';
import { useT } from '@/lib/i18n';

export default function TemplateList() {
  const { data, removeTemplate, applyTemplate, removeApplication } = useApp();
  const { selectedCollectionId, selectedVideoId } = usePlayer();
  const t = useT();

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
            {t.noTemplates}
          </div>
          <div>{t.noTemplatesHint}</div>
        </div>
      ) : (
        <>
          <div className="text-tertiary" style={{ fontSize: 11, margin: '8px 0 6px 0' }}>
            {t.applyTo}
          </div>
          {data.templates.map((tt) => (
            <div
              key={tt.id}
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
                  <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }} title={tt.name}>
                    {tt.name}
                  </div>
                  <div className="text-tertiary" style={{ fontSize: 11, marginTop: 2 }}>
                    {t.videoCount(tt.masks.length)}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ width: 24, height: 24, color: 'var(--danger)' }}
                  title={t.deleteTemplate}
                  aria-label={t.deleteTemplate}
                  onClick={() => {
                    if (confirm(t.confirmDeleteTemplate(tt.name))) {
                      removeTemplate(tt.id);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center" style={{ gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="text-tertiary" style={{ fontSize: 11 }}>{t.applyTo}</span>
                {selectedVideoId && selectedCollectionId ? (
                  <button
                    className={`btn ${isApplied(tt.id, 'video', selectedVideoId) ? 'btn-primary' : ''}`}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      if (isApplied(tt.id, 'video', selectedVideoId)) {
                        removeApplication(tt.id, 'video', selectedVideoId);
                      } else {
                        applyTemplate(tt.id, 'video', selectedVideoId);
                      }
                    }}
                    title={t.applyVideo}
                  >
                    {t.applyVideo}
                  </button>
                ) : null}
                {selectedCollectionId ? (
                  <button
                    className={`btn ${
                      isApplied(tt.id, 'collection', selectedCollectionId) ? 'btn-primary' : ''
                    }`}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      if (isApplied(tt.id, 'collection', selectedCollectionId)) {
                        removeApplication(tt.id, 'collection', selectedCollectionId);
                      } else {
                        applyTemplate(tt.id, 'collection', selectedCollectionId);
                      }
                    }}
                    title={t.applyCollection}
                  >
                    {t.applyCollection}
                  </button>
                ) : null}
                <button
                  className={`btn ${isApplied(tt.id, 'all', 'all') ? 'btn-primary' : ''}`}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => {
                    if (isApplied(tt.id, 'all', 'all')) {
                      removeApplication(tt.id, 'all', 'all');
                    } else {
                      applyTemplate(tt.id, 'all', 'all');
                    }
                  }}
                  title={t.applyAll}
                >
                  {t.applyAll}
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}