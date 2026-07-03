// Storage abstraction layer - wraps Tauri Store when running in Tauri,
// falls back to localStorage when running in browser for development.
import type { AppData } from './types';

const STORAGE_KEY = 'mkvideo_data_v1';

const DEFAULT_DATA: AppData = {
  collections: [],
  templates: [],
  applications: [],
};

let isTauri = false;
let storeRef: any = null;

if (typeof window !== 'undefined') {
  // Detect Tauri runtime
  // @ts-ignore
  isTauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

async function getStore() {
  if (!isTauri) return null;
  if (storeRef) return storeRef;
  try {
    const { Store } = await import('@tauri-apps/plugin-store');
    storeRef = await Store.load('mkvideo-data.json', { autoSave: true } as any);
    return storeRef;
  } catch (e) {
    console.warn('Failed to load Tauri store:', e);
    return null;
  }
}

export async function loadData(): Promise<AppData> {
  if (!isTauri) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return { ...DEFAULT_DATA };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_DATA, ...parsed };
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      return { ...DEFAULT_DATA };
    }
  }

  const store = await getStore();
  if (!store) return { ...DEFAULT_DATA };
  try {
    const collections = (await store.get('collections')) || [];
    const templates = (await store.get('templates')) || [];
    const applications = (await store.get('applications')) || [];
    return { collections, templates, applications };
  } catch (e) {
    console.warn('Failed to load from store:', e);
    return { ...DEFAULT_DATA };
  }
}

export async function saveData(data: AppData): Promise<void> {
  if (!isTauri) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    return;
  }

  const store = await getStore();
  if (!store) return;
  try {
    await store.set('collections', data.collections);
    await store.set('templates', data.templates);
    await store.set('applications', data.applications);
    await store.save();
  } catch (e) {
    console.warn('Failed to save to store:', e);
  }
}

export function isTauriEnv(): boolean {
  return isTauri;
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}