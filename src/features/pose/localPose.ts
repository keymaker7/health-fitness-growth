/**
 * 앱 안에 넣어둔 MediaPipe 로 자세를 잡는다.
 *
 * 모델과 wasm 을 public/ 에서 읽는다. CDN 을 쓰지 않는다 —
 * 학교 방화벽이 막으면 그날 수업이 멈추기 때문이다.
 */

const MODEL = "/models/pose_landmarker_lite.task";
const WASM = "/vendor/tasks-vision/wasm";
const BUNDLE = "/vendor/tasks-vision/vision_bundle.mjs";

export type RawLandmark = { x: number; y: number; z?: number; visibility?: number };

export type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { landmarks?: RawLandmark[][] };
  close?: () => void;
};

type VisionModule = {
  FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
  PoseLandmarker: { createFromOptions: (f: unknown, o: unknown) => Promise<Landmarker> };
};

/** 번들러가 정적 분석으로 건드리지 못하게 감싼다. public/ 의 파일을 그대로 읽어야 한다. */
const dynamicImport = new Function("u", "return import(u)") as (u: string) => Promise<VisionModule>;

export async function createLandmarker(numPoses: number): Promise<Landmarker> {
  const mod = await dynamicImport(BUNDLE);
  const fileset = await mod.FilesetResolver.forVisionTasks(WASM);
  const opts = (delegate: string) => ({
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: "VIDEO",
    numPoses,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  try {
    // GPU 가 되는 기기는 GPU, 안 되면 CPU 로 자동으로 내려간다.
    return await mod.PoseLandmarker.createFromOptions(fileset, opts("GPU"));
  } catch {
    return await mod.PoseLandmarker.createFromOptions(fileset, opts("CPU"));
  }
}

export async function openCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

/** 화면 크기(px)로 바꾼 좌표. 판정 코드들이 픽셀 좌표를 기대한다. */
export function toPixels(marks: RawLandmark[], width: number, height: number) {
  return marks.map((p) => ({
    x: p.x * width,
    y: p.y * height,
    v: p.visibility === undefined ? 1 : p.visibility,
  }));
}
