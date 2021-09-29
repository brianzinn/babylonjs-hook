import React, { useEffect, useContext, useRef, useState } from 'react';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { EngineOptions } from '@babylonjs/core/Engines/thinEngine.js';
import { EventState, Observer } from '@babylonjs/core/Misc/observable.js';
import { Scene, SceneOptions } from '@babylonjs/core/scene.js';
import { Nullable } from '@babylonjs/core/types.js';
import { SceneContext, SceneContextType } from './scene';
import { EngineCanvasContext, EngineCanvasContextType } from './engine';

export * from './engine';
export * from './scene';

export type BabylonjsProps = {
  antialias?: boolean
  engineOptions?: EngineOptions
  adaptToDeviceRatio?: boolean
  renderChildrenWhenReady?: boolean
  sceneOptions?: SceneOptions
  onSceneReady: (scene: Scene) => void
  /**
   * Automatically trigger engine resize when the canvas resizes (default: true)
   */
  observeCanvasResize?: boolean
  onRender?: (scene: Scene) => void
  children?: React.ReactNode
};

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
export const useAfterRender = (callback: OnFrameRenderFn, mask?: number, insertFirst?: boolean, callOnce?: boolean): void => {
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

/**
 * Handles creating a camera and attaching/disposing.
 * TODO: add new 4.2 parameters: useCtrlForPanning & panningMouseButton
 * @param createCameraFn function that creates and returns a camera
 * @param autoAttach Attach the input controls (default true)
 * @param noPreventDefault Events caught by controls should call prevent default
 * @param useCtrlForPanning (ArcRotateCamera only)
 * @param panningMoustButton (ArcRotateCamera only)
 */
export const useCamera = <T extends Camera>(createCameraFn: (scene: Scene) => T, autoAttach: boolean = true, noPreventDefault: boolean = true/*, useCtrlForPanning: boolean = false, panningMouseButton: number*/): Nullable<T> => {
  const { scene } = useContext(SceneContext);
  const cameraRef = useRef<Nullable<T>>(null);

  useEffect(() => {
    if (scene === null) {
      console.warn('cannot create camera (scene not ready)');
      return;
    }

    const camera: T = createCameraFn(scene);
    if (autoAttach === true) {
      const canvas: HTMLCanvasElement = scene.getEngine().getRenderingCanvas()!;

      // This attaches the camera to the canvas - adding extra parameters breaks backwards compatibility
      // https://github.com/BabylonJS/Babylon.js/pull/9192 (keep canvas to work with < 4.2 beta-13)
      // TODO: look at parameters of other camera types for attaching - likely need an 'options' parameter instead.
      // if (camera instanceof ArcRotateCamera) {
      //     camera.attachControl(noPreventDefault, useCtrlForPanning, panningMouseButton)
      camera.attachControl(canvas, noPreventDefault);
    }
    cameraRef.current = camera;

    return () => {
      if (autoAttach === true) {
        // canvas is only needed for < 4.1
        const canvas: HTMLCanvasElement = scene.getEngine().getRenderingCanvas()!;
        camera.detachControl(canvas);
      }
      camera.dispose();
    }
  }, [scene]);

  return cameraRef.current;
}

export default (props: BabylonjsProps & React.CanvasHTMLAttributes<HTMLCanvasElement>) => {
  const reactCanvas = useRef<Nullable<HTMLCanvasElement>>(null);
  const { antialias, engineOptions, adaptToDeviceRatio, sceneOptions, onRender, onSceneReady, renderChildrenWhenReady, children, ...rest } = props;

  const [sceneContext, setSceneContext] = useState<SceneContextType>({
    scene: null,
    sceneReady: false
  });

  const [engineContext, setEngineContext] = useState<EngineCanvasContextType>({
    engine: null,
    canvas: null
  });

  useEffect(() => {
    if (reactCanvas.current) {
      const engine = new Engine(reactCanvas.current, antialias, engineOptions, adaptToDeviceRatio);
      setEngineContext(() => ({
        engine,
        canvas: reactCanvas.current
      }));

      let resizeObserver: Nullable<ResizeObserver> = null;

      const scene = new Scene(engine, sceneOptions);

      if (props.observeCanvasResize !== false && window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          engine.resize();
          if (scene.activeCamera /* needed for rendering */) {
            // render to prevent flickering on resize
            if (typeof onRender === 'function') {
              onRender(scene);
            }
            scene.render();
          }
        });
        resizeObserver.observe(reactCanvas.current);
      }

      const sceneIsReady = scene.isReady();
      if (sceneIsReady) {
        props.onSceneReady(scene);
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
        if (scene.activeCamera) {
          if (typeof onRender === 'function') {
            onRender(scene);
          }
          scene.render();
        } else {
          // @babylonjs/core throws an error if you attempt to render with no active camera.
          // if we attach as a child React component we have frames with no active camera.
          console.warn('no active camera..');
        }
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
        // cleanup
        if (resizeObserver !== null) {
          resizeObserver.disconnect();
        }

        if (window) {
          window.removeEventListener('resize', resize);
        }

        scene.getEngine().dispose();
      }
    }
  }, [reactCanvas]);

  return (
    <>
      <canvas ref={reactCanvas} {...rest} />
      <EngineCanvasContext.Provider value={engineContext}>
        <SceneContext.Provider value={sceneContext}>
          {(renderChildrenWhenReady !== true || (renderChildrenWhenReady === true && sceneContext.sceneReady)) &&
            children
          }
        </SceneContext.Provider>
      </EngineCanvasContext.Provider>
    </>
  );
}
