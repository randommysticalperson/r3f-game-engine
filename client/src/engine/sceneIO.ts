/**
 * R3F Game Engine — Scene Serialization
 * Save/load scenes to/from localStorage
 */

import type { SceneObject } from './store';

export interface SerializedScene {
  version: number;
  name: string;
  objects: Record<string, SceneObject>;
  rootIds: string[];
  savedAt: number;
}

const STORAGE_KEY = 'r3f-engine-scene';
const SCENES_LIST_KEY = 'r3f-engine-scenes';

export function saveScene(name: string, objects: Record<string, SceneObject>, rootIds: string[]): void {
  const scene: SerializedScene = {
    version: 1,
    name,
    objects,
    rootIds,
    savedAt: Date.now(),
  };
  // Save current scene
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scene));
  // Update scenes list
  const list = getSavedScenesList();
  const existing = list.findIndex(s => s.name === name);
  const entry = { name, savedAt: scene.savedAt };
  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.push(entry);
  }
  localStorage.setItem(SCENES_LIST_KEY, JSON.stringify(list));
  // Also save under the scene name
  localStorage.setItem(`${STORAGE_KEY}-${name}`, JSON.stringify(scene));
}

export function loadScene(name?: string): SerializedScene | null {
  try {
    const key = name ? `${STORAGE_KEY}-${name}` : STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedScene;
  } catch {
    return null;
  }
}

export function getSavedScenesList(): { name: string; savedAt: number }[] {
  try {
    const raw = localStorage.getItem(SCENES_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function deleteScene(name: string): void {
  localStorage.removeItem(`${STORAGE_KEY}-${name}`);
  const list = getSavedScenesList().filter(s => s.name !== name);
  localStorage.setItem(SCENES_LIST_KEY, JSON.stringify(list));
}

export function exportSceneJSON(name: string, objects: Record<string, SceneObject>, rootIds: string[]): string {
  const scene: SerializedScene = { version: 1, name, objects, rootIds, savedAt: Date.now() };
  return JSON.stringify(scene, null, 2);
}

export function downloadJSON(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
