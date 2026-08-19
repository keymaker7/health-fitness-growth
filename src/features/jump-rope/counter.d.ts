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

export class Session {
  constructor(cfg?: unknown);
  update(observations: Observation[], now: number): void;
  snapshot(now: number): Snapshot;
  reset(now: number): void;
  hardReset(now: number): void;
}
