"use client";

import { useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, PageTitle } from "@/components/ui";
import { EmotionGate } from "@/components/EmotionGate";
import { WorkoutResult } from "@/components/WorkoutResult";
import { useApp } from "@/features/dashboard/AppProvider";
import {
  createMediaPipePoseAdapter,
  createSimulationPoseAdapter,
  startCamera,
  type PoseFrame,
} from "@/features/multi-person-tracking/pose-adapter";
import { IoUTracker } from "@/features/multi-person-tracking/iou-tracker";
import { HipJumpDetector, hipY } from "@/features/jump-rope/jump-detector";
import { formatTime } from "@/lib/utils";
import type { Achievement } from "@/types/models";

type PersonState = { id: string; label: string; color: string; jumps: number; box: { x: number; y: number; w: number; h: number } };

export default function MultiJumpPage() {
  const { saveSession } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tracker = useRef(new IoUTracker());
  const detectors = useRef(new Map<string, HipJumpDetector>());
  const stopCam = useRef<null | (() => void)>(null);
  const adapterRef = useRef<ReturnType<typeof createSimulationPoseAdapter> | null>(null);
  const [people, setPeople] = useState<PersonState[]>([]);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [mode, setMode] = useState<"sim" | "camera" | "idle">("idle");
  const [status, setStatus] = useState("카메라 또는 시뮬레이션을 선택하세요. 영상은 기기를 떠나지 않습니다.");
  const [step, setStep] = useState<"work" | "after" | "done">("work");
  const [result, setResult] = useState<{ badges: Achievement[]; pb: boolean; total: number } | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  function onFrame(frame: PoseFrame) {
    const dets = frame.persons.map((p) => ({ box: p.box, score: p.score }));
    const tracks = tracker.current.update(dets);
    const next: PersonState[] = tracks.map((tr, i) => {
      if (!detectors.current.has(tr.id)) detectors.current.set(tr.id, new HipJumpDetector());
      const person = frame.persons[i];
      if (person) detectors.current.get(tr.id)!.push(hipY(person.landmarks));
      return {
        id: tr.id,
        label: tr.label,
        color: tr.color,
        jumps: detectors.current.get(tr.id)?.count ?? 0,
        box: tr.box,
      };
    });
    setPeople(next);
    draw(frame, next);
  }

  function draw(frame: PoseFrame, list: PersonState[]) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const w = video?.videoWidth || 640;
    const h = video?.videoHeight || 360;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (video && mode === "camera") ctx.drawImage(video, 0, 0, w, h);
    else {
      ctx.fillStyle = "#201f1e";
      ctx.fillRect(0, 0, w, h);
    }
    list.forEach((p) => {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(p.box.x * w, p.box.y * h, p.box.w * w, p.box.h * h);
      ctx.fillStyle = p.color;
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`ID ${p.id}  ${p.jumps}회`, p.box.x * w, Math.max(24, p.box.y * h - 8));
    });
    frame.persons.forEach((person) => {
      ctx.fillStyle = "#f8fafc";
      person.landmarks.forEach((l) => {
        ctx.beginPath();
        ctx.arc(l.x * w, l.y * h, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  async function startSim() {
    stop();
    tracker.current = new IoUTracker();
    detectors.current = new Map();
    const a = createSimulationPoseAdapter(4);
    adapterRef.current = a;
    await a.start(videoRef.current!, onFrame);
    setMode("sim");
    setRunning(true);
    setStatus("시뮬레이션: 4명의 ID가 교차되어도 최대한 유지됩니다.");
  }

  async function startCam() {
    stop();
    tracker.current = new IoUTracker();
    detectors.current = new Map();
    try {
      stopCam.current = await startCamera(videoRef.current!);
      const a = createMediaPipePoseAdapter(6);
      adapterRef.current = a;
      await a.start(videoRef.current!, onFrame);
      setMode("camera");
      setRunning(true);
      setStatus("카메라 로컬 처리 중. 원본 영상은 서버에 저장되지 않습니다.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "카메라를 열 수 없어요. 시뮬레이션을 사용해 주세요.");
      await startSim();
    }
  }

  function stop() {
    adapterRef.current?.stop();
    stopCam.current?.();
    stopCam.current = null;
    setRunning(false);
  }

  if (step === "after") {
    const total = people.reduce((a, p) => a + p.jumps, 0);
    return (
      <EmotionGate
        phase="after"
        title="다인원 줄넘기를 마치고"
        confirmLabel="결과 저장"
        onDone={async (mood, n) => {
          const saved = await saveSession({
            exerciseId: "jump-rope",
            exerciseName: "AI 다인원 줄넘기",
            exerciseType: "cardio",
            startTime: new Date(Date.now() - seconds * 1000).toISOString(),
            endTime: new Date().toISOString(),
            durationSec: seconds,
            count: total,
            score: total,
            accuracy: 100,
            afterEmotion: mood,
            afterNote: n,
            source: mode === "camera" ? "camera" : "simulation",
          });
          setResult({ badges: saved.newBadges, pb: saved.isPersonalBest, total });
          setStep("done");
        }}
      />
    );
  }

  if (step === "done" && result) {
    return (
      <WorkoutResult
        name="다인원 줄넘기"
        count={result.total}
        durationSec={seconds}
        isPersonalBest={result.pb}
        badges={result.badges}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="AI 줄넘기"
        title="여러 학생의 횟수를 동시에 확인해요"
        sub="카메라는 이 기기에서만 처리합니다. 원본 영상은 서버에 저장되지 않습니다."
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_260px]">
        <div className="hud relative overflow-hidden">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="h-auto w-full" />
        </div>
        <div className="space-y-3">
          <Card>
            <p className="text-xs text-[var(--muted)]">운동 시간</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatTime(seconds)}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{status}</p>
          </Card>
          <Card>
            <p className="mb-2 text-sm font-semibold">측정 현황</p>
            <ul className="space-y-2">
              {(people.length ? people : [{ id: "0", label: "대기", jumps: 0, color: "#0f6cbd" }]).map((p, i) => (
                <li key={p.id} className="flex items-baseline justify-between gap-2 border-b border-[var(--line)] py-[var(--space-100)] last:border-0">
                  <span className="font-semibold" style={{ color: p.color }}>
                    학생 {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="tabular-nums font-semibold">{p.jumps}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <BtnRow>
        <Button onClick={() => void startCam()}>카메라 측정</Button>
        <Button variant="soft" onClick={() => void startSim()}>
          시뮬레이션 시작
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            stop();
            setStep("after");
          }}
        >
          운동 종료
        </Button>
      </BtnRow>
    </div>
  );
}
