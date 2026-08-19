/**
 * beep.js 는 셔틀런 앱에서 그대로 옮겨온 신호음 재생기다.
 * 오디오 시계에 미리 예약하는 방식이라 소리가 밀리지 않는다. 손대지 않는다.
 */

import type { ScheduleEntry } from "./paps";

export interface BeepState {
  running: boolean;
  counting?: boolean;
  elapsedSec?: number;
  lap?: number;
  nextLap?: number | null;
  level?: number | null;
  levelLap?: number | null;
  secToNext?: number | null;
  intervalSec?: number | null;
}

export interface BeepHandlers {
  onBeep?: (entry: ScheduleEntry) => void;
  onCountdown?: (n: number) => void;
  onStart?: () => void;
  onTick?: (state: BeepState) => void;
  onFinish?: () => void;
}

export class BeepPlayer {
  constructor(o?: BeepHandlers);
  running: boolean;
  unlock(): Promise<boolean>;
  start(schedule: ScheduleEntry[], opts?: { countdownSec?: number }): Promise<void>;
  state(): BeepState;
  stop(): void;
  blip(kind?: "ok" | "warn" | "end"): void;
}
