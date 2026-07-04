'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { useT } from '@/lib/i18n';
import { scanFolder } from '@/lib/tauri';
import CollectionList from './CollectionList';
import TemplateList from './TemplateList';
import AddCollectionDialog from './AddCollectionDialog';
import RenameCollectionDialog from './RenameCollectionDialog';

type Tab = 'collections' | 'templates';

export default function Sidebar() {
  const { data, addCollection } = useApp();
  const t = useT();
  const [tab, setTab] = useState<Tab>('collections');
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAdd = () => setAdding(true);

  const handleSelectFolder = async (path: string) => {
    setScanning(true);
    setError(null);
    try {
      const collection = await scanFolder(path);
      addCollection(collection);
      setAdding(false);
    } catch (e: any) {
      setError(typeof e === 'string' ? e : (e?.message || 'Failed to scan folder'));
    } finally {
      setScanning(false);
    }
  };

  const collectionsEmpty = data.collections.length === 0;

  return (
    <aside
      className="flex flex-col"
      style={{
        width: 260,
        minWidth: 260,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Tab switcher */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setTab('collections')}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 0,
            background: tab === 'collections' ? 'var(--bg-tertiary)' : 'transparent',
            borderBottom: tab === 'collections' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {t.collections}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setTab('templates')}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 0,
            background: tab === 'templates' ? 'var(--bg-tertiary)' : 'transparent',
            borderBottom: tab === 'templates' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {t.templates}
        </button>
      </div>

      {tab === 'collections' && (
        <>
          <div
            className="flex items-center justify-between"
            style={{ padding: '10px 12px' }}
          >
            <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>
              {t.collectionCount(data.collections.length)}
            </span>
            <button
              className="btn btn-primary"
              onClick={startAdd}
              disabled={scanning}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              + {t.addCollection}
            </button>
          </div>
          <div className="flex-1" style={{ overflowY: 'auto' }}>
            {collectionsEmpty ? (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 12,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                <div style={{ marginBottom: 4, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {t.noCollections}
                </div>
                <div>{t.noCollectionsHint}</div>
              </div>
            ) : (
              <CollectionList onRename={(id) => setRenamingId(id)} />
            )}
          </div>
        </>
      )}

      {tab === 'templates' && (
        <>
          <div
            className="flex items-center justify-between"
            style={{ padding: '10px 12px' }}
          >
            <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>
              {t.maskTemplates}
            </span>
          </div>
          <div className="flex-1" style={{ overflowY: 'auto' }}>
            <TemplateList />
          </div>
        </>
      )}

      {adding && (
        <AddCollectionDialog
          onClose={() => setAdding(false)}
          onSelect={handleSelectFolder}
          scanning={scanning}
          error={error}
        />
      )}
      {renamingId && (
        <RenameCollectionDialog
          collectionId={renamingId}
          onClose={() => setRenamingId(null)}
        />
      )}
    </aside>
  );
}