export interface GameModule {
  id: string;
  name: string;
  emoji: string;
  href: string;
  fitnessComponentIds: string[];
  description: string;
  cooperative?: boolean;
}

export const GAME_MODULES: GameModule[] = [
  {
    id: "jump-rope",
    name: "개인 줄넘기",
    emoji: "🪢",
    href: "/games/jump-rope",
    fitnessComponentIds: ["cardio"],
    description: "Micro:bit 또는 시뮬레이션으로 횟수를 세요.",
  },
  {
    id: "multi-jump",
    name: "AI 다인원 줄넘기",
    emoji: "👥",
    href: "/games/multi-jump",
    fitnessComponentIds: ["cardio", "coordination"],
    description: "카메라 한 대로 여러 친구의 횟수를 유지해요.",
  },
  {
    id: "squat-race",
    name: "스쿼트 레이스",
    emoji: "🏃",
    href: "/games/squat-race",
    fitnessComponentIds: ["strength", "endurance"],
    description: "바른 스쿼트마다 캐릭터가 앞으로 달려요.",
  },
  {
    id: "boss-battle",
    name: "팀 보스 배틀",
    emoji: "🐲",
    href: "/games/boss-battle",
    fitnessComponentIds: ["strength", "endurance"],
    description: "함께 스쿼트해서 보스의 HP를 줄여요.",
    cooperative: true,
  },
  {
    id: "jump-power",
    name: "점프 게임",
    emoji: "🦘",
    href: "/games/jump-power",
    fitnessComponentIds: ["power"],
    description: "순발력 점프로 높이 기록을 남겨요.",
  },
  {
    id: "side-step",
    name: "사이드스텝 게임",
    emoji: "↔️",
    href: "/games/side-step",
    fitnessComponentIds: ["agility"],
    description: "좌우로 빠르게 이동해요.",
  },
  {
    id: "balance",
    name: "한발서기 게임",
    emoji: "🦩",
    href: "/games/balance",
    fitnessComponentIds: ["balance"],
    description: "흔들림 없이 중심을 지켜요.",
  },
  {
    id: "coordination",
    name: "공 반응 게임",
    emoji: "🏐",
    href: "/games/coordination",
    fitnessComponentIds: ["coordination"],
    description: "나타나는 공을 손으로 터치해요.",
  },
  {
    id: "reaction",
    name: "터치 반응 게임",
    emoji: "👆",
    href: "/games/reaction",
    fitnessComponentIds: ["reaction"],
    description: "신호가 켜지면 바로 터치해요.",
  },
];
