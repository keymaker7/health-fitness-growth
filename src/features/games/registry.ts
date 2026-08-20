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
];
