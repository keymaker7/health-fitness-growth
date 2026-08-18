import type { WorkoutSession } from "@/types/models";
import { minutesThisWeek, todaySessions } from "@/features/badges/engine";
import { getGrowthProgress } from "@/lib/levels";

export const WEEKLY_GOAL = 5;

export function xpFromSessions(sessions: WorkoutSession[]) {
  return sessions.reduce((sum, s) => sum + 40 + Math.min(80, s.count), 0);
}

export function levelFromXp(xp: number) {
  return getGrowthProgress(xp).level;
}

export function xpIntoLevel(xp: number) {
  return getGrowthProgress(xp).xpInto;
}

export function weeklySessionCount(sessions: WorkoutSession[], today = new Date()) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  return sessions.filter((s) => new Date(s.startTime) >= start).length;
}

export function activitySummary(sessions: WorkoutSession[]) {
  const rank = getGrowthProgress(xpFromSessions(sessions));
  return {
    todayCount: todaySessions(sessions).length,
    weekCount: weeklySessionCount(sessions),
    weekMinutes: minutesThisWeek(sessions),
    xp: rank.xp,
    level: rank.level,
    title: rank.name,
    subtitle: rank.subtitle,
    xpInto: rank.xpInto,
    xpSpan: rank.xpSpan,
    xpToNext: rank.xpToNext,
    progress: rank.progress,
    maxed: rank.maxed,
  };
}

export const DIFFICULTY_KO: Record<string, string> = {
  easy: "쉬움",
  normal: "보통",
  challenge: "도전",
};
