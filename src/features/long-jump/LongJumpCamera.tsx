"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { Calibration, LJ_CONFIG, LongJumpSession, extractFoot } from "@/features/long-jump/longjump.js";
import type { LJObservation, LJSnapshot, Point } from "@/features/long-jump/longjump";
import { createLandmarker, toPixels, type Landmarker } from "@/features/pose/localPose";
import { CameraController } from "@/features/pose/camera.js";

/**
 * 앱 안에서 제자리멀리뛰기를 재는 화면.
 *
 * 측정은 제자리멀리뛰기 앱의 longjump.js 를 그대로 쓴다. 바닥 좌표 보정,
 * 착지 창 선택, 파울 판정이 전부 거기 들어 있다.
 *
 * 다른 종목과 달리 «바닥 기준»이 있어야 cm 가 나온다.
 * 바닥에 네 점(직사각형)을 찍고 가로·세로 실제 길이를 넣는다.
 */

const CORNER_LABELS = ["발구름선 왼쪽", "발구름선 오른쪽", "먼쪽 오른쪽", "먼쪽 왼쪽"];

export function LongJumpCamera({ onCount }: { onCount?: (total: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<InstanceType<typeof LongJumpSession> | null>(null);
  const landmarkerRef = useRef<Landmarker | null>(null);
  const camRef = useRef<CameraController | null>(null);
  const rafRef = useRef(0);
  const lastVideoTime = useRef(-1);
  const cornersRef = useRef<Point[]>([]);

  const [running, setRunning] = useState(false);
  const [corners, setCorners] = useState<Point[]>([]);
  const [widthCm, setWidthCm] = useState(100);
  const [depthCm, setDepthCm] = useState(300);
  const [snap, setSnap] = useState<LJSnapshot | null>(null);
  const [status, setStatus] = useState("«카메라 켜기» → 바닥 네 점 찍기 → 뛰기 순서예요.");

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
        prefKey: "longjump.camera",
        onError: (m) => { if (m) setStatus(m); },
      });
      camRef.current = cam;
      if (!(await cam.start())) throw new Error("카메라를 열 수 없어요");
      setStatus("자세 인식 모델을 불러오는 중… (처음 한 번만, 약 6MB)");
      landmarkerRef.current = await createLandmarker(1);

      sessionRef.current = new LongJumpSession(LJ_CONFIG, null);
      setRunning(true);
      setStatus("바닥 네 귀퉁이를 순서대로 눌러 주세요. 발구름선 왼쪽부터입니다.");

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

            const obs: LJObservation[] = (result.landmarks ?? []).map((marks) => {
              const pts = toPixels(marks, canvas.width, canvas.height);
              return { pts, sig: extractFoot(pts, LJ_CONFIG) };
            });

            setSnap(s.update(obs, now));
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            drawCorners(ctx, cornersRef.current, canvas);
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      stop();
      setStatus(`카메라를 열지 못했어요. (${(e as Error).message})`);
    }
  }, [stop]);

  const flip = useCallback(async () => {
    const cam = camRef.current;
    if (!cam || cam.busy) return;
    if (await cam.switchNext()) {
      // 카메라가 바뀌면 화면 좌표가 통째로 달라진다 — 바닥 기준을 다시 잡아야 한다.
      sessionRef.current = new LongJumpSession(LJ_CONFIG, null);
      setCorners([]);
      cornersRef.current = [];
      setSnap(null);
      setStatus(`${cam.facingKo} 카메라로 바꿨어요. 바닥 네 귀퉁이를 다시 눌러 주세요.`);
    }
  }, []);

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !running || corners.length >= 4) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const next = [...corners, { x, y }];
    setCorners(next);
    cornersRef.current = next;
    if (next.length === 4) {
      const cal = Calibration.fromRect(next, widthCm, depthCm);
      if (cal.ok) {
        sessionRef.current?.setCalibration(cal);
        setStatus("기준을 잡았어요. 발구름선 뒤에 서서 준비하면 자동으로 잽니다.");
      } else {
        setStatus(`기준을 잡지 못했어요: ${cal.error ?? "네 점을 다시 찍어 주세요"}`);
        setCorners([]);
        cornersRef.current = [];
      }
    } else {
      setStatus(`${CORNER_LABELS[next.length]}을(를) 눌러 주세요. (${next.length}/4)`);
    }
  }

  const best = snap?.best ?? null;
  const last = snap?.result ?? null;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">제자리멀리뛰기</Tag>
        <Tag>앱 안에서 바로</Tag>
        {snap?.calibrated ? <Tag tone="success">기준 잡힘</Tag> : <Tag tone="warning">기준 필요</Tag>}
        {snap?.foulAtSet ? <Tag tone="danger">파울</Tag> : null}
      </div>

      <div className="relative mt-[var(--space-150)] overflow-hidden rounded-[var(--radius-medium)] bg-black">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} onClick={onCanvasClick} className="w-full cursor-crosshair" />
      </div>

      {running && corners.length < 4 ? (
        <div className="mt-[var(--space-150)] grid gap-[var(--space-150)] sm:grid-cols-2">
          <label className="text-[var(--font-size-300)]">
            가로 (cm)
            <input
              className="field mt-[var(--space-50)]"
              type="number"
              value={widthCm}
              onChange={(e) => setWidthCm(Number(e.target.value))}
            />
          </label>
          <label className="text-[var(--font-size-300)]">
            세로 (cm)
            <input
              className="field mt-[var(--space-50)]"
              type="number"
              value={depthCm}
              onChange={(e) => setDepthCm(Number(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      <div className="mt-[var(--space-150)] grid gap-[var(--space-150)] sm:grid-cols-2">
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">이번 시기</p>
          <p className="text-[var(--font-size-600)] font-bold text-[var(--brand-ink)]">
            {last?.distanceCm ? `${Math.round(last.distanceCm)}cm` : last?.error ? "—" : "—"}
          </p>
        </div>
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">최고 (파울 제외)</p>
          <p className="text-[var(--font-size-600)] font-bold">{best ? `${Math.round(best)}cm` : "—"}</p>
        </div>
      </div>

      {snap?.attempts.length ? (
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)]">
          시기{" "}
          {snap.attempts.map((a, i) => (
            <b key={i} className="mr-[var(--space-100)]">
              {a.foul ? "파울" : a.distanceCm ? `${Math.round(a.distanceCm)}cm` : "—"}
            </b>
          ))}
        </p>
      ) : null}

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">{status}</p>

      <BtnRow className="mt-[var(--space-200)]">
        {running ? (
          <Button variant="danger" onClick={stop}>
            카메라 끄기
          </Button>
        ) : (
          <Button onClick={start}>카메라 켜기</Button>
        )}
        {running ? (
          <Button
            variant="ghost"
            onClick={() => {
              setCorners([]);
              cornersRef.current = [];
              setStatus("바닥 네 귀퉁이를 다시 눌러 주세요.");
            }}
          >
            기준 다시 잡기
          </Button>
        ) : null}
        {running ? (
          <Button variant="ghost" onClick={() => void flip()}>
            📷 {camRef.current?.otherKo ?? "뒷면"} 카메라로
          </Button>
        ) : null}
        {best && onCount ? (
          <Button variant="soft" onClick={() => onCount(Math.round(best))}>
            {Math.round(best)}cm를 기록에 담기
          </Button>
        ) : null}
      </BtnRow>

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
        바닥에 직사각형을 그리고 네 귀퉁이를 눌러 실제 길이를 넣으면, 화면 좌표가 실제 cm로 바뀝니다.
        카메라는 옆에서 바닥이 잘 보이게 두세요. 모델이 앱 안에 있어 인터넷이 끊겨도 돕니다.
      </p>
    </Card>
  );
}

function drawCorners(ctx: CanvasRenderingContext2D, pts: Point[], canvas: HTMLCanvasElement) {
  if (!pts.length) return;
  const r = Math.max(4, canvas.width / 160);
  ctx.strokeStyle = "#22d3a5";
  ctx.fillStyle = "#22d3a5";
  ctx.lineWidth = Math.max(2, canvas.width / 400);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (pts.length === 4) ctx.closePath();
  ctx.stroke();
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${r * 2}px system-ui`;
    ctx.fillText(String(i + 1), p.x + r, p.y - r);
    ctx.fillStyle = "#22d3a5";
  });
}
