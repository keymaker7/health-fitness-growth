/**
 * vision.js 는 셔틀런 앱(keymaker7/shuttlerun-paps)에서 그대로 옮겨온 감지 코드다.
 * 배경 학습·레인별 위치 추적·선 통과 판정이 모두 들어 있어 손대지 않는다.
 */

export interface LaneBand {
  y0: number;
  y1: number;
}

export interface LaneVerdict {
  reached: boolean;
  x: number | null;
  known: boolean;
}

export function laneBands(count: number, top?: number, bottom?: number): LaneBand[];
export function updateBackground(bg: Float32Array, frame: Uint8ClampedArray, alpha?: number): Float32Array;
export function foregroundStats(
  frame: Uint8ClampedArray,
  bg: Float32Array,
  w: number,
  h: number,
  band: LaneBand,
  thresh?: number,
  minPixels?: number,
): { x: number; count: number } | null;
export function reached(x: number | null, lineX: number, side: "left" | "right"): boolean;
export function targetSideOf(lap: number, startSide?: "left" | "right"): "left" | "right";

export class LaneTracker {
  constructor(o?: { smooth?: number; holdMs?: number });
  x: number | null;
  lastSeenMs: number;
  count: number;
  update(stats: { x: number; count: number } | null, nowMs: number): number | null;
  positionAt(nowMs: number): number | null;
  reset(): void;
}

export class LaneVision {
  constructor(o?: {
    w?: number;
    h?: number;
    lanes?: LaneBand[];
    lineLeft?: number;
    lineRight?: number;
    thresh?: number;
    minPixels?: number;
    alpha?: number;
  });
  w: number;
  h: number;
  lanes: LaneBand[];
  lineLeft: number;
  lineRight: number;
  trackers: LaneTracker[];
  setLanes(lanes: LaneBand[]): void;
  resetBackground(): void;
  push(frame: Uint8ClampedArray, nowMs: number): Array<number | null>;
  judge(side: "left" | "right", nowMs: number): LaneVerdict[];
}
