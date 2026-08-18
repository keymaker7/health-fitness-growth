export interface MeasureTool {
  id: string;
  name: string;
  factor: string;
  description: string;
  url: string;
  host: string;
  camera: boolean;
  papsEventIds: string[];
  exerciseIds: string[];
}

export const MEASURE_TOOLS: MeasureTool[] = [
  {
    id: "shuttle-run",
    name: "왕복오래달리기 측정",
    factor: "심폐지구력",
    description: "신호음에 맞춰 왕복 횟수를 세는 PAPS 측정 도구예요.",
    url: "https://shuttlerun-paps.netlify.app",
    host: "shuttlerun-paps.netlify.app",
    camera: false,
    papsEventIds: ["pacer"],
    exerciseIds: ["shuttle-practice"],
  },
  {
    id: "long-jump",
    name: "제자리멀리뛰기 측정",
    factor: "순발력",
    description: "제자리에서 뛴 거리를 재는 PAPS 측정 도구예요.",
    url: "https://longjump-measure.netlify.app",
    host: "longjump-measure.netlify.app",
    camera: true,
    papsEventIds: ["standing-long-jump"],
    exerciseIds: ["jump-practice"],
  },
  {
    id: "jump-rope",
    name: "줄넘기 카운터",
    factor: "심폐지구력",
    description: "줄넘기 횟수를 자동으로 세는 도구예요.",
    url: "https://jumprope-counter-tau.vercel.app",
    host: "jumprope-counter-tau.vercel.app",
    camera: true,
    papsEventIds: [],
    exerciseIds: ["jump-rope"],
  },
];

export function getMeasureTool(id: string) {
  return MEASURE_TOOLS.find((t) => t.id === id);
}

export function measureToolsForPaps(eventId: string) {
  return MEASURE_TOOLS.filter((t) => t.papsEventIds.includes(eventId));
}

export function measureToolsForExercise(exerciseId: string) {
  return MEASURE_TOOLS.filter((t) => t.exerciseIds.includes(exerciseId));
}
