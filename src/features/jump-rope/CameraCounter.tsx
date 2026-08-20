"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { CONFIG, SKELETON, Session, extractSignals } from "@/features/jump-rope/counter.js";
import type { Observation, Point, Snapshot } from "@/features/jump-rope/counter";
import { createLandmarker, toPixels, type Landmarker } from "@/features/pose/localPose";
import { CameraController, type CameraFacing } from "@/features/pose/camera.js";

/**
 * 앱 안에서 카메라로 줄넘기를 세는 화면.
 *
 * 판정은 줄넘기 카운터 앱의 counter.js 를 그대로 쓴다. 교실에서 검증된 로직이라
 * 옮기면서 고치지 않았다. 여기서는 카메라와 그리기만 맡는다.
 *
 * 모델과 wasm 은 앱 안(public/)에 넣어 두었다. 학교 방화벽이 CDN 을 막아도 돌아야 한다.
 */

const COLORS = ["#00c8ff", "#22d3a5", "#ff9d5c", "#c07bff"];

export function CameraCounter({ onCount }: { onCount?: (total: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<InstanceType<typeof Session> | null>(null);
  const landmarkerRef = useRef<Landmarker | null>(null);
  const camRef = useRef<CameraController | null>(null);
  const rafRef = useRef(0);
  const loopRef = useRef<(() => void) | null>(null);
  const lastVideoTime = useRef(-1);

  const [status, setStatus] = useState("«카메라 켜기»를 누르면 시작해요.");
  const [running, setRunning] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [maxPeople, setMaxPeople] = useState(2);
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
        prefKey: "jumprope.camera",
        onChange: (c) => setFacing(c.facing),
        onError: (m) => { if (m) setStatus(m); },
      });
      camRef.current = cam;
      if (!(await cam.start())) throw new Error("카메라를 열 수 없어요");

      setStatus("자세 인식 모델을 불러오는 중… (처음 한 번만, 약 6MB)");
      landmarkerRef.current = await createLandmarker(maxPeople);

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
              const pts: Point[] = toPixels(marks, canvas.width, canvas.height);
              return { sig: extractSignals(pts, CONFIG), pts };
            });

            s.update(observations, now);
            draw(ctx, canvas, video, observations);
            setSnap(s.snapshot(now));
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loopRef.current = loop;
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
      sessionRef.current?.reset(performance.now() / 1000);
      setStatus(`${cam.facingKo} 카메라로 바꿨어요 — 처음부터 다시 셉니다.`);
    }
  }, []);

  /**
   * 인원 바꾸기. 카메라가 켜져 있어도 «세기 시작 전»(손 들기 대기)이라면 바꿀 수 있다.
   * 자세 인식이 인원 수로 만들어지므로 그것만 새로 만들고, 카메라는 그대로 둔다.
   */
  const changingRef = useRef(false);
  const changePeople = useCallback(async (n: number) => {
    setMaxPeople(n);
    if (!camRef.current?.stream || changingRef.current) return;
    changingRef.current = true;
    cancelAnimationFrame(rafRef.current);
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    setStatus(`${n}명 기준으로 다시 준비하는 중…`);
    landmarkerRef.current = await createLandmarker(n);
    sessionRef.current = new Session(CONFIG);
    setSnap(null);
    setStatus("온몸이 화면에 들어오게 서고, 손을 들면 시작해요.");
    if (loopRef.current) rafRef.current = requestAnimationFrame(loopRef.current);
    changingRef.current = false;
  }, []);

  const total = snap?.totalCount ?? 0;
  // 세기 전(손 들기 대기)까지는 인원을 바꿀 수 있다. 카운트다운·세는 중에만 잠근다.
  const peopleLocked = running && !!snap && snap.session !== "WAITING";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">카메라 줄넘기</Tag>
        <Tag>앱 안에서 바로</Tag>
        {snap ? <Tag tone={snap.session === "RUNNING" ? "success" : "neutral"}>{koState(snap)}</Tag> : null}
      </div>

      <div className="relative mt-[var(--space-150)] overflow-hidden rounded-[var(--radius-medium)] bg-black">
        <video ref={videoRef} playsInline muted className="hidden" />
        {/* 뒷면 카메라는 거울을 끈다 — 원본과 같은 규칙 (mirror = facing !== 'environment') */}
        <canvas ref={canvasRef} className={facing === "environment" ? "w-full" : "w-full -scale-x-100"} />
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
            disabled={peopleLocked}
            onChange={(e) => void changePeople(Number(e.target.value))}
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
