/**
 * useScenePersistence - tRPC-backed scene save/load hook
 *
 * Saves scene data to the server database (MySQL via Drizzle).
 * Falls back to localStorage if the server is unavailable.
 */
import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useEngineStore } from './store';
import type { SceneObject } from './store';

export interface SceneSaveData {
  name: string;
  objects: Record<string, SceneObject>;
  rootIds: string[];
  physicsGravity: [number, number, number];
  physicsTimestep: number | 'vary';
}

export function useScenePersistence() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);

  const { data: sceneList, refetch: refetchList } = trpc.scene.list.useQuery(undefined, {
    retry: false,
    staleTime: 10_000,
  });

  const createMutation = trpc.scene.create.useMutation();
  const updateMutation = trpc.scene.update.useMutation();

  const {
    sceneName,
    objects,
    rootIds,
    physicsGravity,
    physicsTimestep,
    log,
    setSceneName,
  } = useEngineStore();

  /** Save the current scene to the database (create or update) */
  const saveToDb = useCallback(async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const sceneData: SceneSaveData = {
        name: sceneName,
        objects,
        rootIds,
        physicsGravity,
        physicsTimestep,
      };

      let savedId: string | null = null;

      if (currentSceneId) {
        // Update existing scene
        const result = await updateMutation.mutateAsync({
          sceneId: currentSceneId,
          name: sceneName,
          sceneData,
          physicsSettings: { gravity: physicsGravity, timestep: physicsTimestep },
        });
        savedId = result?.sceneId ?? currentSceneId;
        log(`Scene "${sceneName}" updated in database (ID: ${savedId})`, 'info', 'DB');
      } else {
        // Create new scene
        const result = await createMutation.mutateAsync({
          name: sceneName,
          sceneData,
          physicsSettings: { gravity: physicsGravity, timestep: physicsTimestep },
          isPublic: false,
        });
        savedId = result?.sceneId ?? null;
        if (savedId) setCurrentSceneId(savedId);
        log(`Scene "${sceneName}" saved to database (ID: ${savedId})`, 'info', 'DB');
      }

      await refetchList();
      return savedId;
    } catch (err) {
      console.error('[ScenePersistence] Save failed:', err);
      log(`DB save failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error', 'DB');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [sceneName, objects, rootIds, physicsGravity, physicsTimestep, currentSceneId, createMutation, updateMutation, refetchList, log]);

  /** Load a scene from the database by sceneId */
  const loadFromDb = useCallback(async (sceneId: string) => {
    setIsLoading(true);
    try {
      // We use the trpc client directly to fetch a single scene
      const utils = trpc.useUtils();
      const scene = await utils.scene.get.fetch({ sceneId });
      if (!scene || !scene.sceneData) {
        log(`Scene ${sceneId} not found`, 'warn', 'DB');
        return false;
      }

      const data = scene.sceneData as SceneSaveData;
      const store = useEngineStore.getState();

      // Restore scene state
      store.setSceneName(data.name ?? scene.name);
      // Replace objects and rootIds
      useEngineStore.setState({
        objects: (data.objects as Record<string, SceneObject>) ?? {},
        rootIds: (data.rootIds as string[]) ?? [],
        selectedIds: [],
        hoveredId: null,
      });

      setCurrentSceneId(sceneId);
      log(`Scene "${scene.name}" loaded from database (ID: ${sceneId})`, 'info', 'DB');
      return true;
    } catch (err) {
      console.error('[ScenePersistence] Load failed:', err);
      log(`DB load failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error', 'DB');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [log]);

  return {
    isSaving,
    isLoading,
    currentSceneId,
    setCurrentSceneId,
    sceneList: sceneList ?? [],
    saveToDb,
    loadFromDb,
    refetchList,
  };
}
