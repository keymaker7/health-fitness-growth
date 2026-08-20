// 학급 명단 + 조(組) 편성 — 측정 규정(paps.js)이나 카메라(vision.js)와 분리해 둔다.
//
// 셔틀런은 멀리뛰기와 운영이 다르다. 한 명씩 세 번 재는 게 아니라,
// 여러 명이 레인에 서서 한 번에 뛰고 각자 한 번의 기록만 남는다.
// 그래서 여기서 다루는 건 "누가 몇 번 레인에 서 있는가"와 "아직 안 뛴 아이가 누구인가"이다.

import { Runner, gradeOf } from './paps.js';

/** "김하늘 남", "김하늘,여", "1. 김하늘" 같은 줄을 이름과 성별로 가른다 */
export function parseNames(text) {
  return String(text || '')
    .split(/[\n;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(line => {
      const cleaned = line.replace(/^\d+[.)\s]+/, '').trim();          // "1. 김하늘" → "김하늘"
      const m = cleaned.match(/^(.*?)[\s,\t]+(남|여|남자|여자|m|f|male|female)$/i);
      if (m) {
        const s = m[2].toLowerCase();
        return { name: m[1].trim(), sex: /^(여|여자|f|female)$/.test(s) ? 'female' : 'male' };
      }
      return { name: cleaned, sex: null };
    })
    .filter(s => s.name);
}

export class Roster {
  /**
   * @param {object} o
   *   students  [{name, sex}]
   *   gradeKey  '초5' 같은 학년 (등급 산출과 거리 결정에 쓴다)
   *   lanes     한 번에 뛰는 인원 (= 콘으로 나눈 레인 수)
   */
  constructor(o = {}) {
    this.students = (o.students || []).map(s => (typeof s === 'string' ? { name: s, sex: null } : s));
    this.gradeKey = o.gradeKey || '초6';
    this.lanes = o.lanes || 4;
    this.records = {};                 // {학생번호: Runner 직렬화}
    for (const [k, v] of Object.entries(o.records || {})) this.records[k] = Runner.fromJSON(v);
    this.heat = o.heat || [];          // 지금 레인에 서 있는 학생 번호 (레인 순서대로, 빈 레인은 null)
  }

  get count() { return this.students.length; }
  nameOf(i) { return this.students[i]?.name ?? `${i + 1}번`; }
  sexOf(i) { return this.students[i]?.sex ?? null; }

  runnerOf(i) {
    if (!this.records[i]) this.records[i] = new Runner();
    return this.records[i];
  }

  /** 이 학생이 이미 기록을 마쳤는가 */
  isDone(i) { return !!this.records[i]?.done; }

  /** 아직 안 뛴 학생들로 다음 조를 채운다. 이미 뛴 아이는 다시 부르지 않는다. */
  nextHeat() {
    const waiting = [];
    for (let i = 0; i < this.count; i++) if (!this.isDone(i)) waiting.push(i);
    this.heat = Array.from({ length: this.lanes }, (_, k) => waiting[k] ?? null);
    return this.heat;
  }

  /** 특정 레인에 특정 학생을 세운다 (교사가 손으로 바꿀 때) */
  assign(lane, studentIndex) {
    if (lane < 0 || lane >= this.lanes) return false;
    while (this.heat.length < this.lanes) this.heat.push(null);
    // 같은 아이가 두 레인에 서 있지 않도록
    this.heat = this.heat.map(v => (v === studentIndex ? null : v));
    this.heat[lane] = studentIndex;
    return true;
  }

  /** 지금 조의 레인별 Runner (빈 레인은 null) */
  heatRunners() {
    return Array.from({ length: this.lanes }, (_, k) => {
      const i = this.heat[k];
      return i === null || i === undefined ? null : this.runnerOf(i);
    });
  }

  /** 조 전체가 끝났는가 (레인에 선 아이가 모두 종료) */
  get heatFinished() {
    const rs = this.heatRunners().filter(Boolean);
    return rs.length > 0 && rs.every(r => r.done);
  }

  get allDone() {
    for (let i = 0; i < this.count; i++) if (!this.isDone(i)) return false;
    return this.count > 0;
  }

  get remaining() {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (!this.isDone(i)) n++;
    return n;
  }

  /** 표 그리기용 */
  rows() {
    return this.students.map((s, i) => {
      const r = this.records[i];
      // 아직 한 번도 안 뛴 아이는 0이 아니라 빈칸이어야 한다 (0회로 기록된 것처럼 보이면 안 된다)
      const laps = r && (r.marks.length || r.done) ? r.record : null;
      return {
        index: i,
        name: s.name,
        sex: s.sex,
        lane: this.heat.indexOf(i) >= 0 ? this.heat.indexOf(i) + 1 : null,
        laps,
        done: !!r?.done,
        marks: r?.marks ?? [],
        grade: r?.done && s.sex ? gradeOf(this.gradeKey, s.sex, laps) : null,
      };
    });
  }

  /** 구글 시트에 그대로 붙여넣는 표 */
  csv() {
    // 「번호」 칸에는 실명이 아니라 학년-반-번호가 들어간다 (명단 입력 안내와 같은 원칙)
    const head = ['순서', '번호', '성별', '왕복수', '등급(참고)', '경고(△)', '기록지'];
    const lines = this.rows().map(r => [
      r.index + 1,
      r.name,
      r.sex === 'female' ? '여' : r.sex === 'male' ? '남' : '',
      r.laps ?? '',
      r.grade ?? '',
      r.marks.filter(m => m.mark === '△').length,
      r.marks.map(m => m.mark).join(''),
    ].join(','));
    return [head.join(','), ...lines].join('\n');
  }

  setStudents(students, gradeKey = this.gradeKey, lanes = this.lanes) {
    this.students = students;
    this.gradeKey = gradeKey;
    this.lanes = lanes;
    this.records = {};
    this.heat = [];
  }

  clearRecords() { this.records = {}; this.heat = []; }

  toJSON() {
    const records = {};
    for (const [k, v] of Object.entries(this.records)) records[k] = v.toJSON();
    return { students: this.students, gradeKey: this.gradeKey, lanes: this.lanes, records, heat: this.heat };
  }
  static fromJSON(o) { return new Roster(o || {}); }
}
