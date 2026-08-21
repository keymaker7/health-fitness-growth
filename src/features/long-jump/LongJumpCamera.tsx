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
 * 측정은 longjump.js 를 그대로 쓴다. 바닥 좌표 보정, 착지 창 선택, 파울 판정이 거기 있다.
 *
 * 바닥 기준은 «뛰는 방향 직선» 하나로 잡는다 — 사각형(가로·세로)이 아니다.
 * 바닥에 줄자를 깔고 0m·1m·2m… 지점을 순서대로 누르면, 그 거리들이 곧 기준이 된다.
 * (예전엔 세로 크기를 잘못 둬서 5cm 점프가 300m 로 나오던 사고가 있었다 — 이 방식엔 그 함정이 없다.)
 */

export function LongJumpCamera({ onCount }: { onCount?: (total: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<InstanceType<typeof LongJumpSession> | null>(null);
  const landmarkerRef = useRef<Landmarker | null>(null);
  const camRef = useRef<CameraController | null>(null);
  const rafRef = useRef(0);
  const lastVideoTime = useRef(-1);
  const marksRef = useRef<Point[]>([]);
  const calRef = useRef<InstanceType<typeof Calibration> | null>(null);

  const [running, setRunning] = useState(false);
  const [marks, setMarks] = useState<Point[]>([]);
  const [stepCm, setStepCm] = useState(100);       // 점 사이 실제 간격 (기본 1m)
  const [pointCount, setPointCount] = useState(4); // 찍을 점 개수 (0·1·2·3m)
  const [snap, setSnap] = useState<LJSnapshot | null>(null);
  const [status, setStatus] = useState("«카메라 켜기» → 바닥 줄자 위 지점 찍기 → 뛰기 순서예요.");

  // 그리기 콜백(rAF 루프)은 최신 stepCm 을 봐야 한다 — ref 로 넘긴다.
  const stepCmRef = useRef(stepCm);
  useEffect(() => { stepCmRef.current = stepCm; }, [stepCm]);

  const calibrated = marks.length >= pointCount && !!calRef.current?.ok;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    camRef.current?.stream?.getTracks().forEach((t) => t.stop());
    camRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const resetMarks = useCallback((msg: string) => {
    setMarks([]);
    marksRef.current = [];
    calRef.current = null;
    setStatus(msg);
  }, []);

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
      calRef.current = null;
      setRunning(true);
      setStatus("바닥 0m(발구름선) 지점을 눌러 주세요.");

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

            const obs: LJObservation[] = (result.landmarks ?? []).map((marksLm) => {
              const pts = toPixels(marksLm, canvas.width, canvas.height);
              return { pts, sig: extractFoot(pts, LJ_CONFIG) };
            });

            setSnap(s.update(obs, now));
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            drawRuler(ctx, marksRef.current, stepCmRef.current, calRef.current, canvas);
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
      setSnap(null);
      resetMarks(`${cam.facingKo} 카메라로 바꿨어요. 바닥 0m 지점부터 다시 눌러 주세요.`);
    }
  }, [resetMarks]);

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !running || marks.length >= pointCount) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const next = [...marks, { x, y }];
    setMarks(next);
    marksRef.current = next;

    if (next.length >= pointCount) {
      const withDist = next.map((p, i) => ({ x: p.x, y: p.y, distCm: i * stepCm }));
      const cal = Calibration.fromRuler(withDist);
      if (cal.ok) {
        calRef.current = cal;
        sessionRef.current?.setCalibration(cal);
        setStatus("기준을 잡았어요. 바닥에 그려진 눈금이 줄자와 맞는지 눈으로 확인하고, 발구름선 뒤에 서서 준비하세요.");
      } else {
        calRef.current = null;
        resetMarks(`기준을 잡지 못했어요: ${cal.error ?? "지점을 다시 눌러 주세요"}`);
      }
    } else {
      setStatus(`${next.length * stepCm}cm 지점을 눌러 주세요. (${next.length + 1}/${pointCount})`);
    }
  }

  const best = snap?.best ?? null;
  const last = snap?.result ?? null;
  const showNum = last?.distanceCm && !last?.implausible;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">제자리멀리뛰기</Tag>
        <Tag>앱 안에서 바로</Tag>
        {calibrated ? <Tag tone="success">기준 잡힘</Tag> : <Tag tone="warning">기준 필요</Tag>}
        {snap?.foulAtSet ? <Tag tone="danger">파울</Tag> : null}
      </div>

      <div className="relative mt-[var(--space-150)] overflow-hidden rounded-[var(--radius-medium)] bg-black">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas ref={canvasRef} onClick={onCanvasClick} className="w-full cursor-crosshair" />
      </div>

      {running && marks.length < pointCount ? (
        <div className="mt-[var(--space-150)] grid gap-[var(--space-150)] sm:grid-cols-2">
          <label className="text-[var(--font-size-300)]">
            눈금 간격 (cm)
            <input
              className="field mt-[var(--space-50)]"
              type="number"
              min={10}
              value={stepCm}
              onChange={(e) => setStepCm(Math.max(10, Number(e.target.value) || 0))}
            />
          </label>
          <label className="text-[var(--font-size-300)]">
            찍을 점 개수
            <select
              className="field mt-[var(--space-50)]"
              value={pointCount}
              onChange={(e) => setPointCount(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}개 (0 ~ {(n - 1) * stepCm}cm)</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="mt-[var(--space-150)] grid gap-[var(--space-150)] sm:grid-cols-2">
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">이번 시기</p>
          <p className="text-[var(--font-size-600)] font-bold text-[var(--brand-ink)]">
            {showNum ? `${Math.round(last!.distanceCm!)}cm` : last?.implausible ? "측정 오류" : "—"}
          </p>
        </div>
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">최고 (파울 제외)</p>
          <p className="text-[var(--font-size-600)] font-bold">{best ? `${Math.round(best)}cm` : "—"}</p>
        </div>
      </div>

      {last?.warning ? (
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--danger, #c0392b)]">⚠ {last.warning}</p>
      ) : null}

      {snap?.attempts.length ? (
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)]">
          시기{" "}
          {snap.attempts.map((a, i) => (
            <b key={i} className="mr-[var(--space-100)]">
              {a.foul ? "파울" : a.implausible ? "오류" : a.distanceCm ? `${Math.round(a.distanceCm)}cm` : "—"}
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
          <Button variant="ghost" onClick={() => resetMarks("바닥 0m(발구름선) 지점부터 다시 눌러 주세요.")}>
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
        바닥에 <b className="font-semibold text-[var(--brand-ink)]">줄자를 뛰는 방향으로 깔고</b>, 화면에서
        <b className="font-semibold"> 0m·1m·2m… 지점</b>을 순서대로 누르면 화면 좌표가 실제 cm로 바뀝니다.
        카메라는 <b className="font-semibold">옆에서 바닥이 잘 보이게</b> 두세요. 모델이 앱 안에 있어 인터넷이 끊겨도 돕니다.
      </p>
    </Card>
  );
}

/**
 * 찍은 점, 뛰는 축, 그리고 보정 후 «1m 눈금»을 바닥에 그린다.
 * 눈금을 그려 주는 게 핵심이다 — 사용자가 "화면 2m 선이 줄자 2m 표시와 겹치나"를 눈으로 확인해야
 * 잘못 잡힌 기준(예전 300m 사고)을 잰 순간이 아니라 재기 전에 알아챈다.
 */
function drawRuler(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  stepCm: number,
  cal: InstanceType<typeof Calibration> | null,
  canvas: HTMLCanvasElement,
) {
  const r = Math.max(4, canvas.width / 160);
  const lw = Math.max(2, canvas.width / 400);

  // 보정이 끝났으면 실제 눈금선을 되그린다 (toImage 역변환)
  if (cal?.ok && cal.kind === "ruler") {
    const dMax = cal.distMax ?? 0;
    ctx.strokeStyle = "rgba(34,211,165,0.55)";
    ctx.fillStyle = "#22d3a5";
    ctx.lineWidth = lw;
    ctx.font = `bold ${r * 1.8}px system-ui`;
    for (let d = 0; d <= dMax + 1; d += stepCm) {
      const c = cal.toImage(0, d);
      const side = cal.toImage(Math.max(30, stepCm * 0.4), d); // 눈금을 짧은 선분으로 보이게
      if (!c) continue;
      if (side) {
        ctx.beginPath();
        ctx.moveTo(c.x - (side.x - c.x), c.y - (side.y - c.y));
        ctx.lineTo(side.x, side.y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`${Math.round(d / (stepCm >= 100 ? 100 : 1))}${stepCm >= 100 ? "m" : "cm"}`, c.x + r, c.y - r);
    }
  }

  // 사용자가 찍는 중인 점 + 연결선
  if (!pts.length) return;
  ctx.strokeStyle = "#facc15";
  ctx.fillStyle = "#facc15";
  ctx.lineWidth = lw;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.font = `bold ${r * 2}px system-ui`;
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    const label = i * stepCm >= 100 ? `${(i * stepCm) / 100}m` : `${i * stepCm}cm`;
    ctx.fillStyle = "#fff";
    ctx.fillText(label, p.x + r, p.y - r);
    ctx.fillStyle = "#facc15";
  });
}
