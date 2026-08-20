"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { SQUAT_CONFIG, SquatSession, extractSquat } from "@/features/squat/squat.js";
import type { SquatObservation, SquatUpdate } from "@/features/squat/squat";
import { createLandmarker, toPixels, type Landmarker } from "@/features/pose/localPose";
import { CameraController, type CameraFacing } from "@/features/pose/camera.js";

/**
 * 앱 안에서 카메라로 스쿼트를 세는 화면.
 *
 * 판정은 스쿼트 카메라 앱의 squat.js 를 그대로 쓴다.
 * 얕은 까딱임을 안 세는 것, 앉아 쉬는 것을 걸러내는 것, 다리가 화면에서 잘려도
 * 엉덩이 높이로 세는 것, 겹쳤을 때 남의 횟수가 넘어가지 않게 막는 것이 전부 거기 들어 있다.
 */

const COLORS = ["#00c8ff", "#22d3a5", "#ff9d5c", "#c07bff"];

export function SquatCamera({ onCount }: { onCount?: (total: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<InstanceType<typeof SquatSession> | null>(null);
  const landmarkerRef = useRef<Landmarker | null>(null);
  const camRef = useRef<CameraController | null>(null);
  const rafRef = useRef(0);
  const lastVideoTime = useRef(-1);

  const [status, setStatus] = useState("«카메라 켜기»를 누르면 시작해요.");
  const [running, setRunning] = useState(false);
  const [snap, setSnap] = useState<SquatUpdate | null>(null);
  const [maxPeople, setMaxPeople] = useState(1);
  const [facing, setFacing] = useState<CameraFacing>("user");

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    camRef.current?.stream?.getTracks().forEach((t) => t.stop());
    camRef.current = null;
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
      const cam = new CameraController(video, {
        prefKey: "squatcam.camera",
        onChange: (c) => setFacing(c.facing),
        onError: (m) => { if (m) setStatus(m); },
      });
      camRef.current = cam;
      if (!(await cam.start())) throw new Error("카메라를 열 수 없어요");

      setStatus("자세 인식 모델을 불러오는 중… (처음 한 번만, 약 6MB)");
      landmarkerRef.current = await createLandmarker(maxPeople);

      sessionRef.current = new SquatSession({ ...SQUAT_CONFIG, maxPeople });
      setRunning(true);
      setStatus("온몸이 화면에 들어오게 서고, 오른손을 들면 시작해요.");

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

            const obs: SquatObservation[] = (result.landmarks ?? []).map((marks) => {
              const pts = toPixels(marks, canvas.width, canvas.height);
              return { pts, sig: extractSquat(pts, SQUAT_CONFIG) };
            });

            const r = s.update(obs, now);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setSnap(r);
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

  const flip = useCallback(async () => {
    const cam = camRef.current;
    if (!cam || cam.busy) return;
    if (await cam.switchNext()) {
      sessionRef.current?.reset();
      setStatus(`${cam.facingKo} 카메라로 바꿨어요 — 다시 준비부터 시작해요.`);
    }
  }, []);

  const people = snap?.people.filter((p) => p.established) ?? [];
  const total = people.reduce((n, p) => n + p.count, 0);
  const readyCount = people.filter((p) => p.ready).length;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">카메라 스쿼트</Tag>
        <Tag>앱 안에서 바로</Tag>
        {snap ? (
          <Tag tone={snap.state === "RUNNING" ? "success" : "neutral"}>
            {snap.state === "RUNNING" ? "세는 중" : snap.state === "COUNTDOWN" ? "곧 시작" : `준비 ${readyCount}/${people.length}명`}
          </Tag>
        ) : null}
      </div>

      <div className="relative mt-[var(--space-150)] overflow-hidden rounded-[var(--radius-medium)] bg-black">
        <video ref={videoRef} playsInline muted className="hidden" />
        {/* 뒷면 카메라는 거울을 끈다 — 원본과 같은 규칙 (mirror = facing !== 'environment') */}
        <canvas ref={canvasRef} className={facing === "environment" ? "w-full" : "w-full -scale-x-100"} />
        {snap?.countdownLeft ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="text-[6rem] font-bold text-white drop-shadow">{Math.ceil(snap.countdownLeft)}</span>
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

      {people.length > 1 ? (
        <div className="mt-[var(--space-150)] grid gap-[var(--space-100)] sm:grid-cols-2">
          {people.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-[var(--radius-small)] bg-[var(--brand-soft)] px-[var(--space-150)] py-[var(--space-100)]"
            >
              <span className="font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
                {p.id}번 {p.ready ? "✋ 준비" : ""}
                {!p.legsVisible ? " · 다리 잘림" : ""}
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
          <Button variant="ghost" onClick={() => sessionRef.current?.reset()}>
            다시 준비
          </Button>
        ) : null}
        {running ? (
          <Button variant="ghost" onClick={() => void flip()}>
            📷 {camRef.current?.otherKo ?? "뒷면"} 카메라로
          </Button>
        ) : null}
        {total > 0 && onCount ? (
          <Button variant="soft" onClick={() => onCount(total)}>
            {total}회를 기록에 담기
          </Button>
        ) : null}
      </BtnRow>

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
        모델이 앱 안에 있어 인터넷이 끊겨도 돌아요. 얕게 까딱이는 건 세지 않고, 다리가 화면에서 잘려도 엉덩이 높이로 셉니다.
      </p>
    </Card>
  );
}
