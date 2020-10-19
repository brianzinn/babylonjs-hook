import { Nullable, Scene } from '@babylonjs/core';
import { createContext, useContext } from 'react';

export type SceneContextType = {
    scene: Nullable<Scene>
    sceneReady: boolean
};

export const SceneContext = createContext<SceneContextType>({
    scene: null,
    sceneReady: false
});

/**
 * Get the scene from the context.
 */
export const useScene = (): Nullable<Scene> => useContext(SceneContext).scene;