import type {
  ExerciseRecommendation,
  FitnessComponentId,
  FitnessProfile,
  PapsGrade,
} from "@/types/models";
import { EXERCISES, getComponent } from "@/lib/catalog";
import { gradeToStars } from "@/lib/utils";

export interface RecommendationEngine {
  recommend(profile: FitnessProfile): ExerciseRecommendation[];
}

function weakest(profile: FitnessProfile): FitnessComponentId[] {
  const entries = Object.entries(profile.components) as [FitnessComponentId, PapsGrade][];
  const health = entries.filter(([id]) =>
    ["cardio", "strength", "endurance", "flexibility", "body-composition"].includes(id),
  );
  const minStars = Math.min(...health.map(([, g]) => gradeToStars(g)));
  return health.filter(([, g]) => gradeToStars(g) === minStars).map(([id]) => id);
}

export const ruleBasedEngine: RecommendationEngine = {
  recommend(profile) {
    const targets = weakest(profile);
    const out: ExerciseRecommendation[] = [];
    for (const target of targets) {
      const list = EXERCISES.filter((e) => e.componentIds.includes(target)).slice(0, 3);
      for (const ex of list) {
        const c = getComponent(target);
        out.push({
          id: `${target}-${ex.id}`,
          exerciseId: ex.id,
          targetComponentId: target,
          mission: todayMission(target, ex.name),
          reasonKid: why(target, c?.name ?? "체력", gradeToStars(profile.components[target])),
        });
      }
    }
    if (out.length === 0) {
      out.push({
        id: "default-jump",
        exerciseId: "jump-rope",
        targetComponentId: "cardio",
        reasonKid: "오늘은 몸을 깨우는 줄넘기로 시작해 볼까요?",
        mission: "줄넘기 100회",
      });
    }
    return out;
  },
};

function why(id: FitnessComponentId, name: string, stars: number) {
  if (id === "flexibility") {
    return `지금 ${name} 별이 ${stars}개라서, 몸이 조금 뻣뻣한 상태예요. 반동 없이 천천히 늘이면 움직임이 편해져요.`;
  }
  if (id === "cardio") {
    return `오랫동안 움직이는 힘(${name})이 조금 더 필요해요. 줄넘기나 인터벌 달리기는 심폐지구력을 키우는 데 좋아요.`;
  }
  if (id === "strength" || id === "endurance") {
    return `${name} 별이 ${stars}개예요. 스쿼트처럼 바른 자세로 반복하면 힘이 쌓여요.`;
  }
  if (id === "body-composition") {
    return `신체조성은 친구와 비교하는 점수가 아니에요. 매일 걷기와 즐겁게 움직이기를 추천해요.`;
  }
  return `${name}을 조금 더 키우면 운동이 더 재미있어져요.`;
}

function todayMission(id: FitnessComponentId, name: string) {
  if (id === "flexibility") return `${name} 4분`;
  if (id === "cardio") return "줄넘기 100회";
  if (id === "strength" || id === "endurance") return "스쿼트 30회";
  return `${name} 해보기`;
}

let currentEngine: RecommendationEngine = ruleBasedEngine;

export function setRecommendationEngine(engine: RecommendationEngine) {
  currentEngine = engine;
}

export function getRecommendations(profile: FitnessProfile) {
  return currentEngine.recommend(profile);
}
