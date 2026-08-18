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
  /** 측정 결과를 앱 기록으로 남길 때 쓰는 종목과 단위 */
  record: { exerciseId: string; exerciseName: string; exerciseType: string; unit: string };
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
    record: { exerciseId: "shuttle-practice", exerciseName: "왕복오래달리기", exerciseType: "cardio", unit: "회" },
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
    record: { exerciseId: "jump-practice", exerciseName: "제자리멀리뛰기", exerciseType: "power", unit: "cm" },
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
    record: { exerciseId: "jump-rope", exerciseName: "줄넘기", exerciseType: "cardio", unit: "회" },
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
