import { currentStreak, personalBest } from "@/features/badges/engine";
import { EMOTION_LABEL } from "@/lib/emotions";
import { BADGES, FITNESS_COMPONENTS, PAPS_EVENTS, getComponent } from "@/lib/catalog";
import { activitySummary } from "@/lib/progress";
import { formatDateKo, gradeToStars } from "@/lib/utils";
import type { Achievement, FitnessProfile, PapsRecord, User, WorkoutSession } from "@/types/models";

export type PortfolioExercise = {
  id: string;
  name: string;
  sessions: number;
  totalCount: number;
  best: number;
  first: number;
  last: number;
  growthPct: number | null;
};

export type Portfolio = {
  generatedAt: string;
  student: { name: string; grade: number; className: string };
  period: { from: string; to: string } | null;
  headline: string;
  story: string[];
  stats: { sessions: number; minutes: number; streak: number; level: number; levelName: string; badges: number };
  fitness: { id: string; name: string; stars: number; color: string; category: "health" | "sport" }[];
  paps: { name: string; value: number; unit: string; grade: number; measuredAt: string }[];
  exercises: PortfolioExercise[];
  reflections: { date: string; exercise: string; note: string; before?: string; after?: string }[];
  badges: { name: string; description: string; emoji: string; unlockedAt: string }[];
  nextFocus: { name: string; reason: string; href: string };
};

