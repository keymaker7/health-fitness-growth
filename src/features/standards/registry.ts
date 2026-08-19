import data from "@/data/standards.json";

export interface Standard {
  code: string;
  text: string;
  goal: string;
  activity: string;
  assessment: string;
  screens: string[];
}

export interface Curriculum {
  curriculum: string;
  source: string;
  gradeBand: string;
  domain: string;
  unit: string;
  standards: Standard[];
}

export const CURRICULUM = data as Curriculum;

export const STANDARDS = CURRICULUM.standards;

export function getStandard(code: string) {
  return STANDARDS.find((s) => s.code === code);
}

/**
 * 이 화면에 걸린 성취기준.
 * 화면 이름은 라우트 조각(`/measure` → "measure")을 쓴다.
 * 다른 학년·단원으로 바꿀 때는 standards.json만 갈아 끼우면 된다.
 */
export function standardsForScreen(screen: string) {
  return STANDARDS.filter((s) => s.screens.includes(screen));
}

/** 성취기준 코드를 화면에 쓰는 표기로 (`6체01-02` → `[6체01-02]`) */
export function label(code: string) {
  return `[${code}]`;
}
