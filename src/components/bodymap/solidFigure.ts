// The solid, clay-shaded suit figure drawn with three.js underneath the 2D overlay.
// Model: NASA ACES suit (NASA 3D Resources, free and without copyright), in public/models/.
//
// three.js is imported inside startSolidFigure, so it is only downloaded in the browser and only
// when the body map is on screen. If WebGL or the model fails, the overlay keeps its wireframe.

import type { Material, Object3D, Texture } from "three";
import { CX, CY, F, H, S, W, type Mark } from "./geometry";

const MODEL_URL = "/models/argus-suit.glb";
// Height the model is scaled to, in model cm, so it matches the wireframe and the ruler.
const MODEL_HEIGHT_CM = 176;

export type SolidFigure = {
  // Draw the figure at this yaw. Returns false while the model is not ready (draw the wireframe instead).
  render: (ca: number, sa: number) => boolean;
  dispose: () => void;
};

// Free a material and any textures it holds (glTF materials carry their own textures).
function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) {
    if (value && typeof value === "object" && (value as Texture).isTexture) (value as Texture).dispose();
  }
  material.dispose();
}

function disposeTree(root: Object3D) {
  root.traverse((o) => {
    const mesh = o as Object3D & { geometry?: { dispose: () => void }; material?: Material | Material[] };
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
    else if (mesh.material) disposeMaterial(mesh.material);
  });
}

