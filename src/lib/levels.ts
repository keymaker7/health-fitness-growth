export type GrowthRank = {
  level: number;
  name: string;
  subtitle: string;
  minXp: number;
  maxXp: number | null;
};

export const GROWTH_RANKS: GrowthRank[] = [
  { level: 1, name: "새싹이", subtitle: "움직임의 시작!", minXp: 0, maxXp: 49 },
  { level: 2, name: "콩콩이", subtitle: "움직이는 게 좋아!", minXp: 50, maxXp: 149 },
  { level: 3, name: "튼튼이", subtitle: "조금 더 활기차게!", minXp: 150, maxXp: 299 },
  { level: 4, name: "점프이", subtitle: "점프할 수 있어요!", minXp: 300, maxXp: 499 },
  { level: 5, name: "스피디", subtitle: "빠르게 달려요!", minXp: 500, maxXp: 799 },
  { level: 6, name: "챌린저", subtitle: "새로운 도전을 시작해요!", minXp: 800, maxXp: 1199 },
  { level: 7, name: "에너저이", subtitle: "에너지가 넘쳐나요!", minXp: 1200, maxXp: 1699 },
  { level: 8, name: "마스터이", subtitle: "체력 마스터를 향해!", minXp: 1700, maxXp: 2299 },
  { level: 9, name: "챔피언이", subtitle: "진짜 챔피언이 되었어요!", minXp: 2300, maxXp: 2999 },
  { level: 10, name: "레전드이", subtitle: "전설의 운동왕!", minXp: 3000, maxXp: null },
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
