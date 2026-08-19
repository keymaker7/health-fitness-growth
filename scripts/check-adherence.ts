import { buildAdherence, startOfWeek } from "../src/lib/adherence";
import type { Prescription } from "../src/lib/prescription";
import type { WorkoutSession } from "../src/types/models";

const item = (exerciseId: string, kind: "성장" | "유지", timesPerWeek: number) =>
  ({ exerciseId, exerciseName: exerciseId, componentId: "cardio", componentName: "심폐지구력",
     color: "#000", kind, timesPerWeek, minutesPerSession: 10, targetLabel: "", targetValue: null,
     howMuch: "", basis: "", progression: "", source: "", nonConsecutive: false }) as never;

const p = { items: [item("jump-rope", "성장", 3), item("squat", "성장", 2), item("run", "유지", 2)] } as unknown as Prescription;

const today = new Date("2026-08-20T10:00:00+09:00");
const monday = startOfWeek(today);
const at = (dayOffset: number, id: string): WorkoutSession => {
  const d = new Date(monday); d.setDate(d.getDate() + dayOffset); d.setHours(10, 0, 0, 0);
  return { id: `${id}-${dayOffset}`, userId: "u", exerciseId: id, exerciseName: id, exerciseType: "cardio",
    startTime: d.toISOString(), endTime: d.toISOString(), durationSec: 600, count: 10, score: 10,
    accuracy: 100, source: "manual" } as WorkoutSession;
};
const lastWeek = (id: string): WorkoutSession => {
  const d = new Date(monday); d.setDate(d.getDate() - 3);
  return { ...at(0, id), id: `old-${id}`, startTime: d.toISOString() };
};

let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `  기대 ${JSON.stringify(want)} / 실제 ${JSON.stringify(got)}`}`);
};

// 아무것도 안 함
let a = buildAdherence(p, [], today);
eq("기록 없으면 0%", a.rate, 0);
eq("  목표 합계는 성장 종목만 (3+2)", a.goalTotal, 5);

// 성장 종목 일부 수행
a = buildAdherence(p, [at(0, "jump-rope"), at(1, "jump-rope"), at(2, "squat")], today);
eq("3/5 하면 60%", a.rate, 60);
eq("  줄넘기 2/3", a.items[0].done, 2);
eq("  스쿼트 목표 미달", a.items[1].met, false);

// 유지 종목은 이행률에 안 들어감
a = buildAdherence(p, [at(0, "run"), at(1, "run")], today);
eq("유지 종목만 하면 이행률 0%", a.rate, 0);
eq("  그래도 유지 종목 횟수는 센다", a.items[2].done, 2);

// 지난주 기록은 안 셈
a = buildAdherence(p, [lastWeek("jump-rope")], today);
eq("지난주 기록은 이번 주에 안 센다", a.items[0].done, 0);

// 목표 초과해도 100% 상한
a = buildAdherence(p, [at(0,"jump-rope"),at(1,"jump-rope"),at(2,"jump-rope"),at(3,"jump-rope"),at(4,"squat"),at(5,"squat")], today);
eq("초과해도 100% 넘지 않음", a.rate, 100);
eq("  실제 횟수는 그대로 보여줌", a.items[0].done, 4);

// 같은 날 두 번 해도 날짜는 하나
a = buildAdherence(p, [at(0, "jump-rope"), at(0, "squat")], today);
eq("같은 날 두 종목이면 활동일 1일", a.activeDays, 1);

console.log(fail ? `\n${fail}건 실패` : "\n이행률 계산 10건 전부 통과");
process.exit(fail ? 1 : 0);
