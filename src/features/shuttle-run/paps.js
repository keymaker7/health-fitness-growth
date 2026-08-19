// PAPS 왕복오래달리기(셔틀런) 규정 엔진 — 화면도 카메라도 모르는 순수 계산만 둔다.
//
// 여기 있는 숫자와 규칙은 교육부 PAPS 측정 매뉴얼 원문에서 왔다.
//   가. 거리   초등학교 남·녀 15m / 중·고등학교 남·녀 20m
//   나. 측정   2) 신호음이 울리기 전까지 양 발이 선을 완전히 통과할 것
//             3) 이동 중 신호음이 울리면 그 지점에서 뒤로 돌아 뛰고 기록에 '△'
//             4) 3)은 처음 한 번만. 두 번째면 측정을 종료하고 'X' 직전 횟수를 기록
//
// 4)번이 이 파일이 존재하는 이유다. "못 따라가면 끝"이 아니라 경고 1회를 유예해야 하고,
// 그 한 줄이 아이의 기록을 통째로 바꾼다. 시중 음원·앱이 자주 틀리는 지점이라 규정만 따로 떼어 시험한다.

/** 단계별 왕복 수 — 한 단계가 약 1분이 되도록 정해져 있다 (15m용) */
export const LAPS_15M = [9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21];
/** 20m용 (중·고등학교) */
export const LAPS_20M = [7, 8, 8, 9, 9, 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16];

/** 단계별 달리기 속도(km/h). 1단계만 8.0이고 2단계부터 9.0에서 0.5씩 오른다. */
export function speedOf(level) {
  return level === 1 ? 8.0 : 8.5 + 0.5 * (level - 1);
}

/** 그 단계에서 한 번 왕복(편도 한 구간)에 주어지는 시간(ms) */
export function intervalMsOf(level, distanceM) {
  const mps = speedOf(level) * 1000 / 3600;
  return (distanceM / mps) * 1000;
}

/**
 * 신호음 전체 일정표를 미리 만들어 둔다.
 * 실행 중에 계산하지 않는 이유: 신호음은 한 번 어긋나면 기록이 통째로 틀어지므로,
 * 시작 시각 하나만 기준으로 모든 신호음의 절대 시각을 못 박아 둔다(누적 오차 0).
 *
 * @returns {Array<{lap:number, level:number, levelLap:number, atMs:number, intervalMs:number, levelStart:boolean}>}
 *   lap = 이 신호음까지 마쳐야 하는 왕복 번호(1부터). atMs = 시작 후 몇 ms에 울리는가.
 */
export function buildSchedule(distanceM = 15) {
  const perLevel = distanceM >= 20 ? LAPS_20M : LAPS_15M;
  const out = [];
  let t = 0;
  perLevel.forEach((n, i) => {
    const level = i + 1;
    const interval = intervalMsOf(level, distanceM);
    for (let k = 0; k < n; k++) {
      t += interval;
      out.push({
        lap: out.length + 1, level, levelLap: k + 1,
        atMs: Math.round(t), intervalMs: interval, levelStart: k === 0,
      });
    }
  });
  return out;
}

/** 그 종목의 최대 왕복 수 (15m는 323회, 20m는 247회) */
export function maxLaps(distanceM = 15) {
  return (distanceM >= 20 ? LAPS_20M : LAPS_15M).reduce((a, b) => a + b, 0);
}

// ── 한 학생의 진행 상태 ────────────────────────────────────────

/**
 * 신호음마다 "이 아이가 선을 통과했는가"만 넣으면 규정대로 상태가 굴러간다.
 * 판정이 카메라에서 오든 교사 손에서 오든 이 클래스는 구분하지 않는다 — 그래서 시험할 수 있다.
 */
export class Runner {
  constructor(o = {}) {
    this.laps = o.laps || 0;          // 지금까지 인정된 왕복 수
    this.warnings = o.warnings || 0;  // △ (미도달) 누적 — 2가 되면 종료
    this.done = o.done || false;
    this.finalLaps = o.finalLaps ?? null;
    this.marks = o.marks || [];       // [{lap, mark:'○'|'△'|'X'}] — 기록지 그대로
  }

  get running() { return !this.done; }

