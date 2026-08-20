/**
 * paps.js 는 셔틀런 앱(keymaker7/shuttlerun-paps)에서 그대로 옮겨온 규정 코드다.
 * 숫자와 규칙이 교육부 PAPS 측정 매뉴얼에서 온 것이라 손대지 않는다.
 */

export interface ScheduleEntry {
  lap: number;
  level: number;
  levelLap: number;
  atMs: number;
  intervalMs: number;
  levelStart: boolean;
}

export interface Mark {
  lap: number;
  mark: "○" | "△" | "X";
}

export const LAPS_15M: number[];
export const LAPS_20M: number[];
export const GRADE_TABLE: Record<string, { male: number[]; female: number[] }>;
export const GRADE_VERIFIED: boolean;
export const GRADE_LABEL: Record<number, string>;

export function speedOf(level: number): number;
export function intervalMsOf(level: number, distanceM: number): number;
export function buildSchedule(distanceM?: number): ScheduleEntry[];
export function maxLaps(distanceM?: number): number;
export function gradeOf(gradeKey: string, sex: string | null, laps: number): number | null;
export function toNextGrade(gradeKey: string, sex: string | null, laps: number): number | null;
export function distanceForGrade(gradeKey: string): number;

export class Runner {
  constructor(o?: unknown);
  laps: number;
  warnings: number;
  done: boolean;
  finalLaps: number | null;
  marks: Mark[];
  readonly running: boolean;
  readonly record: number;
  onBeep(lap: number, reached: boolean): "ok" | "warn" | "end" | "ignored";
  stop(): boolean;
  undo(): boolean;
  toJSON(): unknown;
  static fromJSON(o: unknown): Runner;
}