export function startSolidFigure(
  canvas: HTMLCanvasElement,
  marks: Mark[],
  onReady: () => void,
): SolidFigure {
  let isDisposed = false;
  let isReady = false;
  // Filled in once three.js has loaded.
  let renderAt: ((ca: number, sa: number) => void) | null = null;
  let cleanUp: (() => void) | null = null;

  async function load() {
    const T = await import("three");
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
    if (isDisposed) return;

    const scene = new T.Scene();
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    // Disposing alone does not free the GL context; dropping it lets the dashboard be re-entered
    // many times without hitting the browser's limit on live WebGL contexts.
    cleanUp = () => {
      disposeTree(scene);
      renderer.dispose();
      renderer.forceContextLoss();
    };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    const near = 10;
    const far = 2000;
    const cam = new T.PerspectiveCamera(30, W / H, near, far);
    cam.position.set(0, 88, F / S);
    cam.updateMatrixWorld();
    // Same pinhole as the overlay's project(): focal F px, principal point (CX, CY).
    // Set by hand because a normal PerspectiveCamera cannot move its centre off the middle.
    cam.projectionMatrix.set(
      (2 * F) / W, 0, (W - 2 * CX) / W, 0,
      0, (2 * F) / H, -(H - 2 * CY) / H, 0,
      0, 0, -(far + near) / (far - near), (-2 * far * near) / (far - near),
      0, 0, -1, 0,
    );
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

    scene.add(new T.HemisphereLight(0xffffff, 0x3a3a3a, 1.1));
    const key = new T.DirectionalLight(0xffffff, 2.6);
    key.position.set(-140, 280, 240);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -120;
    key.shadow.camera.right = 120;
    key.shadow.camera.top = 220;
    key.shadow.camera.bottom = -40;
    key.shadow.camera.near = 50;
    key.shadow.camera.far = 800;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0006;
    scene.add(key);
    const fill = new T.DirectionalLight(0xffffff, 0.5);
    fill.position.set(200, 120, 80);
    scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 1.1);
    rim.position.set(60, 220, -260);
    scene.add(rim);

    // An invisible floor that only shows the shadow, so the figure stands on the turntable.
    const ground = new T.Mesh(new T.PlaneGeometry(600, 600), new T.ShadowMaterial({ opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const pivot = new T.Group();
    scene.add(pivot);

    // Only re-render when the angle changes; the GL canvas keeps its last picture otherwise.
    let lastAngleKey: string | null = null;
    renderAt = (ca, sa) => {
      const angleKey = ca.toFixed(4) + "," + sa.toFixed(4);
      if (angleKey === lastAngleKey) return;
      lastAngleKey = angleKey;
      pivot.rotation.y = Math.atan2(sa, ca);
      renderer.render(scene, cam);
    };

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder); // the model uses EXT_meshopt_compression
    const gltf = await loader.loadAsync(MODEL_URL);
    if (isDisposed) {
      disposeTree(gltf.scene);
      return;
    }

    const model = gltf.scene;
    // Face the camera, scale to MODEL_HEIGHT_CM, and stand the feet on y = 0 at the centre.
    model.rotation.y = Math.PI;
    model.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    model.scale.setScalar(MODEL_HEIGHT_CM / size.y);
    box.setFromObject(model);
    const centre = box.getCenter(new T.Vector3());
    model.position.set(-centre.x, -box.min.y, -centre.z);

    // Clay look: replace each material with a grey of similar brightness; near-black parts
    // (visor, gloves) become glossy dark grey.
    model.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const old = o.material as Material | Material[];
      const first = Array.isArray(old) ? old[0] : old;
      const oc =
        first && "color" in first && first.color instanceof T.Color ? first.color : new T.Color(0.5, 0.5, 0.5);
      const lum = 0.2126 * oc.r + 0.7152 * oc.g + 0.0722 * oc.b;
      const isDark = lum < 0.03;
      const v = isDark ? 0.06 : 0.3 + 0.38 * Math.min(1, lum * 1.15);
      const col = new T.Color();
      col.setRGB(v, v, v, T.SRGBColorSpace);
      o.material = new T.MeshStandardMaterial({
        color: col,
        roughness: isDark ? 0.18 : 0.82,
        metalness: isDark ? 0.5 : 0.0,
      });
      if (Array.isArray(old)) old.forEach(disposeMaterial);
      else disposeMaterial(old);
      o.castShadow = true;
      o.receiveShadow = true;
    });
    pivot.add(model);
    pivot.updateMatrixWorld(true);

    // Re-seat the measurement sites on the suit's surface: shoot a ray at the body from in front
    // (or from the side for the arm) and put the site where it hits.
    const ray = new T.Raycaster();
    const aim: Record<string, [[number, number, number], [number, number, number]]> = {
      T: [[0, 163, 300], [0, 0, -1]],
      HR: [[7, 128, 300], [0, 0, -1]],
      BP: [[300, 124, 0], [-1, 0, 0]],
      // Display-only sites: the head from each side. GLU (the hand) is found below.
      MOOD: [[300, 166, 0], [-1, 0, 0]],
      SLP: [[-300, 166, 0], [1, 0, 0]],
    };
    for (const mark of marks) {
      if (mark.ref === "GLU") continue;
      const [origin, dir] = aim[mark.ref];
      ray.set(new T.Vector3(...origin), new T.Vector3(...dir));
      const hit = ray.intersectObject(pivot, true)[0];
      if (hit) mark.p = [hit.point.x, hit.point.y, hit.point.z];
    }
    // GLU goes on the hand. The hand can be in front of or behind the body's middle, so shoot
    // rays from the left at hand height, front to back, and keep the hit furthest out to the left.
    const glu = marks.find((mark) => mark.ref === "GLU");
    if (glu) {
      let leftmost = Infinity;
      for (let z = -28; z <= 28; z += 4) {
        ray.set(new T.Vector3(-300, 94, z), new T.Vector3(1, 0, 0));
        const hit = ray.intersectObject(pivot, true)[0];
        if (hit && hit.point.x < leftmost) {
          leftmost = hit.point.x;
          glu.p = [hit.point.x, hit.point.y, hit.point.z];
        }
      }
    }

    isReady = true;
    lastAngleKey = null;
    onReady();
  }

  load().catch((err: unknown) => {
    // Quietly fall back to the wireframe, as the mockup does.
    console.warn("ARGUS body map: 3D model unavailable, using wireframe", err);
  });

  return {
    render(ca, sa) {
      if (!isReady || !renderAt) return false;
      renderAt(ca, sa);
      return true;
    },
    dispose() {
      isDisposed = true;
      cleanUp?.();
      cleanUp = null;
      renderAt = null;
    },
  };
}
