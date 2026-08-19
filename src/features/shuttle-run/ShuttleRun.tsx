"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { BeepPlayer } from "@/features/shuttle-run/beep.js";
import { Runner, buildSchedule, maxLaps } from "@/features/shuttle-run/paps.js";
import type { ScheduleEntry, Mark } from "@/features/shuttle-run/paps";
import type { BeepState } from "@/features/shuttle-run/beep";

/**
 * 앱 안에서 왕복오래달리기를 재는 화면.
 *
 * 신호음 일정과 판정 규칙은 셔틀런 앱의 beep.js·paps.js 를 그대로 쓴다.
 * 숫자가 교육부 매뉴얼에서 온 것이라 옮기면서 손대지 않았다.
 *
 * 카메라로 선 통과를 자동 판정하는 부분은 아직 옮기지 않았다.
 * 지금은 교사가 신호음에 맞춰 «도착»을 누른다 — 셔틀런 앱도 이 방식이 기본이다.
 */

export function ShuttleRun({ onCount }: { onCount?: (total: number) => void }) {
  const playerRef = useRef<InstanceType<typeof BeepPlayer> | null>(null);
  const runnerRef = useRef<InstanceType<typeof Runner> | null>(null);
  const reachedRef = useRef(false);

  const [distance, setDistance] = useState(15);
  const [state, setState] = useState<BeepState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [record, setRecord] = useState(0);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState("거리를 고르고 «시작»을 누르세요. 신호음이 3초 뒤 시작돼요.");

  const stop = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    const runner = new Runner();
    runnerRef.current = runner;
    reachedRef.current = false;
    setMarks([]);
    setRecord(0);
    setDone(false);

    const player = new BeepPlayer({
      onCountdown: (n: number) => {
        setCountdown(n);
        setStatus("출발선에 서세요.");
      },
      onStart: () => {
        setCountdown(null);
        setStatus("신호음에 맞춰 반대편 선까지 뛰세요.");
      },
      onBeep: (entry: ScheduleEntry) => {
        const r = runnerRef.current;
        if (!r || r.done) return;
        // 신호음이 울리는 그 순간 «선을 통과해 있었는가»로 판정한다.
        const result = r.onBeep(entry.lap, reachedRef.current);
        reachedRef.current = false;
        setMarks([...r.marks]);
        setRecord(r.record);
        if (result === "warn") {
          player.blip("warn");
          setStatus("△ 한 번 놓쳤어요. 그 자리에서 돌아 뛰세요. 다음에 또 놓치면 끝납니다.");
        } else if (result === "end") {
          player.blip("end");
          player.stop();
          setDone(true);
          setStatus(`측정 종료. 기록은 ${r.record}회입니다.`);
        }
      },
      onTick: (s: BeepState) => setState(s),
      onFinish: () => {
        const r = runnerRef.current;
        setDone(true);
        setStatus(`끝까지 완주했어요! 기록 ${r?.record ?? 0}회`);
      },
    });
    playerRef.current = player;

    try {
      await player.start(buildSchedule(distance), { countdownSec: 3 });
    } catch (e) {
      setStatus((e as Error).message);
    }
  }, [distance]);

  const running = !!state?.running && !done;
  const warned = marks.some((m) => m.mark === "△");

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">왕복오래달리기</Tag>
        <Tag>앱 안에서 바로</Tag>
        <Tag>{distance}m</Tag>
        {warned ? <Tag tone="warning">△ 1회</Tag> : null}
        {done ? <Tag tone="success">측정 종료</Tag> : null}
      </div>

      <div className="mt-[var(--space-200)] grid gap-[var(--space-150)] sm:grid-cols-3">
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">왕복</p>
          <p className="text-[var(--font-size-600)] font-bold text-[var(--brand-ink)]">{record}</p>
        </div>
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">단계</p>
          <p className="text-[var(--font-size-600)] font-bold">{state?.level ?? "-"}</p>
        </div>
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">다음 신호음</p>
          <p className="text-[var(--font-size-600)] font-bold">
            {countdown !== null ? countdown : state?.secToNext != null ? `${state.secToNext.toFixed(1)}s` : "-"}
          </p>
        </div>
      </div>

      {running ? (
        <button
          type="button"
          onClick={() => {
            reachedRef.current = true;
            playerRef.current?.blip("ok");
          }}
          className="tap mt-[var(--space-200)] w-full rounded-[var(--radius-btn)] bg-[var(--colorBrandBackground)] py-[var(--space-400)] text-[var(--font-size-500)] font-bold text-white transition hover:bg-[var(--colorBrandBackgroundHover)]"
        >
          {reachedRef.current ? "도착 ✓" : "반대편 선에 도착"}
        </button>
      ) : null}

      {marks.length ? (
        <p className="mt-[var(--space-150)] break-all text-[var(--font-size-300)]">
          기록지 <b>{marks.map((m) => m.mark).join("")}</b>
        </p>
      ) : null}

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">{status}</p>

      <BtnRow className="mt-[var(--space-200)]">
        {running ? (
          <Button
            variant="danger"
            onClick={() => {
              runnerRef.current?.stop();
              stop();
              setDone(true);
              setRecord(runnerRef.current?.record ?? 0);
              setStatus("교사가 중단했어요.");
            }}
          >
            중단
          </Button>
        ) : (
          <Button onClick={start}>{done ? "다시 측정" : "시작"}</Button>
        )}
        {!running ? (
          <label className="text-[var(--font-size-300)]">
            거리{" "}
            <select
              className="field inline-block w-auto"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
            >
              <option value={15}>15m (초등)</option>
              <option value={20}>20m (중·고)</option>
            </select>
          </label>
        ) : null}
        {done && record > 0 && onCount ? (
          <Button variant="soft" onClick={() => onCount(record)}>
            {record}회를 기록에 담기
          </Button>
        ) : null}
      </BtnRow>

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
        신호음 일정은 교육부 매뉴얼 그대로예요 (최대 {maxLaps(distance)}회). 신호음이 울리기 전에 반대편 선을 완전히 통과해야 인정됩니다.
        처음 한 번 놓치면 그 자리에서 돌아 뛰고, 두 번째로 놓치면 측정이 끝나요.
      </p>
    </Card>
  );
}
