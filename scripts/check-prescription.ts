import type { FitnessProfile, WorkoutSession } from "../src/types/models";
import { buildPrescription } from "../src/lib/prescription";

const today = new Date("2026-08-18T18:00:00+09:00");

function profile(grades: Partial<FitnessProfile["components"]>): FitnessProfile {
  return {
    userId: "u",
    updatedAt: today.toISOString(),
    components: {
      cardio: 3,
      strength: 3,
      endurance: 3,
      flexibility: 3,
      "body-composition": 3,
      power: 3,
      agility: 3,
      balance: 3,
      coordination: 3,
      reaction: 3,
      ...grades,
    },
  } as FitnessProfile;
}

function session(daysAgo: number, exerciseId: string, count: number, min: number, extra: Partial<WorkoutSession> = {}): WorkoutSession {
  const end = new Date(today.getTime() - daysAgo * 86400000);
  const start = new Date(end.getTime() - min * 60000);
  return {
    id: `s${daysAgo}-${exerciseId}`,
    userId: "u",
    exerciseId,
    exerciseName: exerciseId,
    exerciseType: "cardio",
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationSec: min * 60,
    count,
    score: count,
    accuracy: 0,
    source: "manual",
    ...extra,
  };
}

function show(title: string, p: ReturnType<typeof buildPrescription>) {
  console.log(`\n=== ${title} ===`);
  console.log(p.headline);
  console.log(`주 ${p.weeklyRate}회 · 주 ${p.weeklyMinutes}분 · 하루 ${p.dailyMinutes}분(${p.dailyTargetRatio}%) · 강도 ${p.intensity}`);
  console.log(`계획 주간 총량 ${p.plannedWeeklyMinutes}분 / 점증 상한 ${p.weeklyCapMinutes}분`);
  if (p.rampNote) console.log(`  ⚠ ${p.rampNote}`);
  for (const i of p.items) {
    console.log(`  - [${i.componentName}] ${i.exerciseName}: 주 ${i.timesPerWeek}회 × ${i.minutesPerSession}분, 목표 ${i.targetLabel}`);
    console.log(`    ${i.progression}`);
  }
}

// 1) 기록이 거의 없는 학생
show("기록 없음", buildPrescription(profile({ cardio: 4 }), [], today));

// 2) 꾸준히 하고 성장 중인 학생
const steady: WorkoutSession[] = [
  session(2, "jump-rope", 130, 4),
  session(5, "jump-rope", 125, 4),
  session(9, "jump-rope", 120, 4),
  session(12, "jump-rope", 110, 4),
  session(16, "squat", 28, 5),
  session(20, "squat", 25, 5),
  session(24, "jump-rope", 100, 4),
];
show("꾸준한 학생", buildPrescription(profile({ cardio: 4, strength: 5 }), steady, today));

// 3) 운동 뒤 지침이 많은 학생
const tired = steady.map((s, i) => ({ ...s, afterEmotion: i % 2 === 0 ? ("tired" as const) : ("calm" as const) }));
show("지친 학생", buildPrescription(profile({ cardio: 4, strength: 5 }), tired, today));

// 4) 자세 정확도가 낮은 학생
const sloppy = steady.map((s) => ({ ...s, accuracy: 78 }));
show("자세 부정확", buildPrescription(profile({ cardio: 4, strength: 5 }), sloppy, today));

// 5) 아주 활발한 학생
const active: WorkoutSession[] = Array.from({ length: 20 }, (_, i) =>
  session(i + 1, i % 2 === 0 ? "jump-rope" : "squat", 140 - i, 12),
);
show("매우 활발", buildPrescription(profile({ flexibility: 5, cardio: 2 }), active, today));
