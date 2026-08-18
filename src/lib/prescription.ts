import type {
  Exercise,
  FitnessComponentId,
  FitnessProfile,
  WorkoutSession,
} from "@/types/models";
import { EXERCISES, getComponent, getExercise } from "@/lib/catalog";
import { currentStreak } from "@/features/badges/engine";
import { addDays, formatDateKo, gradeToStars, startOfDay } from "@/lib/utils";

/**
 * 근거
 * - WHO 2020 / 질병관리청 국가건강정보포털: 5~17세는 하루 평균 60분 이상 중강도 이상 신체활동,
 *   주 3일 이상 고강도 유산소와 근력·뼈 강화 활동.
 * - AAP·CSEP 아동 저항운동 지침: 주 2~3회 비연속일, 8~15회 1~2세트로 시작,
 *   바른 자세로 상한 반복을 해내면 5~10%씩 점증(이중 점증).
 * - ACSM 유연성 지침: 주 2~3일 이상, 정적 스트레칭 10~30초 유지, 2~4회 반복해 부위당 총 60초.
 * - 교육부 PAPS 운영 매뉴얼: 평가 결과에 따라 종목별 목표와 신체활동 목표횟수를 처방으로 등록.
 */

const WINDOW_DAYS = 28;
const HEALTH: FitnessComponentId[] = ["cardio", "strength", "endurance", "flexibility", "body-composition"];

/** 주간 총량은 최근 실제 운동량의 110%를 넘기지 않습니다(점증 10% 원칙). */
const WEEKLY_GROWTH_CAP = 1.1;
/** 기록이 거의 없는 학생도 최소한 이만큼은 제안합니다. */
const WEEKLY_FLOOR_MIN = 40;
/** WHO 권고: 하루 60분 */
export const DAILY_TARGET_MIN = 60;

type Fitt = {
  timesPerWeek: [number, number];
  minutesPerSession: [number, number];
  nonConsecutive: boolean;
  /** 유연성처럼 횟수 대신 유지 시간으로 처방하는 요인 */
  holdSeconds?: [number, number];
  holdReps?: [number, number];
  howMuch: string;
  source: string;
};

const FITT: Record<FitnessComponentId, Fitt> = {
  cardio: {
    timesPerWeek: [3, 5],
    minutesPerSession: [5, 15],
    nonConsecutive: false,
    howMuch: "숨이 조금 차고 말은 할 수 있는 정도로",
    source: "WHO·질병관리청 — 주 3일 이상 숨찬 유산소",
  },
  endurance: {
    timesPerWeek: [2, 3],
    minutesPerSession: [5, 15],
    nonConsecutive: true,
    howMuch: "한 세트 12~20회, 1~2세트",
    source: "아동 저항운동 지침 — 주 2~3회 비연속일",
  },
  strength: {
    timesPerWeek: [2, 3],
    minutesPerSession: [5, 20],
    nonConsecutive: true,
    howMuch: "한 세트 8~15회, 1~2세트",
    source: "AAP·CSEP — 8~15회 1~2세트로 시작",
  },
  flexibility: {
    timesPerWeek: [3, 7],
    minutesPerSession: [5, 10],
    nonConsecutive: false,
    holdSeconds: [10, 30],
    holdReps: [2, 4],
    howMuch: "한 부위 10~30초씩 2~4번, 합쳐서 60초",
    source: "ACSM — 정적 스트레칭 10~30초 × 2~4회",
  },
  "body-composition": {
    timesPerWeek: [3, 5],
    minutesPerSession: [10, 20],
    nonConsecutive: false,
    howMuch: "즐겁게 오래 움직이는 활동으로",
    source: "WHO — 하루 60분 활동 늘리기",
  },
  power: {
    timesPerWeek: [2, 3],
    minutesPerSession: [5, 10],
    nonConsecutive: true,
    howMuch: "짧고 가볍게, 착지를 부드럽게",
    source: "아동 저항운동 지침 — 비연속일 실시",
  },
  agility: {
    timesPerWeek: [2, 3],
    minutesPerSession: [5, 10],
    nonConsecutive: false,
    howMuch: "짧게 여러 번, 사이에 충분히 쉬기",
    source: "아동 저항운동 지침 — 비연속일 실시",
  },
  balance: {
    timesPerWeek: [3, 5],
    minutesPerSession: [3, 10],
    nonConsecutive: false,
    howMuch: "천천히, 흔들려도 다시 서기",
    source: "WHO — 뼈·균형 활동 주 3일 이상",
  },
  coordination: {
    timesPerWeek: [3, 5],
    minutesPerSession: [3, 10],
    nonConsecutive: false,
    howMuch: "정확한 동작을 먼저",
    source: "WHO — 다양한 활동 경험",
  },
  reaction: {
    timesPerWeek: [2, 3],
    minutesPerSession: [3, 10],
    nonConsecutive: false,
    howMuch: "놀이처럼 짧게",
    source: "WHO — 다양한 활동 경험",
  },
};

