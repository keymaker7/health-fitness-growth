/**
 * counter.js 는 줄넘기 카운터 앱(keymaker7/jumprope-counter)에서 그대로 옮겨온 판정 코드다.
 * 교실에서 검증된 로직이라 한 줄도 고치지 않았고, 쓰는 쪽을 위해 타입만 여기 붙인다.
 *
 * 시간(now)은 초 단위다. performance.now() / 1000 을 넣는다.
 */

export interface Point {
  x: number;
  y: number;
  v: number;
}

export interface Signals {
  [key: string]: number | boolean | null;
}

export interface Observation {
  sig: Signals;
  pts: Point[];
}

export interface SnapshotPerson {
  id: number;
  ready: boolean;
  state: string;
  count: number;
  present: boolean;
  hasBaseline: boolean;
  debug: unknown;
}

export interface Snapshot {
  session: string;
  countdown: number | null;
  banner: string | null;
  elapsed: number;
  totalCount: number;
  readyCount: number;
  presentCount: number;
  people: SnapshotPerson[];
}

export const CONFIG: Record<string, never> & { [k: string]: unknown };
export const LM: Record<string, number>;
export const SKELETON: [number, number][];
export const STATES: { WAITING: string; COUNTDOWN: string; RUNNING: string };

export function extractSignals(pts: Point[], cfg?: unknown): Signals;

/**
 * 한 사람의 상태. Session 이 안에서 만들고 이어 준다 —
 * 화면은 `session.persons` 로 읽기만 한다.
 */
export declare class PersonState {
  id: number;
  count: number;
  ready: boolean;
  /** 유령 인식이 아니라 실제 참가자로 인정된 사람 */
  stable: boolean;
  centerX: number;
  bodyHeight: number;
  pts: Point[] | null;
  present(now: number): boolean;
}

export class Session {
  constructor(cfg?: unknown);
  /** 지금 이어지고 있는 사람들 (사라진 사람은 잠시 남아 있다가 빠진다) */
  readonly persons: PersonState[];
  update(observations: Observation[], now: number): void;
  snapshot(now: number): Snapshot;
  reset(now: number): void;
  hardReset(now: number): void;
}
