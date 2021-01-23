import { createContext, useContext } from 'react';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

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
