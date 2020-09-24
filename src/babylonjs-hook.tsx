import { Engine, Scene, Nullable, EngineOptions, SceneOptions } from '@babylonjs/core'
import React, { useEffect, useRef } from 'react'

export type BabylonjsProps = {
    antialias?: boolean
    engineOptions?: EngineOptions
    adaptToDeviceRatio?: boolean
    sceneOptions?: SceneOptions
    onSceneReady: (scene: Scene) => void
    onRender?: (scene: Scene) => void
    id: string
};

export default (props: BabylonjsProps) => {
    const reactCanvas = useRef<Nullable<HTMLCanvasElement>>(null);
    const { antialias, engineOptions, adaptToDeviceRatio, sceneOptions, onRender, onSceneReady, ...rest } = props;

    useEffect(() => {
        if (reactCanvas.current) {
            const engine = new Engine(reactCanvas.current, antialias, engineOptions, adaptToDeviceRatio);
            const scene = new Scene(engine, sceneOptions);
            if (scene.isReady()) {
                props.onSceneReady(scene)
            } else {
                scene.onReadyObservable.addOnce((scene) => props.onSceneReady(scene));
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

            return () => {
                scene.getEngine().dispose();

                if (window) {
                    window.removeEventListener('resize', resize);
                }
            }
        }
    }, [reactCanvas])

    return (
        <canvas ref={reactCanvas} {...rest} />
    );
}