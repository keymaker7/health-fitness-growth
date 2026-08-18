export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PosePerson {
  landmarks: PoseLandmark[];
  box: { x: number; y: number; w: number; h: number };
  score: number;
}

export interface PoseFrame {
  width: number;
  height: number;
  persons: PosePerson[];
  ts: number;
}

export interface PoseAdapter {
  id: string;
  start(video: HTMLVideoElement, onFrame: (frame: PoseFrame) => void): Promise<void>;
  stop(): void;
}

function boxFrom(landmarks: PoseLandmark[]) {
  const xs = landmarks.map((l) => l.x);
  const ys = landmarks.map((l) => l.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

export function createSimulationPoseAdapter(count = 1): PoseAdapter {
  let timer: number | undefined;
  let t0 = 0;
  return {
    id: "simulation-pose",
    async start(_video, onFrame) {
      t0 = performance.now();
      const loop = () => {
        const t = (performance.now() - t0) / 1000;
        const persons: PosePerson[] = [];
        for (let i = 0; i < count; i++) {
          const cx = 0.2 + i * (0.6 / Math.max(1, count - 1 || 1));
          const jump = Math.abs(Math.sin(t * (2.2 + i * 0.15) * Math.PI));
          const hipY = 0.62 - jump * 0.12;
          const landmarks: PoseLandmark[] = Array.from({ length: 33 }, (_, k) => ({
            x: cx + (k % 2 === 0 ? -0.03 : 0.03),
            y: hipY + (k < 23 ? -0.18 : 0.08),
            z: 0,
            visibility: 1,
          }));
          landmarks[23] = { x: cx - 0.04, y: hipY, z: 0, visibility: 1 };
          landmarks[24] = { x: cx + 0.04, y: hipY, z: 0, visibility: 1 };
          landmarks[25] = { x: cx - 0.04, y: hipY + 0.12, z: 0, visibility: 1 };
          landmarks[26] = { x: cx + 0.04, y: hipY + 0.12, z: 0, visibility: 1 };
          persons.push({ landmarks, box: boxFrom(landmarks), score: 0.9 });
        }
        onFrame({ width: 640, height: 360, persons, ts: performance.now() });
        timer = window.requestAnimationFrame(loop);
      };
      timer = window.requestAnimationFrame(loop);
    },
    stop() {
      if (timer) cancelAnimationFrame(timer);
      timer = undefined;
    },
  };
}

declare global {
  interface Window {
    PoseLandmarker?: unknown;
  }
}

export function createMediaPipePoseAdapter(numPoses = 1): PoseAdapter {
  let landmarker: {
    detectForVideo: (video: HTMLVideoElement, ts: number) => { landmarks: PoseLandmark[][] };
    close?: () => void;
  } | null = null;
  let raf = 0;
  let stopped = false;

  return {
    id: "mediapipe-pose",
    async start(video, onFrame) {
      stopped = false;
      const mod = await (new Function("u", "return import(u)") as (u: string) => Promise<{
        FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
        PoseLandmarker: {
          createFromOptions: (f: unknown, o: unknown) => Promise<{
            detectForVideo: (video: HTMLVideoElement, ts: number) => { landmarks: PoseLandmark[][] };
            close?: () => void;
          }>;
        };
      }>)("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm");
      const { FilesetResolver, PoseLandmarker } = mod;
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm",
      );
      landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        },
        runningMode: "VIDEO",
        numPoses,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const loop = () => {
        if (stopped || !landmarker) return;
        if (video.readyState >= 2) {
          const result = landmarker.detectForVideo(video, performance.now());
          const persons: PosePerson[] = (result.landmarks ?? []).map((landmarks) => ({
            landmarks,
            box: boxFrom(landmarks),
            score: 1,
          }));
          onFrame({
            width: video.videoWidth || 640,
            height: video.videoHeight || 360,
            persons,
            ts: performance.now(),
          });
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      landmarker?.close?.();
      landmarker = null;
    },
  };
}

export async function startCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return () => {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
