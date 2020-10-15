import React, { useEffect, useContext, useRef, useState, createContext } from 'react'
import { Engine, Scene, Nullable, EngineOptions, SceneOptions, EventState, Observer } from '@babylonjs/core'

export type BabylonjsProps = {
    antialias?: boolean
    engineOptions?: EngineOptions
    adaptToDeviceRatio?: boolean
    renderChildrenWhenReady?: boolean
    sceneOptions?: SceneOptions
    onSceneReady: (scene: Scene) => void
    onRender?: (scene: Scene) => void
    id: string
    children?: React.ReactNode
};

/**
 * Get the engine from the context.
 */
export const useEngine = (): Nullable<Engine> => useContext(SceneContext).engine
/**
 * Get the scene from the context.
 */
export const useScene = (): Nullable<Scene> => useContext(SceneContext).scene
/**
 * Get the canvas DOM element from the context.
 */
export const useCanvas = (): Nullable<HTMLCanvasElement | WebGLRenderingContext> => useContext(SceneContext).canvas

export type OnFrameRenderFn = (eventData: Scene, eventState: EventState) => void

/**
 * Register a callback for before the scene renders.
 * 
 * @param callback called using onBeforeRender functionality of scene
 * @param mask the mask used to filter observers
 * @param insertFirst if true will be inserted at first position, if false (default) will be last position.
 * @param callOnce only call the callback once
 */
export const useBeforeRender = (callback: OnFrameRenderFn, mask?: number, insertFirst?: boolean, callOnce?: boolean): void => {
    const { scene } = useContext(SceneContext);

    useEffect(() => {
        if (scene === null) {
            return;
        }

        const unregisterOnFirstCall: boolean = callOnce === true;
        const sceneObserver: Nullable<Observer<Scene>> = scene.onBeforeRenderObservable.add(callback, mask, insertFirst, undefined, unregisterOnFirstCall);

        if (unregisterOnFirstCall !== true) {
            return () => {
                scene.onBeforeRenderObservable.remove(sceneObserver);
            }
        }
    })
}

/**
 * Register a callback for after the scene renders.
 * 
 * @param callback called using onBeforeRender functionality of scene
 * @param mask the mask used to filter observers
 * @param insertFirst if true will be inserted at first position, if false (default) will be last position.
 * @param callOnce only call the callback once
 */
export function useAfterRender(callback: OnFrameRenderFn, mask?: number, insertFirst?: boolean, callOnce?: boolean): void {
    const { scene } = useContext(SceneContext);

    useEffect(() => {
        if (scene === null) {
            return;
        }

        const unregisterOnFirstCall: boolean = callOnce === true;
        const sceneObserver: Nullable<Observer<Scene>> = scene.onAfterRenderObservable.add(callback, mask, insertFirst, undefined, unregisterOnFirstCall);

        if (unregisterOnFirstCall !== true) {
            return () => {
                scene.onAfterRenderObservable.remove(sceneObserver);
            }
        }
    })
}

export type SceneContextType = {
    engine: Nullable<Engine>
    canvas: Nullable<HTMLCanvasElement | WebGLRenderingContext>
    scene: Nullable<Scene>
    sceneReady: boolean
}

const DEFAULT_CONTEXT: SceneContextType = {
    engine: null,
    canvas: null,
    scene: null,
    sceneReady: false
}

// TODO: build a fallback mechanism when typeof React.createContext !== 'function'
export const SceneContext = createContext<SceneContextType>(DEFAULT_CONTEXT);

export default (props: BabylonjsProps) => {
    const reactCanvas = useRef<Nullable<HTMLCanvasElement>>(null);
    const { antialias, engineOptions, adaptToDeviceRatio, sceneOptions, onRender, onSceneReady, renderChildrenWhenReady, children, ...rest } = props;

    const [sceneContext, setSceneContext] = useState<SceneContextType>(DEFAULT_CONTEXT)

    useEffect(() => {
        if (reactCanvas.current) {
            const engine = new Engine(reactCanvas.current, antialias, engineOptions, adaptToDeviceRatio);
            const scene = new Scene(engine, sceneOptions);
            const sceneIsReady = scene.isReady();
            if (sceneIsReady) {
                props.onSceneReady(scene)
            } else {
                scene.onReadyObservable.addOnce((scene) => {
                    props.onSceneReady(scene);
                    setSceneContext(() => ({
                        canvas: reactCanvas.current,
                        scene,
                        engine,
                        sceneReady: true,
                    }));
                });
            }

            engine.runRenderLoop(() => {
                if (typeof onRender === 'function') {
                    onRender(scene);
                }
                scene.render();
            })

            const resize = () => {
                scene.getEngine().resize();
            }

            if (window) {
                window.addEventListener('resize', resize);
            }

            setSceneContext(() => ({
                canvas: reactCanvas.current,
                scene,
                engine,
                sceneReady: sceneIsReady,
            }));

            return () => {
                scene.getEngine().dispose();

                if (window) {
                    window.removeEventListener('resize', resize);
                }
            }
        }
    }, [reactCanvas])

    return (
        <>
            <canvas ref={reactCanvas} {...rest} />
            <SceneContext.Provider value={sceneContext}>
                {(renderChildrenWhenReady !== true || (renderChildrenWhenReady === true && sceneContext.sceneReady)) &&
                    children
                }
            </SceneContext.Provider>
        </>
    );
}