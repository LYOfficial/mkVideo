// Tauri command wrappers with browser fallbacks for development.
import { invoke } from '@tauri-apps/api/core';
import { isTauriEnv } from './storage';
import type { Collection, VideoFile } from './types';

export async function scanFolder(path: string): Promise<Collection> {
  if (!isTauriEnv()) {
    // Browser fallback: return a mock collection for dev testing
    return {
      id: `mock_${Date.now()}`,
      name: path.split(/[\\/]/).pop() || 'Sample',
      path,
      videos: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }
  return await invoke<Collection>('scan_folder', { path });
}

export async function rescanCollection(path: string): Promise<VideoFile[]> {
  if (!isTauriEnv()) return [];
  return await invoke<VideoFile[]>('rescan_collection', { path });
}

export async function checkPathExists(path: string): Promise<boolean> {
  if (!isTauriEnv()) return true;
  return await invoke<boolean>('check_path_exists', { path });
}

export async function getAppDataDir(): Promise<string> {
  if (!isTauriEnv()) return '';
  return await invoke<string>('get_app_data_dir');
}