'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AppData,
  Collection,
  Mask,
  MaskApplication,
  MaskTemplate,
  VideoFile,
} from './types';
import { loadData, saveData, generateId } from './storage';

interface AppContextValue {
  data: AppData;
  loaded: boolean;
  // Collection ops
  addCollection: (collection: Collection) => void;
  removeCollection: (id: string) => void;
  renameCollection: (id: string, newName: string) => void;
  updateCollectionVideos: (id: string, videos: VideoFile[]) => void;
  // Templates
  addTemplate: (name: string, masks: Mask[]) => MaskTemplate;
  removeTemplate: (id: string) => void;
  updateTemplate: (id: string, updates: Partial<MaskTemplate>) => void;
  // Applications
  applyTemplate: (templateId: string, scope: MaskApplication['scope'], targetId: string) => void;
  removeApplication: (templateId: string, scope: MaskApplication['scope'], targetId: string) => void;
  // Helpers
  getTemplatesForVideo: (videoId: string, collectionId: string) => MaskTemplate[];
  getAllMasksForVideo: (videoId: string, collectionId: string) => Mask[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>({
    collections: [],
    templates: [],
    applications: [],
  });
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  // Load on mount
  useEffect(() => {
    let mounted = true;
    loadData().then((d) => {
      if (mounted) {
        setData(d);
        setLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Debounced save on data change
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveData(data);
    }, 300);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, loaded]);

  const addCollection = useCallback((collection: Collection) => {
    setData((prev) => ({
      ...prev,
      collections: [...prev.collections, collection],
    }));
  }, []);

  const removeCollection = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      collections: prev.collections.filter((c) => c.id !== id),
      // also remove applications referencing this collection's videos or the collection itself
      applications: prev.applications.filter((a) => {
        if (a.scope === 'collection' && a.targetId === id) return false;
        // Remove video-scoped apps whose targetId is a video in this collection
        if (a.scope === 'video') {
          const col = prev.collections.find((c) => c.id === id);
          if (col && col.videos.some((v) => v.id === a.targetId)) return false;
        }
        return true;
      }),
    }));
  }, []);

  const renameCollection = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      collections: prev.collections.map((c) =>
        c.id === id ? { ...c, name: trimmed, updated_at: Date.now() } : c,
      ),
    }));
  }, []);

  const updateCollectionVideos = useCallback((id: string, videos: VideoFile[]) => {
    setData((prev) => ({
      ...prev,
      collections: prev.collections.map((c) =>
        c.id === id ? { ...c, videos, updated_at: Date.now() } : c,
      ),
    }));
  }, []);

  const addTemplate = useCallback((name: string, masks: Mask[]): MaskTemplate => {
    const tpl: MaskTemplate = {
      id: generateId('tpl'),
      name: name.trim() || 'Untitled Template',
      masks,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setData((prev) => ({ ...prev, templates: [...prev.templates, tpl] }));
    return tpl;
  }, []);

  const removeTemplate = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== id),
      applications: prev.applications.filter((a) => a.templateId !== id),
    }));
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<MaskTemplate>) => {
    setData((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === id ? { ...t, ...updates, id: t.id, updated_at: Date.now() } : t,
      ),
    }));
  }, []);

  const applyTemplate = useCallback(
    (templateId: string, scope: MaskApplication['scope'], targetId: string) => {
      setData((prev) => {
        const exists = prev.applications.some(
          (a) => a.templateId === templateId && a.scope === scope && a.targetId === targetId,
        );
        if (exists) return prev;
        return {
          ...prev,
          applications: [
            ...prev.applications,
            { templateId, scope, targetId },
          ],
        };
      });
    },
    [],
  );

  const removeApplication = useCallback(
    (templateId: string, scope: MaskApplication['scope'], targetId: string) => {
      setData((prev) => ({
        ...prev,
        applications: prev.applications.filter(
          (a) => !(a.templateId === templateId && a.scope === scope && a.targetId === targetId),
        ),
      }));
    },
    [],
  );

  // Resolve the list of templates that should apply to a given video.
  // - 'video' scope: targetId === video.id
  // - 'collection' scope: targetId === collection.id
  // - 'all' scope: targetId === 'all'
  const getTemplatesForVideo = useCallback(
    (videoId: string, collectionId: string): MaskTemplate[] => {
      const ids = new Set<string>();
      for (const a of data.applications) {
        if (a.scope === 'video' && a.targetId === videoId) ids.add(a.templateId);
        if (a.scope === 'collection' && a.targetId === collectionId) ids.add(a.templateId);
        if (a.scope === 'all' && a.targetId === 'all') ids.add(a.templateId);
      }
      return data.templates.filter((t) => ids.has(t.id));
    },
    [data.applications, data.templates],
  );

  const getAllMasksForVideo = useCallback(
    (videoId: string, collectionId: string): Mask[] => {
      const templates = getTemplatesForVideo(videoId, collectionId);
      const masks: Mask[] = [];
      for (const t of templates) {
        for (const m of t.masks) {
          masks.push(m);
        }
      }
      return masks;
    },
    [getTemplatesForVideo],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      data,
      loaded,
      addCollection,
      removeCollection,
      renameCollection,
      updateCollectionVideos,
      addTemplate,
      removeTemplate,
      updateTemplate,
      applyTemplate,
      removeApplication,
      getTemplatesForVideo,
      getAllMasksForVideo,
    }),
    [
      data,
      loaded,
      addCollection,
      removeCollection,
      renameCollection,
      updateCollectionVideos,
      addTemplate,
      removeTemplate,
      updateTemplate,
      applyTemplate,
      removeApplication,
      getTemplatesForVideo,
      getAllMasksForVideo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}