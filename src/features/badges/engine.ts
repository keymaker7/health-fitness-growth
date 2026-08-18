import type { Achievement, WorkoutSession } from "@/types/models";
import { BADGES } from "@/lib/catalog";
import { isSameDay, startOfDay, uid } from "@/lib/utils";

export function uniqueWorkoutDays(sessions: WorkoutSession[]) {
  const days = new Set(sessions.map((s) => startOfDay(new Date(s.startTime)).getTime()));
  return [...days].sort((a, b) => b - a);
}

export function currentStreak(sessions: WorkoutSession[], today = new Date()) {
  const days = uniqueWorkoutDays(sessions);
  if (days.length === 0) return 0;
  const t = startOfDay(today).getTime();
  const dayMs = 86400000;
  let cursor = days.includes(t) ? t : t - dayMs;
  if (!days.includes(cursor)) return 0;
  let n = 0;
  while (days.includes(cursor)) {
    n += 1;
    cursor -= dayMs;
  }
  return n;
}

export function personalBest(sessions: WorkoutSession[], exerciseId: string) {
  const list = sessions.filter((s) => s.exerciseId === exerciseId);
  if (list.length === 0) return 0;
  return Math.max(...list.map((s) => s.count));
}

export function evaluateBadges(
  userId: string,
  sessions: WorkoutSession[],
  already: Achievement[],
  latest: WorkoutSession,
): Achievement[] {
  const unlocked = new Set(already.map((a) => a.badgeId));
  const add: Achievement[] = [];
  const mark = (badgeId: string) => {
    if (unlocked.has(badgeId)) return;
    if (!BADGES.some((b) => b.id === badgeId)) return;
    unlocked.add(badgeId);
    add.push({ id: uid("ach"), userId, badgeId, unlockedAt: latest.endTime });
  };

  if (sessions.length + 1 >= 1) mark("first-workout");
  const all = [latest, ...sessions];
  const streak = currentStreak(all, new Date(latest.endTime));
  if (streak >= 3) mark("streak-3");
  if (streak >= 7) mark("streak-7");

  const ropeSession = all.filter((s) => s.exerciseId === "jump-rope");
  if (latest.exerciseId === "jump-rope" && latest.count >= 100) mark("rope-100");
  if (ropeSession.reduce((a, s) => a + s.count, 0) >= 500) mark("rope-500");

  if (latest.exerciseId === "squat" && latest.count >= 30) mark("squat-master");

  if (all.filter((s) => s.exerciseType === "cardio").length >= 5) mark("cardio-growth");
  if (all.filter((s) => s.exerciseId.includes("stretch") || s.exerciseType === "flexibility").length >= 5) {
    mark("flex-growth");
  }
  if (all.length >= 10) mark("steady-growth");

  const prevBest = personalBest(sessions, latest.exerciseId);
  if (latest.count > 0 && latest.count > prevBest) mark("personal-best");

  return add;
}

export function minutesThisWeek(sessions: WorkoutSession[], today = new Date()) {
  const start = startOfDay(today);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return Math.round(
    sessions
      .filter((s) => new Date(s.startTime) >= start)
      .reduce((a, s) => a + s.durationSec, 0) / 60,
  );
}

export function todaySessions(sessions: WorkoutSession[], today = new Date()) {
  return sessions.filter((s) => isSameDay(s.startTime, today));
}
