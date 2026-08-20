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

/** 앉음·일어섬이 바뀌는 순간에만 나오는 메시지 (micro:bit 판과 같은 모양) */
export interface SquatMessage {
  count: number;
  pitch: number;
  state: "UP" | "DOWN";
  depth: number;
}

/**
 * 한 사람의 스쿼트 카운터. 여러 명·손들기 준비가 필요 없는 화면(게임 등)은
 * SquatSession 대신 이것을 쓴다 — 프레임마다 신호를 먹이면 된다.
 */
export class SquatCounter {
  constructor(cfg?: unknown);
  count: number;
  dropRatio: number;
  kneeAngle: number | null;
  legsVisible: boolean;
  lastRepS: number | null;
  /** @returns 상태가 바뀐 순간에만 메시지, 그 외에는 null */
  update(sig: SquatSignals, now: number): SquatMessage | null;
  /** 기준(서 있는 자세)을 다시 잡는다 */
  recapture(): void;
  reset(): void;
}

export class SquatSession {
  constructor(cfg?: unknown);
  update(obs: SquatObservation[], now: number): SquatUpdate;
  reset(): void;
  state: string;
}
