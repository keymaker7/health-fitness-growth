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
  type CameraHandle,
  type PoseFrame,
} from "@/features/multi-person-tracking/pose-adapter";
import { CONFIG, Session, extractSignals } from "@/features/jump-rope/counter.js";
import { toPixels } from "@/features/pose/localPose";
import { formatTime } from "@/lib/utils";
import type { Achievement } from "@/types/models";

/**
 * 세는 것도 사람을 잇는 것도 **줄넘기 카운터와 같은 코드**를 쓴다.
 *
 * 예전에는 이 화면만 41줄짜리 감지기(엉덩이가 조금 올라가면 점프)와 별도 추적기를 썼다.
 * 그 감지기에는 자유낙하 검사도 양발 동시 검사도 없어서 **걷기도 점프로 세어진다.**
 * 원본 줄넘기 앱이 교실에서 그 문제를 잡으려고 넣은 장치들이 여기엔 없었다.
 *
 * autoStart 를 켜서 «손 들어 준비 → 3·2·1» 은 건너뛴다 — 이 화면은 자기 시작 버튼이 있다.
 */
const SESSION_CONFIG = { ...CONFIG, autoStart: true };
const COLORS = ["#00c8ff", "#22d3a5", "#ff9d5c", "#c07bff", "#ffd166", "#ff6b6b"];

type PersonView = { id: number; label: string; color: string; jumps: number; box: { x: number; y: number; w: number; h: number } };

export default function MultiJumpPage() {
  const { saveSession } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const session = useRef(new Session(SESSION_CONFIG));
  const stopCam = useRef<null | CameraHandle>(null);
  const adapterRef = useRef<ReturnType<typeof createSimulationPoseAdapter> | null>(null);
  const [people, setPeople] = useState<PersonView[]>([]);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [mode, setMode] = useState<"sim" | "camera" | "idle">("idle");
  /**
   * 그리는 함수는 자세 인식 어댑터에 **한 번** 넘겨진 뒤 계속 불린다.
   * 그래서 `mode` 를 그대로 읽으면 «카메라를 켜기 전»의 값에 갇혀 영상이 영영 안 그려진다
   * (실제로 화면이 까맣고 관절 점만 보이는 증상이 났다). 최신 값은 ref 로 따로 들고 본다.
   */
  const modeRef = useRef<"sim" | "camera" | "idle">("idle");

  function changeMode(next: "sim" | "camera" | "idle") {
    modeRef.current = next;
    setMode(next);
  }
  const [status, setStatus] = useState("카메라 또는 시뮬레이션을 선택하세요. 영상은 기기를 떠나지 않습니다.");
  const [step, setStep] = useState<"work" | "after" | "done">("work");
  const [result, setResult] = useState<{ badges: Achievement[]; pb: boolean; total: number } | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  function onFrame(frame: PoseFrame) {
    // counter.js 는 **픽셀 좌표**로 판정한다 — 자세 인식이 주는 0~1 좌표를 화면 크기로 되돌린다
    const obs = frame.persons.map((p) => {
      const pts = toPixels(p.landmarks, frame.width, frame.height);
      return { pts, sig: extractSignals(pts, SESSION_CONFIG) };
    });
    session.current.update(obs, frame.ts / 1000);

    const next: PersonView[] = session.current.persons
      .flatMap((p) => (p.stable && p.pts ? [{ person: p, pts: p.pts }] : []))
      .sort((a, b) => a.person.id - b.person.id)
      .map(({ person, pts }, i) => ({
        id: person.id,
        label: `${i + 1}번`,
        color: COLORS[i % COLORS.length],
        jumps: person.count,
        box: boxOf(pts, frame.width, frame.height),
      }));
    setPeople(next);
    draw(frame, next);
  }

  /** 사람을 감싸는 네모 — 화면 비율(0~1)로 돌려준다 (그리는 쪽이 그렇게 기대한다) */
  function boxOf(pts: { x: number; y: number }[], w: number, h: number) {
    const xs = pts.map((p) => p.x / w);
    const ys = pts.map((p) => p.y / h);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }

  function draw(frame: PoseFrame, list: PersonView[]) {
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
    const liveVideo =
      !!video && modeRef.current === "camera" && video.readyState >= 2 && video.videoWidth > 0;
    if (video && liveVideo) ctx.drawImage(video, 0, 0, w, h);
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
    session.current = new Session(SESSION_CONFIG);
    const a = createSimulationPoseAdapter(4, "jump");
    adapterRef.current = a;
    await a.start(videoRef.current!, onFrame);
    changeMode("sim");
    setRunning(true);
    setStatus("시뮬레이션: 4명의 ID가 교차되어도 최대한 유지됩니다.");
  }

  async function startCam() {
    stop();
    session.current = new Session(SESSION_CONFIG);
    try {
      stopCam.current = await startCamera(videoRef.current!);
      const a = createMediaPipePoseAdapter(6);
      adapterRef.current = a;
      await a.start(videoRef.current!, onFrame);
      changeMode("camera");
      setRunning(true);
      setStatus("카메라 로컬 처리 중. 원본 영상은 서버에 저장되지 않습니다.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "카메라를 열 수 없어요. 시뮬레이션을 사용해 주세요.");
      await startSim();
    }
  }

  function stop() {
    adapterRef.current?.stop();
    stopCam.current?.stop();
    stopCam.current = null;
    setRunning(false);
  }

  async function flipCam() {
    const cam = stopCam.current?.controller;
    if (!cam || cam.busy) return;
    if (await cam.switchNext()) {
      session.current = new Session(SESSION_CONFIG);
      setPeople([]);
      setStatus(`${cam.facingKo} 카메라로 바꿨어요 — 처음부터 다시 셉니다.`);
    } else {
      setStatus("전환할 다른 카메라가 없어요. (노트북·PC는 대부분 카메라가 하나입니다)");
    }
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
            <ul className="space-y-2" data-testid="people">
              {(people.length ? people : [{ id: 0, label: "대기", jumps: 0, color: COLORS[0] }]).map((p, i) => (
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
        {mode === "camera" ? (
          <Button variant="ghost" onClick={() => void flipCam()}>
            📷 {stopCam.current?.controller.otherKo ?? "뒷면"} 카메라로
          </Button>
        ) : null}
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