export type ComponentLoad = {
  id: FitnessComponentId;
  name: string;
  color: string;
  sessions: number;
  minutes: number;
  stars: number;
  /** 기준선 등급과 최근 4주 운동량을 합친 필요도. 높을수록 더 필요합니다. */
  need: number;
};

export type PrescriptionItem = {
  exerciseId: string;
  exerciseName: string;
  componentId: FitnessComponentId;
  componentName: string;
  color: string;
  kind: "성장" | "유지";
  timesPerWeek: number;
  minutesPerSession: number;
  targetLabel: string;
  targetValue: number | null;
  howMuch: string;
  basis: string;
  progression: string;
  source: string;
  nonConsecutive: boolean;
};

export type Prescription = {
  from: string;
  to: string;
  reviewOn: string;
  dataPoints: number;
  weeklyRate: number;
  weeklyMinutes: number;
  dailyMinutes: number;
  dailyTargetRatio: number;
  plannedWeeklyMinutes: number;
  weeklyCapMinutes: number;
  rampNote: string | null;
  streak: number;
  intensity: "낮춤" | "유지" | "올림";
  intensityReason: string;
  headline: string;
  loads: ComponentLoad[];
  items: PrescriptionItem[];
  cautions: string[];
  sources: string[];
  hasEnoughData: boolean;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function recent(sessions: WorkoutSession[], today: Date) {
  const from = addDays(startOfDay(today), -(WINDOW_DAYS - 1));
  return sessions.filter((s) => new Date(s.startTime) >= from);
}

function componentsOf(ex: Exercise | undefined) {
  return ex?.componentIds ?? [];
}

function loadByComponent(window: WorkoutSession[], profile: FitnessProfile): ComponentLoad[] {
  return HEALTH.map((id) => {
    const c = getComponent(id);
    const mine = window.filter((s) => componentsOf(getExercise(s.exerciseId)).includes(id));
    const minutes = Math.round(mine.reduce((a, s) => a + s.durationSec, 0) / 60);
    const stars = gradeToStars(profile.components[id]);
    // 기준선이 약할수록, 최근에 덜 했을수록 필요도가 커집니다.
    const need = (6 - stars) * 10 - Math.min(minutes, 60) * 0.6 - mine.length * 1.5;
    return {
      id,
      name: c?.name ?? id,
      color: c?.color ?? "var(--brand)",
      sessions: mine.length,
      minutes,
      stars,
      need: Math.round(need * 10) / 10,
    };
  }).sort((a, b) => b.need - a.need);
}

type Trend = {
  recentAvg: number;
  best: number;
  last: number;
  hits: number;
  count: number;
};

function trendFor(sessions: WorkoutSession[], exerciseId: string): Trend | null {
  const list = sessions
    .filter((s) => s.exerciseId === exerciseId && s.count > 0)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (list.length === 0) return null;
  const lastThree = list.slice(-3).map((s) => s.count);
  const recentAvg = Math.round(lastThree.reduce((a, n) => a + n, 0) / lastThree.length);
  return {
    recentAvg,
    best: Math.max(...list.map((s) => s.count)),
    last: list[list.length - 1].count,
    // 최근 세 번 중 평균 이상을 해낸 횟수. 이중 점증에서 무게를 올릴 조건에 해당합니다.
    hits: lastThree.filter((n) => n >= recentAvg).length,
    count: list.length,
  };
}

function tiredness(window: WorkoutSession[]) {
  const after = window.filter((s) => s.afterEmotion);
  if (after.length < 2) return 0;
  const tired = after.filter((s) => s.afterEmotion === "tired" || s.afterEmotion === "worried").length;
  return tired / after.length;
}

function accuracyOf(window: WorkoutSession[], exerciseId: string) {
  const list = window.filter((s) => s.exerciseId === exerciseId && s.accuracy > 0);
  if (list.length === 0) return null;
  return Math.round(list.reduce((a, s) => a + s.accuracy, 0) / list.length);
}

function pickExercises(componentId: FitnessComponentId, window: WorkoutSession[], howMany: number) {
  const all = EXERCISES.filter((e) => e.componentIds.includes(componentId));
  const done = new Set(window.map((s) => s.exerciseId));
  const familiar = all.filter((e) => done.has(e.id));
  const fresh = all.filter((e) => !done.has(e.id));
  // 해 본 종목으로 목표를 올리고, 안 해 본 종목을 하나 섞어 편식을 막습니다.
  return [...familiar, ...fresh].slice(0, howMany);
}

/** 이중 점증: 바른 자세로 목표 범위를 채웠을 때만 5~10% 올립니다. */
function nextTarget(trend: Trend, accuracy: number | null, intensity: Prescription["intensity"]) {
  const base = trend.recentAvg;
  if (accuracy != null && accuracy < 90) {
    return { value: base, step: 0, why: `자세 정확도가 ${accuracy}%였어요. 횟수는 그대로 두고 바른 자세를 먼저 채워요.` };
  }
  if (intensity === "낮춤") {
    return {
      value: Math.max(1, Math.round(base * 0.95)),
      step: -5,
      why: `최근 평균 ${base}회보다 조금 낮게 잡았어요. 몸이 가벼워지면 다시 올려요.`,
    };
  }
  const ready = trend.hits >= 2 && trend.count >= 2;
  if (!ready) {
    return { value: base, step: 0, why: `최근 평균 ${base}회를 두 번 더 해내면 그때 목표를 올려요.` };
  }
  const step = intensity === "올림" ? 10 : 5;
  return {
    value: Math.max(1, Math.round(base * (1 + step / 100))),
    step,
    why: `최근 평균 ${base}회를 꾸준히 해냈어요. ${step}%만 올려서 ${Math.round(base * (1 + step / 100))}회에 도전해요.`,
  };
}

/**
 * 이미 잘하고 있는 힘도 한 종목은 남겨 둡니다.
 * 처방이 약점만 다루면 열심히 한 종목이 화면에서 사라져 동기가 꺾이고,
 * WHO 권고도 특정 요인만이 아니라 유산소·근력·유연성을 함께 하라고 봅니다.
 */
function maintenanceItem(
  loads: ComponentLoad[],
  targets: ComponentLoad[],
  window: WorkoutSession[],
  sessions: WorkoutSession[],
): PrescriptionItem | null {
  const taken = new Set(targets.map((t) => t.id));
  const done = loads.filter((l) => !taken.has(l.id) && l.sessions > 0);
  if (done.length === 0) return null;
  const load = done[done.length - 1];

  const counts = new Map<string, number>();
  for (const s of window) {
    if (!componentsOf(getExercise(s.exerciseId)).includes(load.id)) continue;
    counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1);
  }
  const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const ex = topId ? getExercise(topId) : undefined;
  if (!ex) return null;

  const fitt = FITT[load.id];
  const trend = trendFor(sessions, ex.id);
  return {
    exerciseId: ex.id,
    exerciseName: ex.name,
    componentId: load.id,
    componentName: load.name,
    color: load.color,
    kind: "유지",
    timesPerWeek: fitt.timesPerWeek[0],
    minutesPerSession: clamp(ex.recommendedMinutes, fitt.minutesPerSession[0], fitt.minutesPerSession[1]),
    targetLabel: trend ? `${trend.recentAvg}회 유지` : "하던 만큼",
    targetValue: trend?.recentAvg ?? null,
    howMuch: fitt.howMuch,
    basis: trend
      ? `${ex.name} ${trend.count}회 기록 · 최근 평균 ${trend.recentAvg}회 · 최고 ${trend.best}회`
      : `${load.name} 최근 4주 ${load.minutes}분 · ${load.sessions}회`,
    progression: "잘하고 있는 종목이에요. 늘리지 않아도 되니 지금처럼만 이어 가요.",
    source: fitt.source,
    nonConsecutive: fitt.nonConsecutive,
  };
}