  /**
   * 신호음 한 번을 처리한다.
   * @param {number} lap      이번 신호음이 요구하는 왕복 번호
   * @param {boolean} reached 신호음 순간 선을 통과해 있었는가
   * @returns {'ok'|'warn'|'end'|'ignored'}
   */
  onBeep(lap, reached) {
    if (this.done) return 'ignored';

    if (reached) {
      this.laps = lap;
      this.marks.push({ lap, mark: '○' });
      return 'ok';
    }

    if (this.warnings === 0) {
      // 첫 미도달 — 그 지점에서 돌아 뛰게 하고 계속 진행한다. 이 횟수도 기록에는 남는다.
      this.warnings = 1;
      this.laps = lap;
      this.marks.push({ lap, mark: '△' });
      return 'warn';
    }

    // 두 번째 미도달 — 여기서 끝. 기록은 'X'의 직전 횟수다.
    this.warnings = 2;
    this.done = true;
    this.finalLaps = lap - 1;
    this.marks.push({ lap, mark: 'X' });
    return 'end';
  }

  /** 교사가 직접 중단시킬 때 (아이가 포기·부상) — 지금까지 인정된 횟수로 끝낸다 */
  stop() {
    if (this.done) return false;
    this.done = true;
    this.finalLaps = this.laps;
    return true;
  }

  /** 잘못 눌렀을 때 되돌리기 — 마지막 판정 한 건 취소 */
  undo() {
    const last = this.marks.pop();
    if (!last) return false;
    if (last.mark === 'X') { this.done = false; this.finalLaps = null; this.warnings = 1; }
    else if (last.mark === '△') { this.warnings = 0; }
    const prev = this.marks[this.marks.length - 1];
    this.laps = prev ? prev.lap : 0;
    return true;
  }

  /** 기록으로 확정된 횟수 (아직 뛰는 중이면 지금까지의 횟수) */
  get record() { return this.done ? this.finalLaps : this.laps; }

  toJSON() {
    return { laps: this.laps, warnings: this.warnings, done: this.done, finalLaps: this.finalLaps, marks: this.marks };
  }
  static fromJSON(o) { return new Runner(o || {}); }
}

// ── 등급 ────────────────────────────────────────────────────

/**
 * 학년·성별 등급 경계 (1등급 하한, 2등급 하한, 3등급 하한, 4등급 하한).
 *
 * ⚠️ 이 표는 아직 교육부 원문으로 검증되지 않았다 (출처: 공개 자료 정리본).
 *    등급이 틀리면 아이의 평가가 틀리므로, 검증 전까지 화면에 '참고값'으로만 띄운다.
 *    검증 담당: @Antman. 확인되면 이 표만 고치면 된다.
 */
export const GRADE_TABLE = {
  '초5': { male: [100, 73, 50, 29], female: [85, 63, 45, 23] },
  '초6': { male: [104, 78, 54, 32], female: [93, 69, 50, 25] },
};
export const GRADE_VERIFIED = false;

export const GRADE_LABEL = { 1: '1등급(아주 높음)', 2: '2등급(높음)', 3: '3등급(보통)', 4: '4등급(낮음)', 5: '5등급(아주 낮음)' };

/**
 * @returns {number|null} 1~5, 표가 없는 학년이면 null (모르면 모른다고 한다)
 */
export function gradeOf(gradeKey, sex, laps) {
  const row = GRADE_TABLE[gradeKey]?.[sex];
  if (!row || typeof laps !== 'number') return null;
  for (let i = 0; i < row.length; i++) if (laps >= row[i]) return i + 1;
  return 5;
}

/** 그 학년·성별에서 다음 등급까지 몇 회가 남았는가 (수업 중 동기 부여용, 1등급이면 null) */
export function toNextGrade(gradeKey, sex, laps) {
  const row = GRADE_TABLE[gradeKey]?.[sex];
  if (!row || typeof laps !== 'number') return null;
  const g = gradeOf(gradeKey, sex, laps);
  if (g === null || g === 1) return null;
  return row[g - 2] - laps;
}

/** 초등은 15m, 중·고는 20m — 학년을 고르면 거리가 따라온다 */
export function distanceForGrade(gradeKey) {
  return String(gradeKey).startsWith('초') ? 15 : 20;
}
