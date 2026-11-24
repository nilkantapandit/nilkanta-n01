/** Shared constants for the N-01 prototype scene. */
export const MODEL_URL = "/models/nilkanta-n01.glb";

/** The GLB is authored in real metres (178 mm wide). A uniform scale keeps proportions
 *  intact while giving the scene comfortable working units (device ≈ 1.8 units wide). */
export const MODEL_SCALE = 10;

/** Floor height below the centred device. */
export const FLOOR_Y = -0.78;

/** Hero camera: three-quarter view from front-left and slightly above (glTF front = +Z). */
export const HERO_DIRECTION: [number, number, number] = [-0.52, 0.26, 0.81];
export const HERO_TARGET: [number, number, number] = [0, 0.02, 0];
export const CAMERA_FOV = 32;
/** Wider lens on portrait screens so the device fits without the camera drifting far away. */
export const CAMERA_FOV_PORTRAIT = 44;

/** Half-width (scene units) that must stay in frame at the hero view, incl. a margin. */
export const FRAME_HALF_WIDTH = 1.25;
export const MIN_HERO_DISTANCE = 3.6;
