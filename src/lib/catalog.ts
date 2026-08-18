import type { FitnessComponent, PapsEvent, Exercise, ExerciseVideo, BadgeDefinition } from "@/types/models";
import components from "@/data/fitness-components.json";
import events from "@/data/paps-events.json";
import exerciseList from "@/data/exercises.json";
import videoList from "@/data/videos.json";
import badgeList from "@/data/badges.json";

export const FITNESS_COMPONENTS = components as FitnessComponent[];
export const PAPS_EVENTS = events as PapsEvent[];
export const EXERCISES = exerciseList as Exercise[];
export const VIDEOS = videoList as ExerciseVideo[];
export const BADGES = badgeList as BadgeDefinition[];

export function getComponent(id: string) {
  return FITNESS_COMPONENTS.find((c) => c.id === id);
}

export function getExercise(id: string) {
  return EXERCISES.find((e) => e.id === id);
}

export function getPapsEvent(id: string) {
  return PAPS_EVENTS.find((e) => e.id === id);
}

export function getVideoForExercise(exerciseId: string) {
  return VIDEOS.find((v) => v.exerciseId === exerciseId);
}

export function healthComponents() {
  return FITNESS_COMPONENTS.filter((c) => c.category === "health");
}

export function sportComponents() {
  return FITNESS_COMPONENTS.filter((c) => c.category === "sport");
}

export function exercisesFor(componentId: string) {
  return EXERCISES.filter((e) => e.componentIds.includes(componentId as Exercise["componentIds"][number]));
}
