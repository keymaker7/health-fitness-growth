export type GrowthRank = {
  level: number;
  name: string;
  subtitle: string;
  minXp: number;
  maxXp: number | null;
};

// 이름·설명은 keymaker님의 «레벨 시스템 1-10» 포스터를 그대로 따른다. XP 구간은 그대로다.
export const GROWTH_RANKS: GrowthRank[] = [
  { level: 1, name: "시작하는 새싹", subtitle: "건강한 습관의 첫걸음! 작은 실천을 시작해요.", minXp: 0, maxXp: 49 },
  { level: 2, name: "습관 루키", subtitle: "꾸준함이 힘이에요! 습관을 만들어가요.", minXp: 50, maxXp: 149 },
  { level: 3, name: "성장 중인 나", subtitle: "작은 변화가 쌓여 나를 성장시켜요.", minXp: 150, maxXp: 299 },
  { level: 4, name: "건강 탐험가", subtitle: "더 넓은 건강의 세계를 탐험하고 있어요.", minXp: 300, maxXp: 499 },
  { level: 5, name: "루틴 마스터", subtitle: "나만의 루틴이 자리를 잡았어요!", minXp: 500, maxXp: 799 },
  { level: 6, name: "밸런스 챔피언", subtitle: "운동, 식단, 마음의 균형! 조화로운 나를 만들어요.", minXp: 800, maxXp: 1199 },
  { level: 7, name: "한계 돌파자", subtitle: "어제의 나를 넘어 더 강한 나로 성장해요.", minXp: 1200, maxXp: 1699 },
  { level: 8, name: "라이프 업그레이더", subtitle: "건강한 습관이 삶의 질을 업그레이드해요.", minXp: 1700, maxXp: 2299 },
  { level: 9, name: "영감 리더", subtitle: "내 변화가 다른 사람에게 영감을 줘요.", minXp: 2300, maxXp: 2999 },
  { level: 10, name: "최고의 나", subtitle: "꾸준한 실천으로 최고의 나를 완성했어요!", minXp: 3000, maxXp: null },
];

export type GrowthProgress = GrowthRank & {
  xp: number;
  xpInto: number;
  xpSpan: number;
  xpToNext: number | null;
  progress: number;
  maxed: boolean;
};

export function getGrowthRank(level: number) {
  const i = Math.min(10, Math.max(1, Math.round(level))) - 1;
  return GROWTH_RANKS[i];
}

export function getGrowthProgress(xp: number): GrowthProgress {
  const safe = Math.max(0, Math.floor(xp));
  let rank = GROWTH_RANKS[0];
  for (const row of GROWTH_RANKS) {
    if (safe >= row.minXp) rank = row;
  }
  const next = GROWTH_RANKS[rank.level];
  const maxed = !next;
  const xpSpan = next ? next.minXp - rank.minXp : 1;
  const xpInto = safe - rank.minXp;
  const xpToNext = next ? Math.max(0, next.minXp - safe) : null;
  const progress = maxed ? 1 : Math.min(1, xpInto / xpSpan);
  return { ...rank, xp: safe, xpInto, xpSpan, xpToNext, progress, maxed };
}

export function formatXpRange(rank: GrowthRank) {
  const min = rank.minXp.toLocaleString("ko-KR");
  if (rank.maxXp == null) return `${min}+ XP`;
  return `${min} ~ ${rank.maxXp.toLocaleString("ko-KR")} XP`;
}
