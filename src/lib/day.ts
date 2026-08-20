/**
 * 날짜를 «그 기기의 하루» 로 다룬다.
 *
 * `toISOString()` 은 UTC 라 한국에서 밤 9시 이후에 쓴 일지가 **다음 날로 넘어간다.**
 * 일지는 아이가 «오늘» 이라고 느끼는 날에 붙어야 하므로 로컬 시각으로 만든다.
 */

/** Date → "YYYY-MM-DD" (로컬 기준) */
export function dayKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO 문자열(기록 시각) → 그 기록이 속한 날 */
export function dayOf(iso: string) {
  return dayKey(new Date(iso));
}

/** "YYYY-MM-DD" → Date (그 날 0시) */
export function fromDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-08-20" → "8월 20일 (수)" */
export function labelKo(key: string) {
  const d = fromDayKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]})`;
}

/**
 * 달력 한 판에 그릴 날짜들.
 * 앞뒤로 빈 칸을 채워 **일요일에서 시작하는 6주 격자**를 만든다 — 달마다 높이가 들쭉날쭉하면
 * 누를 자리가 흔들려서 아이가 헷갈린다.
 */
export function monthGrid(year: number, month0: number) {
  const first = new Date(year, month0, 1);
  const start = new Date(year, month0, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { key: dayKey(d), date: d, inMonth: d.getMonth() === month0 };
  });
}
