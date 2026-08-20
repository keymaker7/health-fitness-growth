/**
 * roster.js 는 셔틀런 앱(keymaker7/shuttlerun-paps)에서 그대로 옮겨온 명단·조 편성 코드다.
 */

import type { Mark, Runner } from "./paps";

export interface Student {
  name: string;
  sex: "male" | "female" | null;
}

export interface RosterRow {
  index: number;
  name: string;
  sex: "male" | "female" | null;
  lane: number | null;
  laps: number | null;
  done: boolean;
  marks: Mark[];
  grade: number | null;
}

export function parseNames(text: string): Student[];

export class Roster {
  constructor(o?: {
    students?: Student[];
    gradeKey?: string;
    lanes?: number;
    records?: Record<string, unknown>;
    heat?: Array<number | null>;
  });
  students: Student[];
  gradeKey: string;
  lanes: number;
  records: Record<string, Runner>;
  heat: Array<number | null>;
  readonly count: number;
  readonly heatFinished: boolean;
  readonly allDone: boolean;
  readonly remaining: number;
  nameOf(i: number): string;
  sexOf(i: number): "male" | "female" | null;
  runnerOf(i: number): Runner;
  isDone(i: number): boolean;
  nextHeat(): Array<number | null>;
  assign(lane: number, studentIndex: number): boolean;
  heatRunners(): Array<Runner | null>;
  rows(): RosterRow[];
  csv(): string;
  setStudents(students: Student[], gradeKey?: string, lanes?: number): void;
  clearRecords(): void;
  toJSON(): unknown;
  static fromJSON(o: unknown): Roster;
}