export function buildPortfolio(
  user: User,
  profile: FitnessProfile,
  paps: PapsRecord[],
  sessions: WorkoutSession[],
  achievements: Achievement[],
): Portfolio {
  const ordered = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const summary = activitySummary(sessions);
  const totalMinutes = Math.round(sessions.reduce((a, s) => a + s.durationSec, 0) / 60);
  const streak = currentStreak(sessions);

  const byId = new Map<string, WorkoutSession[]>();
  for (const s of ordered) {
    const list = byId.get(s.exerciseId) ?? [];
    list.push(s);
    byId.set(s.exerciseId, list);
  }

  const exercises: PortfolioExercise[] = [...byId.entries()]
    .map(([id, list]) => {
      const first = list[0]?.count ?? 0;
      const last = list[list.length - 1]?.count ?? 0;
      const growthPct = first > 0 && list.length > 1 ? Math.round(((last - first) / first) * 100) : null;
      return {
        id,
        name: list[0]?.exerciseName ?? id,
        sessions: list.length,
        totalCount: list.reduce((a, s) => a + s.count, 0),
        best: personalBest(sessions, id),
        first,
        last,
        growthPct,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  const rope = exercises.find((e) => e.id === "jump-rope");
  const squat = exercises.find((e) => e.id === "squat");

  const fitness = FITNESS_COMPONENTS.map((c) => ({
    id: c.id,
    name: c.name,
    stars: gradeToStars(profile.components[c.id]),
    color: c.color,
    category: c.category,
  }));

  const weakest = [...fitness.filter((f) => f.category === "health")].sort((a, b) => a.stars - b.stars)[0];
  const nextComp = weakest ? getComponent(weakest.id) : undefined;

  const earned = achievements
    .slice()
    .sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt))
    .map((a) => {
      const def = BADGES.find((b) => b.id === a.badgeId);
      return {
        name: def?.name ?? a.badgeId,
        description: def?.description ?? "",
        emoji: def?.emoji ?? "🏅",
        unlockedAt: a.unlockedAt,
      };
    });

  const reflections = ordered
    .filter((s) => s.afterNote || s.beforeEmotion || s.afterEmotion)
    .slice(-6)
    .reverse()
    .map((s) => ({
      date: formatDateKo(s.startTime),
      exercise: s.exerciseName,
      note: s.afterNote ?? "",
      before: s.beforeEmotion ? EMOTION_LABEL[s.beforeEmotion] : undefined,
      after: s.afterEmotion ? EMOTION_LABEL[s.afterEmotion] : undefined,
    }));

  const papsRows = paps.map((r) => {
    const ev = PAPS_EVENTS.find((e) => e.id === r.eventId);
    return {
      name: ev?.name ?? r.eventId,
      value: r.value,
      unit: r.unit,
      grade: r.grade,
      measuredAt: r.measuredAt,
    };
  });

  const period =
    ordered.length > 0
      ? { from: formatDateKo(ordered[0].startTime), to: formatDateKo(ordered[ordered.length - 1].startTime) }
      : paps.length
        ? { from: formatDateKo(paps[0].measuredAt), to: formatDateKo(paps[paps.length - 1].measuredAt) }
        : null;

  const headline = makeHeadline(user.displayName, rope, squat, streak, earned.length, sessions.length);
  const story = makeStory(user.displayName, rope, squat, streak, summary.level, summary.title, earned, weakest?.name);

  return {
    generatedAt: new Date().toISOString(),
    student: { name: user.displayName, grade: user.grade, className: user.className },
    period,
    headline,
    story,
    stats: {
      sessions: sessions.length,
      minutes: totalMinutes,
      streak,
      level: summary.level,
      levelName: summary.title,
      badges: earned.length,
    },
    fitness,
    paps: papsRows,
    exercises,
    reflections,
    badges: earned,
    nextFocus: {
      name: weakest?.name ?? "건강체력",
      reason: nextComp
        ? `${user.displayName}에게 지금은 ${nextComp.name}을 조금 더 돌보면 좋아요. ${nextComp.kidDescription}`
        : "꾸준히 몸을 움직이는 것이 성장의 시작이에요.",
      href: weakest ? `/health-fitness/${weakest.id}` : "/prescription",
    },
  };
}

export function portfolioToText(p: Portfolio) {
  const lines = [
    "건강체력 성장 포트폴리오",
    `${p.student.grade}학년 ${p.student.className} · ${p.student.name}`,
    p.period ? `기록 기간 ${p.period.from} ~ ${p.period.to}` : "아직 운동 기록이 없어요",
    "",
    p.headline,
    ...p.story,
    "",
    `운동 ${p.stats.sessions}회 · ${p.stats.minutes}분 · 연속 ${p.stats.streak}일 · Lv.${p.stats.level} ${p.stats.levelName} · 배지 ${p.stats.badges}개`,
    "",
    "[건강체력]",
    ...p.fitness.filter((f) => f.category === "health").map((f) => `- ${f.name}: ${f.stars}/5`),
    "",
    "[PAPS 측정]",
    ...p.paps.map((r) => `- ${r.name}: ${r.value}${r.unit} (${r.grade}등급)`),
    "",
    "[운동 성장]",
    ...p.exercises.map((e) => {
      const g = e.growthPct != null ? `, 변화 ${e.growthPct > 0 ? "+" : ""}${e.growthPct}%` : "";
      return `- ${e.name}: ${e.sessions}회, 최고 ${e.best}회${g}`;
    }),
    "",
    "[마음 기록]",
    ...p.reflections.map((r) => `- ${r.date} ${r.exercise}${r.note ? `: ${r.note}` : ""}`),
    "",
    "[배지]",
    ...p.badges.map((b) => `- ${b.name}: ${b.description}`),
    "",
    `[다음에 키울 힘] ${p.nextFocus.name}`,
    p.nextFocus.reason,
    "",
    "친구와 비교하지 않고, 과거의 나와 오늘의 나를 기록합니다.",
    "출처: 이 기기의 건강체력 성장일지 · 로컬 저장",
  ];
  return lines.join("\n");
}

function makeHeadline(
  name: string,
  rope: PortfolioExercise | undefined,
  squat: PortfolioExercise | undefined,
  streak: number,
  badges: number,
  sessions: number,
) {
  if (!sessions) return `${name}의 성장 포트폴리오를 시작할 준비가 되었어요.`;
  if (rope && rope.growthPct != null && rope.growthPct > 0) {
    return `${name}의 줄넘기가 ${rope.first}회에서 ${rope.last}회로 늘었어요.`;
  }
  if (squat && squat.best >= 30) return `${name}는 스쿼트 최고 ${squat.best}회를 해냈어요.`;
  if (streak >= 3) return `${name}는 연속 ${streak}일 몸을 움직이며 성장하고 있어요.`;
  if (badges) return `${name}는 배지 ${badges}개를 받으며 꾸준히 자라고 있어요.`;
  return `${name}의 건강체력 성장이 기록되고 있어요.`;
}

function makeStory(
  name: string,
  rope: PortfolioExercise | undefined,
  squat: PortfolioExercise | undefined,
  streak: number,
  level: number,
  levelName: string,
  badges: { name: string }[],
  weakName?: string,
) {
  const parts: string[] = [];
  parts.push(`${name} 학생의 건강체력 성장 포트폴리오입니다. 순위가 아니라, 과거의 나와 오늘의 나를 모았어요.`);
  if (rope && rope.sessions > 1) {
    const g = rope.growthPct != null ? ` 처음 ${rope.first}회에서 최근 ${rope.last}회로 바뀌었어요.` : "";
    parts.push(`줄넘기는 ${rope.sessions}번 기록했고, 최고는 ${rope.best}회입니다.${g}`);
  }
  if (squat && squat.sessions) {
    parts.push(`스쿼트는 ${squat.sessions}번 도전했고, 최고 ${squat.best}회를 남겼어요.`);
  }
  if (streak) parts.push(`지금은 연속 ${streak}일 움직이고 있고, 성장 레벨은 Lv.${level} ${levelName}입니다.`);
  if (badges.length) parts.push(`받은 배지는 ${badges.map((b) => b.name).join(", ")}입니다.`);
  if (weakName) parts.push(`앞으로 ${weakName}을 조금 더 돌보면, 다음 성장이 더 분명해질 거예요.`);
  parts.push("기록은 이 기기에만 저장되며, 친구와 비교하지 않습니다.");
  return parts;
}