/** 주간 총량이 최근 실제 운동량의 110%를 넘지 않도록 빈도와 시간을 줄입니다. */
function capWeeklyVolume(items: PrescriptionItem[], recentWeeklyMinutes: number) {
  const cap = Math.max(WEEKLY_FLOOR_MIN, Math.round(recentWeeklyMinutes * WEEKLY_GROWTH_CAP));
  const total = () => items.reduce((a, i) => a + i.timesPerWeek * i.minutesPerSession, 0);
  let guard = 0;
  while (total() > cap && guard < 60) {
    guard += 1;
    const sorted = [...items].sort(
      (a, b) => b.timesPerWeek * b.minutesPerSession - a.timesPerWeek * a.minutesPerSession,
    );
    // 가장 무거운 것부터 줄이되, 지침이 정한 최소치 아래로는 내리지 않습니다.
    const target = sorted.find((i) => {
      const f = FITT[i.componentId];
      return i.timesPerWeek > f.timesPerWeek[0] || i.minutesPerSession > f.minutesPerSession[0];
    });
    if (!target) break;
    const fitt = FITT[target.componentId];
    if (target.timesPerWeek > fitt.timesPerWeek[0]) target.timesPerWeek -= 1;
    else target.minutesPerSession -= 1;
  }
  return { cap, planned: total() };
}

