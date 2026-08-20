import { createLandmarker, openCamera, type Landmarker } from "@/features/pose/localPose";

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

/** 기기 없이 화면만으로 보여줄 때 쓰는 가짜 사람. 점프와 스쿼트는 **몸이 다르게 움직인다.** */
export type SimMotion = "jump" | "squat";

/** 한 사람 몫의 33개 landmark 를 만든다 (BlazePose 순서) */
function simBody(cx: number, shoulderY: number, hipY: number, kneeY: number, kneeX: number, ankleY: number) {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: cx, y: shoulderY, z: 0, visibility: 1,
  }));
  const put = (i: number, x: number, y: number) => { landmarks[i] = { x, y, z: 0, visibility: 1 }; };
  put(0, cx, shoulderY - 0.08);                                   // 코
  put(11, cx - 0.05, shoulderY); put(12, cx + 0.05, shoulderY);    // 어깨
  put(15, cx - 0.09, hipY - 0.02); put(16, cx + 0.09, hipY - 0.02);// 손목 (내린 상태)
  put(23, cx - 0.04, hipY); put(24, cx + 0.04, hipY);              // 엉덩이
  put(25, kneeX - 0.04, kneeY); put(26, kneeX + 0.04, kneeY);      // 무릎
  put(27, cx - 0.04, ankleY); put(28, cx + 0.04, ankleY);          // 발목
  return landmarks;
}

export function createSimulationPoseAdapter(count = 1, motion: SimMotion = "jump"): PoseAdapter {
  let timer: number | undefined;
  let t0 = 0;
  return {
    id: `simulation-pose-${motion}`,
    async start(_video, onFrame) {
      t0 = performance.now();
      const loop = () => {
        const t = (performance.now() - t0) / 1000;
        const persons: PosePerson[] = [];
        for (let i = 0; i < count; i++) {
          const cx = 0.2 + i * (0.6 / Math.max(1, count - 1 || 1));
          let landmarks: PoseLandmark[];
          if (motion === "squat") {
            // 앉기: 어깨·엉덩이가 함께 내려가고 **무릎이 앞으로 나가며 굽는다.**
            // 판정이 «엉덩이 하강 + 무릎 각도» 둘을 보므로 둘 다 움직여야 진짜처럼 센다.
            const lead = Math.max(0, t - 1);                       // 처음 1초는 서 있는다 (기준 잡을 시간)
            const phase = (1 - Math.cos((lead / 2) * 2 * Math.PI)) / 2;   // 한 개에 2초
            const drop = phase * 0.13;
            landmarks = simBody(cx, 0.30 + drop, 0.55 + drop, 0.75, cx + phase * 0.06, 0.95);
          } else {
            // 줄넘기: 몸 전체가 위로 떴다 내려온다
            const jump = Math.abs(Math.sin(t * (2.2 + i * 0.15) * Math.PI));
            const lift = jump * 0.12;
            landmarks = simBody(cx, 0.44 - lift, 0.62 - lift, 0.74 - lift, cx, 0.90 - lift);
          }
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

/**
 * 게임도 **측정 도구와 같은 자세 인식**을 쓴다.
 *
 * 예전에는 여기서 jsDelivr 와 구글 서버의 lite 모델을 직접 받았다. 그러면 세 가지가 걸린다 —
 *   ① 학교 방화벽·와이파이가 막으면 게임만 죽는다 (측정 도구는 앱 안 파일이라 멀쩡하다)
 *   ② 측정 쪽을 lite → full 로 되돌려도 게임은 계속 lite 로 남는다
 *   ③ GPU 가 안 되는 기기에서 CPU 로 내려가는 안전장치가 없다
 * 그래서 localPose 하나만 쓴다. 고칠 곳도 한 곳이 된다.
 */
export function createMediaPipePoseAdapter(numPoses = 1): PoseAdapter {
  let landmarker: Landmarker | null = null;
  let raf = 0;
  let stopped = false;

  return {
    id: "mediapipe-pose",
    async start(video, onFrame) {
      stopped = false;
      landmarker = await createLandmarker(numPoses);

      const loop = () => {
        if (stopped || !landmarker) return;
        if (video.readyState >= 2) {
          const result = landmarker.detectForVideo(video, performance.now());
          const persons: PosePerson[] = (result.landmarks ?? []).map((marks) => {
            const landmarks: PoseLandmark[] = marks.map((p) => ({
              x: p.x, y: p.y, z: p.z ?? 0, visibility: p.visibility,
            }));
            return { landmarks, box: boxFrom(landmarks), score: 1 };
          });
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

/** 카메라 열기도 측정 도구와 같은 것을 쓴다 — 해상도 조건이 갈리면 정확도도 갈린다 */
export async function startCamera(video: HTMLVideoElement) {
  const stream = await openCamera(video);
  return () => {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
}
