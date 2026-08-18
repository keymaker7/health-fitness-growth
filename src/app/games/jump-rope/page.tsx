"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BtnRow, Button, Card, PageTitle } from "@/components/ui";
import { EmotionGate } from "@/components/EmotionGate";
import { WorkoutResult } from "@/components/WorkoutResult";
import { useApp } from "@/features/dashboard/AppProvider";
import { createMicrobitAdapter, MICROBIT_MAKECODE } from "@/features/microbit/adapter";
import { formatTime } from "@/lib/utils";
import type { Achievement, EmotionKey } from "@/types/models";

type Step = "before" | "work" | "after" | "done";

export default function JumpRopePage() {
  const { user, saveSession } = useApp();
  const adapter = useMemo(() => createMicrobitAdapter(), []);
  const [step, setStep] = useState<Step>("before");
  const [mode, setMode] = useState<"idle" | "bt" | "serial" | "sim">("idle");
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [rpm, setRpm] = useState(0);
  const [pace, setPace] = useState(70);
  const [status, setStatus] = useState("연결 또는 시뮬레이션을 선택하세요.");
  const [before, setBefore] = useState<EmotionKey>("calm");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ badges: Achievement[]; pb: boolean } | null>(null);
  const lastJump = useRef(0);
  const times = useRef<number[]>([]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => {
    adapter.simulation.setPace(pace);
  }, [adapter, pace]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        adapter.simulation.tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adapter]);

  useEffect(() => {
    const onJump = () => {
      if (!running) return;
      const now = Date.now();
      if (now - lastJump.current < 240) return;
      if (now - lastJump.current < 1400) {
        setStreak((s) => {
          const n = s + 1;
          setMaxStreak((m) => Math.max(m, n));
          return n;
        });
      } else {
        setStreak(1);
      }
      lastJump.current = now;
      times.current = [...times.current.filter((x) => now - x < 10000), now];
      const r = times.current.length > 1 ? Math.round(((times.current.length - 1) / 10) * 60) : 0;
      setRpm(r);
      setCount((c) => c + 1);
    };
    const offs = [
      adapter.bluetooth.subscribe(onJump),
      adapter.serial.subscribe(onJump),
      adapter.simulation.subscribe(onJump),
    ];
    return () => offs.forEach((f) => f());
  }, [adapter, running]);

  async function finish() {
    setRunning(false);
    await adapter.bluetooth.disconnect();
    await adapter.serial.disconnect();
    await adapter.simulation.disconnect();
    setStep("after");
  }

  if (step === "before") {
    return (
      <div className="space-y-4">
        <PageTitle title="운동하기 전, 지금 내 마음은 어떤가요?" />
        <EmotionGate phase="before" title="줄넘기 전 마음" confirmLabel="줄넘기 준비" onDone={(m) => { setBefore(m); setStep("work"); }} />
      </div>
    );
  }

  if (step === "after") {
    return (
      <EmotionGate
        phase="after"
        title="운동하고 나니 기분이 어떻게 달라졌나요?"
        confirmLabel="결과 저장"
        onDone={async (mood, n) => {
          setNote(n);
          const saved = await saveSession({
            exerciseId: "jump-rope",
            exerciseName: "줄넘기",
            exerciseType: "cardio",
            startTime: new Date(Date.now() - seconds * 1000).toISOString(),
            endTime: new Date().toISOString(),
            durationSec: seconds,
            count,
            score: count,
            accuracy: 100,
            beforeEmotion: before,
            afterEmotion: mood,
            afterNote: n,
            source: mode === "sim" ? "simulation" : mode === "idle" ? "manual" : "microbit",
            extra: { maxStreak, rpm },
          });
          setResult({ badges: saved.newBadges, pb: saved.isPersonalBest });
          setStep("done");
        }}
      />
    );
  }

  if (step === "done" && result) {
    return (
      <WorkoutResult
        name="줄넘기"
        count={count}
        durationSec={seconds}
        isPersonalBest={result.pb}
        badges={result.badges}
        afterNote={note}
        onAgain={() => {
          setCount(0);
          setSeconds(0);
          setStep("before");
          setResult(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle kicker="줄넘기 측정" title={user?.displayName ?? "나"} sub="Micro:bit 센서 또는 시뮬레이션으로 횟수를 세요. 영상은 저장하지 않아요." />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="hud flex min-h-[240px] flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-white/70">현재 줄넘기 횟수</p>
          <p className="mt-2 text-6xl font-semibold tabular-nums leading-none">{count}</p>
          <p className="mt-2 text-sm text-white/70">목표 100회</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Card>
            <p className="text-xs text-[var(--muted)]">사용자 ID</p>
            <p className="mt-1 font-semibold">{user?.displayName ?? "학생"}</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--muted)]">운동 시간</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatTime(seconds)}</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--muted)]">정확도 / 연속</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{maxStreak}회</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--muted)]">측정 상태</p>
            <p className="mt-1 text-sm">{running ? `${rpm} RPM` : "대기"}</p>
          </Card>
        </div>
      </div>
      <p className="text-sm text-[var(--muted)]">{status}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          onClick={async () => {
            try {
              await adapter.bluetooth.connect();
              setMode("bt");
              setRunning(true);
              setStatus("Micro:bit Bluetooth 연결됨. 점프하면 횟수가 올라가요.");
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "연결 실패");
            }
          }}
        >
          Micro:bit 연결 (Bluetooth)
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await adapter.serial.connect();
              setMode("serial");
              setRunning(true);
              setStatus("시리얼 연결됨.");
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "연결 실패");
            }
          }}
        >
          Micro:bit 연결 (Serial)
        </Button>
        <Button
          variant="soft"
          onClick={async () => {
            await adapter.simulation.connect();
            setMode("sim");
            setRunning(true);
            setStatus("시뮬레이션 중. 스페이스 또는 화면 탭으로도 횟수를 셀 수 있어요.");
          }}
        >
          시뮬레이션 시작
        </Button>
        <Button variant="ghost" onClick={() => adapter.simulation.tap()}>
          탭해서 +1
        </Button>
      </div>
      <label className="block text-[var(--font-size-300)] font-semibold">
        시뮬레이션 속도 {pace} RPM
        <input type="range" min={50} max={120} value={pace} onChange={(e) => setPace(Number(e.target.value))} className="w-full" />
      </label>
      <BtnRow>
        <Button variant="ghost" onClick={() => setRunning((v) => !v)}>
          {running ? "일시정지" : "계속"}
        </Button>
        <Button variant="danger" onClick={() => void finish()}>
          운동 종료
        </Button>
      </BtnRow>
      <Card>
        <p className="font-semibold">MakeCode 예시 (UART로 JUMP 전송)</p>
        <pre className="code mt-[var(--space-100)]">{MICROBIT_MAKECODE}</pre>
      </Card>
    </div>
  );
}
