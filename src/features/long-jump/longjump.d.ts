/**
 * longjump.js 는 제자리멀리뛰기 앱(keymaker7/longjump-measure)에서 그대로 옮겨온 측정 코드다.
 * 바닥 좌표 보정(호모그래피), 착지 창 선택, 파울 판정이 모두 들어 있어 손대지 않는다.
 */

export interface Point {
  x: number;
  y: number;
  v?: number;
}

export interface Attempt {
  at: number;
  distanceCm: number | null;
  foul?: boolean;
  implausible?: boolean;
  warning?: string | null;
  error?: string;
  landedAt?: number;
}

export interface LJObservation {
  pts: Point[];
  sig?: unknown;
}

export interface LJSnapshot {
  state: string;
  calibrated: boolean;
  setReady: boolean;
  foulAtSet: boolean;
  result: Attempt | null;
  attempts: Attempt[];
  best: number | null;
  warning: string | null;
}

export const LJ_CONFIG: Record<string, number | boolean>;
export const LJ_STATES: { WAIT: string; SET: string; FLIGHT: string; RESULT: string };
export const LJ_LM: Record<string, number>;
export const LJ_MAX_PLAUSIBLE_CM: number;
export const LJ_MIN_PLAUSIBLE_CM: number;

export function plausibleDistance(cm: number): boolean;
export function extractFoot(pts: Point[], cfg?: unknown): unknown;

export interface RulerMark extends Point {
  distCm: number;
}

export class Calibration {
  constructor(kind: string, data?: unknown);
  readonly ok: boolean;
  kind: string;
  error?: string;
  distMin?: number;
  distMax?: number;
  static fromRect(imgPts: Point[], widthCm: number, depthCm: number): Calibration;
  static fromTwoPoints(p1: Point, p2: Point, distCm: number): Calibration;
  static fromRuler(marks: RulerMark[]): Calibration;
  toWorld(x: number, y: number): { x: number; y: number } | null;
  toImage(X: number, Y: number): { x: number; y: number } | null;
  resolutionPxPerCm(): number | null;
  outOfRange(world: { x: number; y: number } | null): boolean;
}

export class LongJumpSession {
  constructor(cfg?: unknown, calibration?: Calibration | null);
  state: string;
  attempts: Attempt[];
  result: Attempt | null;
  update(observations: LJObservation[], now: number): LJSnapshot;
  snapshot(): LJSnapshot;
  reset(): void;
  setCalibration(cal: Calibration): void;
  setConfig(patch: Record<string, unknown>): unknown;
}