export function buildPrescription(
  profile: FitnessProfile,
  sessions: WorkoutSession[],
  today = new Date(),
): Prescription {
  const window = recent(sessions, today);
  const weeks = WINDOW_DAYS / 7;
  const weeklyRate = Math.round((window.length / weeks) * 10) / 10;
  const totalMinutes = Math.round(window.reduce((a, s) => a + s.durationSec, 0) / 60);
  const weeklyMinutes = Math.round(totalMinutes / weeks);
  const dailyMinutes = Math.round(totalMinutes / WINDOW_DAYS);
  const streak = currentStreak(sessions, today);
  const tiredRatio = tiredness(window);

  let intensity: Prescription["intensity"] = "유지";
  let intensityReason = "최근 운동량이 알맞아요. 지금 속도를 이어 가요.";
  if (tiredRatio >= 0.5) {
    intensity = "낮춤";
    intensityReason = "운동 뒤 지친 마음이 절반을 넘었어요. 시간을 줄이고 회복을 먼저 챙겨요.";
  } else if (weeklyRate < 2) {
    intensity = "올림";
    intensityReason = `최근 4주 동안 주 ${weeklyRate}회였어요. 한 번 더 움직이는 것부터 늘려요.`;
  } else if (weeklyRate >= 4 && tiredRatio < 0.25) {
    intensity = "올림";
    intensityReason = `주 ${weeklyRate}회를 해냈고 지친 기록도 적어요. 목표를 조금 올려도 좋아요.`;
  }

  const loads = loadByComponent(window, profile);
  const targets = loads.slice(0, 2);
  const items: PrescriptionItem[] = [];

  // 건강체력교실 운영 사례에서 가장 흔한 형태가 두 종목 병행입니다. 종목 수를 세 개로 묶습니다.
  for (const [rank, load] of targets.entries()) {
    const fitt = FITT[load.id];
    for (const ex of pickExercises(load.id, window, rank === 0 ? 2 : 1)) {
      const trend = trendFor(sessions, ex.id);
      const acc = accuracyOf(window, ex.id);

      const minuteShift = intensity === "낮춤" ? -2 : intensity === "올림" ? 2 : 0;
      const minutes = clamp(
        ex.recommendedMinutes + minuteShift,
        fitt.minutesPerSession[0],
        fitt.minutesPerSession[1],
      );
      const wantMore = load.need > 25 || intensity === "올림";
      const timesPerWeek = clamp(
        intensity === "낮춤" ? fitt.timesPerWeek[0] : wantMore ? fitt.timesPerWeek[1] : fitt.timesPerWeek[0] + 1,
        fitt.timesPerWeek[0],
        fitt.timesPerWeek[1],
      );

      let targetValue: number | null = null;
      let targetLabel: string;
      let progression: string;
      let basis = `${load.name} 별 ${load.stars}개, 최근 4주 ${load.minutes}분 · ${load.sessions}회`;

      if (fitt.holdSeconds && fitt.holdReps) {
        targetLabel = `한 부위 ${fitt.holdSeconds[0]}~${fitt.holdSeconds[1]}초 × ${fitt.holdReps[0]}~${fitt.holdReps[1]}번`;
        progression = "아프지 않고 당기는 느낌까지만. 준비운동 뒤에 하면 더 잘 늘어나요.";
      } else if (trend) {
        const next = nextTarget(trend, acc, intensity);
        targetValue = next.value;
        targetLabel = `${next.value}회`;
        progression = next.why;
        basis = `${ex.name} ${trend.count}회 기록 · 최근 평균 ${trend.recentAvg}회 · 최고 ${trend.best}회`;
      } else {
        targetLabel = `${minutes}분 동안 꾸준히`;
        progression = "처음이니 횟수보다 끝까지 해내는 걸 목표로 해요. 다음 주에 기록이 생기면 목표가 정해져요.";
      }

      items.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        componentId: load.id,
        componentName: load.name,
        color: load.color,
        kind: "성장",
        timesPerWeek,
        minutesPerSession: minutes,
        targetLabel,
        targetValue,
        howMuch: fitt.howMuch,
        basis,
        progression,
        source: fitt.source,
        nonConsecutive: fitt.nonConsecutive,
      });
    }
  }

  const keep = maintenanceItem(loads, targets, window, sessions);
  if (keep) items.push(keep);

  const { cap, planned } = capWeeklyVolume(items, weeklyMinutes);
  // 지침의 최소 권고량이 점증 상한보다 클 때가 있습니다. 이때는 계획을 깎는 대신 천천히 채우게 안내합니다.
  const rampNote =
    planned > cap
      ? `지금 하는 양(주 ${weeklyMinutes}분)보다 많이 늘어나는 계획이에요. 첫 주는 절반만 하고 2주차부터 채워요.`
      : null;

  const cautions = new Set<string>();
  for (const item of items) {
    const ex = getExercise(item.exerciseId);
    for (const c of ex?.cautions ?? []) cautions.add(c);
  }
  if (items.some((i) => i.nonConsecutive)) {
    cautions.add("근육을 쓰는 운동은 이틀 연속 하지 않고 하루씩 쉬어 줍니다.");
  }
  cautions.add("운동 전 준비운동, 운동 뒤 정리운동을 꼭 합니다.");
  cautions.add("아프거나 어지러우면 바로 멈추고 선생님께 알려요.");

  const sources = [...new Set(items.map((i) => i.source))];
  const first = window[window.length - 1]?.startTime;
  const headline = makeHeadline(window.length, weeklyRate, targets[0]?.name, intensity);

  return {
    from: first ? formatDateKo(first) : formatDateKo(addDays(today, -(WINDOW_DAYS - 1)).toISOString()),
    to: formatDateKo(today.toISOString()),
    reviewOn: formatDateKo(addDays(today, 28).toISOString()),
    dataPoints: window.length,
    weeklyRate,
    weeklyMinutes,
    dailyMinutes,
    dailyTargetRatio: Math.round((dailyMinutes / DAILY_TARGET_MIN) * 100),
    plannedWeeklyMinutes: planned,
    weeklyCapMinutes: cap,
    rampNote,
    streak,
    intensity,
    intensityReason,
    headline,
    loads,
    items,
    cautions: [...cautions],
    sources,
    hasEnoughData: window.length >= 3,
  };
}

function makeHeadline(count: number, rate: number, focus: string | undefined, intensity: string) {
  if (count === 0) return "아직 기록이 없어요. 오늘 한 번만 움직이면 처방이 만들어져요.";
  if (count < 3) return `기록 ${count}개로 만든 임시 처방이에요. 세 번만 더 하면 더 정확해져요.`;
  return `최근 4주 주 ${rate}회를 바탕으로 ${focus ?? "건강체력"}을 키우는 4주 계획이에요. 강도는 ${intensity}입니다.`;
}
