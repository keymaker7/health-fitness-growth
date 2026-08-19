"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { CONFIG, SKELETON, Session, extractSignals } from "@/features/jump-rope/counter.js";
import type { Observation, Point, Snapshot } from "@/features/jump-rope/counter";

/**
 * 앱 안에서 카메라로 줄넘기를 세는 화면.
 *
 * 판정은 줄넘기 카운터 앱의 counter.js 를 그대로 쓴다. 교실에서 검증된 로직이라
 * 옮기면서 고치지 않았다. 여기서는 카메라와 그리기만 맡는다.
 *
 * 모델과 wasm 은 앱 안(public/)에 넣어 두었다. 학교 방화벽이 CDN 을 막아도 돌아야 한다.
 */

const MODEL = "/models/pose_landmarker_lite.task";
const WASM = "/vendor/tasks-vision/wasm";
const BUNDLE = "/vendor/tasks-vision/vision_bundle.mjs";
const COLORS = ["#00c8ff", "#22d3a5", "#ff9d5c", "#c07bff"];

type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { landmarks?: { x: number; y: number; visibility?: number }[][] };
  close?: () => void;
};

export function CameraCounter({ onCount }: { onCount?: (total: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<InstanceType<typeof Session> | null>(null);
  const landmarkerRef = useRef<Landmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastVideoTime = useRef(-1);

  const [status, setStatus] = useState("«카메라 켜기»를 누르면 시작해요.");
  const [running, setRunning] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [maxPeople, setMaxPeople] = useState(2);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    try {
      setStatus("카메라를 여는 중…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      setStatus("자세 인식 모델을 불러오는 중… (처음 한 번만, 약 6MB)");
      // 번들러가 건드리지 못하게 문자열로 감싼다. 앱 안의 파일을 그대로 읽는다.
      const mod = await (new Function("u", "return import(u)") as (u: string) => Promise<{
        FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
        PoseLandmarker: { createFromOptions: (f: unknown, o: unknown) => Promise<Landmarker> };
      }>)(BUNDLE);
      const fileset = await mod.FilesetResolver.forVisionTasks(WASM);
      const opts = (delegate: string) => ({
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: "VIDEO",
        numPoses: maxPeople,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try {
        landmarkerRef.current = await mod.PoseLandmarker.createFromOptions(fileset, opts("GPU"));
      } catch {
        landmarkerRef.current = await mod.PoseLandmarker.createFromOptions(fileset, opts("CPU"));
      }

      sessionRef.current = new Session(CONFIG);
      setRunning(true);
      setStatus("온몸이 화면에 들어오게 서고, 손을 들면 시작해요.");

      const ctx = canvas.getContext("2d");
      const loop = () => {
        const lm = landmarkerRef.current;
        const s = sessionRef.current;
        if (!lm || !s || !ctx) return;
        if (video.readyState >= 2) {
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          if (video.currentTime !== lastVideoTime.current) {
            lastVideoTime.current = video.currentTime;
            const nowMs = performance.now();
            const result = lm.detectForVideo(video, nowMs);
            const now = nowMs / 1000;

            const observations: Observation[] = (result.landmarks ?? []).map((marks) => {
              const pts: Point[] = marks.map((p) => ({
                x: p.x * canvas.width,
                y: p.y * canvas.height,
                v: p.visibility === undefined ? 1 : p.visibility,
              }));
              return { sig: extractSignals(pts, CONFIG), pts };
            });

            s.update(observations, now);
            draw(ctx, canvas, video, observations);
            setSnap(s.snapshot(now));
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      stop();
      setStatus(`카메라를 열지 못했어요. 브라우저 권한을 확인해 주세요. (${(e as Error).message})`);
    }
  }, [maxPeople, stop]);

  const total = snap?.totalCount ?? 0;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">카메라 줄넘기</Tag>
        <Tag>앱 안에서 바로</Tag>
        {snap ? <Tag tone={snap.session === "RUNNING" ? "success" : "neutral"}>{koState(snap)}</Tag> : null}
      </div>

      <div className="relative mt-[var(--space-150)] overflow-hidden rounded-[var(--radius-medium)] bg-black">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="w-full -scale-x-100" />
        {snap && snap.countdown ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="text-[6rem] font-bold text-white drop-shadow">{snap.countdown}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-[var(--space-150)] flex flex-wrap items-center justify-between gap-[var(--space-150)]">
        <div>
          <p className="text-[var(--font-size-600)] font-bold text-[var(--brand-ink)]">{total}회</p>
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">{status}</p>
        </div>
        <label className="text-[var(--font-size-300)]">
          인원{" "}
          <select
            className="field inline-block w-auto"
            value={maxPeople}
            disabled={running}
            onChange={(e) => setMaxPeople(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}명
              </option>
            ))}
          </select>
        </label>
      </div>

      {snap && snap.people.length > 1 ? (
        <div className="mt-[var(--space-150)] grid gap-[var(--space-100)] sm:grid-cols-2">
          {snap.people.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between rounded-[var(--radius-small)] bg-[var(--brand-soft)] px-[var(--space-150)] py-[var(--space-100)]">
              <span className="font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
                {p.id}번 {p.ready ? "✋ 준비" : ""}
              </span>
              <span className="font-bold">{p.count}회</span>
            </div>
          ))}
        </div>
      ) : null}

      <BtnRow className="mt-[var(--space-200)]">
        {running ? (
          <Button variant="danger" onClick={stop}>
            카메라 끄기
          </Button>
        ) : (
          <Button onClick={start}>카메라 켜기</Button>
        )}
        {running ? (
          <Button variant="ghost" onClick={() => sessionRef.current?.reset(performance.now() / 1000)}>
            다시 세기
          </Button>
        ) : null}
        {total > 0 && onCount ? (
          <Button variant="soft" onClick={() => onCount(total)}>
            {total}회를 기록에 담기
          </Button>
        ) : null}
      </BtnRow>

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
        모델이 앱 안에 들어 있어 인터넷이 끊겨도 돌아요. 여러 명이면 좌우로 벌려 서세요.
      </p>
    </Card>
  );
}

function koState(s: Snapshot) {
  if (s.session === "RUNNING") return "세는 중";
  if (s.session === "COUNTDOWN") return "곧 시작";
  return `준비 ${s.readyCount}/${s.presentCount}명`;
}

function draw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  observations: Observation[],
) {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  observations.forEach((o, i) => {
    const color = COLORS[i % COLORS.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, canvas.width / 320);
    ctx.beginPath();
    for (const [a, b] of SKELETON) {
      const p = o.pts[a];
      const q = o.pts[b];
      if (!p || !q || p.v < 0.4 || q.v < 0.4) continue;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  });
}
