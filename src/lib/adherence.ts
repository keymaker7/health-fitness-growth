import type { WorkoutSession } from "@/types/models";
import type { Prescription, PrescriptionItem } from "@/lib/prescription";
import { addDays, startOfDay } from "@/lib/utils";

/**
 * 처방을 «냈는가»가 아니라 «지켰는가»를 본다.
 *
 * 처방을 따로 저장하지 않는다. 처방은 기록에서 다시 계산되므로,
 * 저장해 두면 화면의 처방과 저장된 처방이 어긋나는 순간이 생긴다.
 * 대신 지금 처방의 종목을 이번 주 기록과 맞춰 센다.
 */

/** 이번 주의 시작(월요일 0시). 주간 목표가 «주 n회»라 주 단위로 끊는다. */
export function startOfWeek(today: Date) {
  const d = startOfDay(today);
  const day = d.getDay(); // 0=일
  const backToMonday = day === 0 ? 6 : day - 1;
  return addDays(d, -backToMonday);
}

export type ItemProgress = {
  item: PrescriptionItem;
  /** 이번 주에 이 종목을 한 횟수 */
  done: number;
  /** 처방된 주당 횟수 */
  goal: number;
  /** 목표를 채웠는가 */
  met: boolean;
};

export type Adherence = {
  weekFrom: string;
  items: ItemProgress[];
  /** 성장 종목만 센 이행률 0~100. 유지 종목은 «더 하라»는 처방이 아니라서 뺀다. */
  rate: number;
  doneTotal: number;
  goalTotal: number;
  /** 이번 주에 처방 종목을 한 번이라도 한 날 수 */
  activeDays: number;
  message: string;
};

function countThisWeek(sessions: WorkoutSession[], exerciseId: string, from: Date) {
  return sessions.filter((s) => s.exerciseId === exerciseId && new Date(s.startTime) >= from).length;
}

export function buildAdherence(p: Prescription, sessions: WorkoutSession[], today = new Date()): Adherence {
  const from = startOfWeek(today);

  const items: ItemProgress[] = p.items.map((item) => {
    const done = countThisWeek(sessions, item.exerciseId, from);
    const goal = item.timesPerWeek;
    return { item, done, goal, met: done >= goal };
  });

  // 이행률은 «성장» 종목 기준이다. 유지 종목까지 넣으면
  // 잘하고 있던 종목을 쉰 것만으로 이행률이 떨어져 보인다.
  const growth = items.filter((i) => i.item.kind === "성장");
  const goalTotal = growth.reduce((n, i) => n + i.goal, 0);
  const doneTotal = growth.reduce((n, i) => n + Math.min(i.done, i.goal), 0);
  const rate = goalTotal > 0 ? Math.round((doneTotal / goalTotal) * 100) : 0;

  const prescribedIds = new Set(p.items.map((i) => i.exerciseId));
  const days = new Set(
    sessions
      .filter((s) => prescribedIds.has(s.exerciseId) && new Date(s.startTime) >= from)
      .map((s) => startOfDay(new Date(s.startTime)).toDateString()),
  );

  return {
    weekFrom: from.toISOString().slice(0, 10),
    items,
    rate,
    doneTotal,
    goalTotal,
    activeDays: days.size,
    message: messageFor(rate, goalTotal),
  };
}

function messageFor(rate: number, goalTotal: number) {
  if (goalTotal === 0) return "이번 주 처방이 아직 없어요.";
  if (rate === 0) return "이번 주는 아직 시작 전이에요. 한 종목만 해봐요.";
  if (rate < 50) return "시작했어요. 남은 날에 한 번씩만 더 하면 돼요.";
  if (rate < 100) return "거의 다 왔어요. 조금만 더 하면 이번 주 계획을 채워요.";
  return "이번 주 계획을 다 채웠어요!";
}
