import type { FitnessComponentId, FitnessProfile, PapsGrade, PapsRecord, User } from "@/types/models";
import {
  DEMO_USER_ID,
  countStore,
  putAchievement,
  putPaps,
  putProfile,
  putSession,
  putSettings,
  putUser,
} from "@/lib/storage";
import { addDays, nowIso, startOfDay } from "@/lib/utils";

const HEALTH: FitnessComponentId[] = ["cardio", "strength", "endurance", "flexibility", "body-composition"];
const SPORT: FitnessComponentId[] = ["power", "agility", "balance", "coordination", "reaction"];

export async function seedIfNeeded() {
  const n = await countStore("users");
  if (n > 0) return;

  const user: User = {
    id: DEMO_USER_ID,
    // 실명을 기본값으로 두지 않는다. 화면과 내보내기에 그대로 나가는 값이라
    // 처음 켰을 때부터 학년-반-번호여야 한다.
    displayName: "5-3-12",
    grade: 5,
    className: "3반",
    createdAt: nowIso(),
  };
  await putUser(user);

  const components = {} as Record<FitnessComponentId, PapsGrade>;
  const grades: Record<FitnessComponentId, PapsGrade> = {
    cardio: 2,
    strength: 3,
    endurance: 3,
    flexibility: 4,
    "body-composition": 2,
    power: 3,
    agility: 3,
    balance: 3,
    coordination: 3,
    reaction: 3,
  };
  for (const id of [...HEALTH, ...SPORT]) components[id] = grades[id];

  const profile: FitnessProfile = {
    userId: DEMO_USER_ID,
    updatedAt: nowIso(),
    components,
    notes: "모의 데이터입니다. 수업에서 측정한 값으로 바꿔 쓸 수 있어요.",
  };
  await putProfile(profile);

  const paps: PapsRecord[] = [
    { id: "paps-pacer", userId: DEMO_USER_ID, measuredAt: "2026-03-12T02:00:00.000Z", eventId: "pacer", value: 72, unit: "회", grade: 2 },
    { id: "paps-sit", userId: DEMO_USER_ID, measuredAt: "2026-03-12T02:10:00.000Z", eventId: "sit-and-reach", value: 1.2, unit: "cm", grade: 4 },
    { id: "paps-curl", userId: DEMO_USER_ID, measuredAt: "2026-03-12T02:20:00.000Z", eventId: "curl-up", value: 28, unit: "회", grade: 3 },
    { id: "paps-grip", userId: DEMO_USER_ID, measuredAt: "2026-03-12T02:30:00.000Z", eventId: "grip", value: 18.4, unit: "kg", grade: 3 },
    { id: "paps-jump", userId: DEMO_USER_ID, measuredAt: "2026-03-12T02:40:00.000Z", eventId: "standing-long-jump", value: 138, unit: "cm", grade: 3 },
    { id: "paps-bmi", userId: DEMO_USER_ID, measuredAt: "2026-03-12T02:50:00.000Z", eventId: "bmi", value: 17.8, unit: "kg/m²", grade: 2 },
  ];
  for (const r of paps) await putPaps(r);

  const ropeCounts = [72, 84, 97, 103, 132];
  const today = startOfDay(new Date());
  for (let i = 0; i < ropeCounts.length; i++) {
    const day = addDays(today, -(ropeCounts.length - 1 - i));
    const start = new Date(day);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 150000);
    await putSession({
      id: `seed-rope-${i}`,
      userId: DEMO_USER_ID,
      exerciseId: "jump-rope",
      exerciseName: "줄넘기",
      exerciseType: "cardio",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSec: 150,
      count: ropeCounts[i],
      score: ropeCounts[i],
      accuracy: 100,
      beforeEmotion: i === 0 ? "worried" : "calm",
      afterEmotion: "happy",
      afterNote: i === ropeCounts.length - 1 ? "처음에는 힘들었지만 운동하고 나니 기분이 좋아졌다." : undefined,
      source: "simulation",
    });
  }

  const squatStart = addDays(today, -1);
  squatStart.setHours(11, 0, 0, 0);
  await putSession({
    id: "seed-squat",
    userId: DEMO_USER_ID,
    exerciseId: "squat",
    exerciseName: "스쿼트",
    exerciseType: "strength",
    startTime: squatStart.toISOString(),
    endTime: new Date(squatStart.getTime() + 240000).toISOString(),
    durationSec: 240,
    count: 30,
    score: 30,
    accuracy: 88,
    beforeEmotion: "tired",
    afterEmotion: "proud",
    source: "game",
  });

  await putSettings({
    beforeReflectUrl: "",
    afterReflectUrl: "",
    studentName: "5-3-12",
  });

  await putAchievement({
    id: "ach-first",
    userId: DEMO_USER_ID,
    badgeId: "first-workout",
    unlockedAt: addDays(today, -4).toISOString(),
  });
  await putAchievement({
    id: "ach-rope",
    userId: DEMO_USER_ID,
    badgeId: "rope-100",
    unlockedAt: today.toISOString(),
  });
  await putAchievement({
    id: "ach-pb",
    userId: DEMO_USER_ID,
    badgeId: "personal-best",
    unlockedAt: today.toISOString(),
  });
  await putAchievement({
    id: "ach-squat",
    userId: DEMO_USER_ID,
    badgeId: "squat-master",
    unlockedAt: addDays(today, -1).toISOString(),
  });
}
