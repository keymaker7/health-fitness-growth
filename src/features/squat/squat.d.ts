/**
 * squat.js 는 스쿼트 카메라 앱(keymaker7/squat-cam)에서 그대로 옮겨온 판정 코드다.
 * 얕은 까딱임·앉아 쉬기·다리 잘림·겹침 처리가 모두 여기 들어 있어 손대지 않았다.
 *
 * 시간(now)은 초 단위다.
 */

export interface Point {
  x: number;
  y: number;
  v?: number;
}

export interface SquatSignals {
  valid: boolean;
  centerX?: number;
  hipY?: number;
  bodyHeight?: number;
  [k: string]: unknown;
}

export interface SquatObservation {
  pts: Point[];
  sig: SquatSignals;
}

export interface SquatPerson {
  id: number;
  established: boolean;
  ready: boolean;
  heldFrames: number;
  count: number;
  dropRatio: number;
  legsVisible: boolean;
  baselineReady: boolean;
  sig: SquatSignals;
}

export interface SquatUpdate {
  state: string;
  started: boolean;
  countdownLeft: number | null;
  messages: unknown[];
  people: SquatPerson[];
}

export const SQUAT_CONFIG: Record<string, number | boolean>;
export const LM: Record<string, number>;
export const SESSION_STATES: { WAITING: string; COUNTDOWN: string; RUNNING: string };

export function extractSquat(pts: Point[], cfg?: unknown): SquatSignals;
export function angleAt(a: Point, b: Point, c: Point): number;

export class SquatCounter {
  constructor(cfg?: unknown);
  count: number;
  reset(): void;
}

export class SquatSession {
  constructor(cfg?: unknown);
  update(obs: SquatObservation[], now: number): SquatUpdate;
  reset(): void;
  state: string;
}
