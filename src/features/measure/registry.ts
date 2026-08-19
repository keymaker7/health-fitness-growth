export interface MeasureTool {
  id: string;
  name: string;
  factor: string;
  description: string;
  url: string;
  host: string;
  camera: boolean;
  /** 앱 안에서 직접 재는 도구. 켜져 있으면 바깥 사이트를 띄우지 않고 앱 화면으로 잰다. */
  native?: boolean;
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
    description: "카메라가 줄넘기 횟수를 자동으로 세요. 앱 안에서 바로 재고, 인터넷이 끊겨도 돌아갑니다.",
    url: "https://jumprope-counter-tau.vercel.app",
    host: "jumprope-counter-tau.vercel.app",
    camera: true,
    native: true,
    papsEventIds: [],
    exerciseIds: ["jump-rope"],
    record: { exerciseId: "jump-rope", exerciseName: "줄넘기", exerciseType: "cardio", unit: "회" },
  },
  {
    id: "squat-cam",
    name: "스쿼트 (카메라)",
    factor: "근지구력",
    description: "카메라가 스쿼트 횟수를 세요. 앱 안에서 바로 재고, 인터넷이 끊겨도 돌아갑니다.",
    url: "https://squat-cam.netlify.app",
    host: "squat-cam.netlify.app",
    camera: true,
    native: true,
    papsEventIds: [],
    exerciseIds: ["squat"],
    record: { exerciseId: "squat", exerciseName: "스쿼트", exerciseType: "strength", unit: "회" },
  },
  {
    id: "squat-microbit",
    name: "스쿼트 파이터 (micro:bit)",
    factor: "근력",
    description: "micro:bit를 몸에 지니고 하는 스쿼트 대결이에요. 두 명이 겨룰 수 있습니다.",
    url: "https://squat-fighter.netlify.app",
    host: "squat-fighter.netlify.app",
    camera: false,
    papsEventIds: [],
    exerciseIds: ["squat"],
    record: { exerciseId: "squat", exerciseName: "스쿼트", exerciseType: "strength", unit: "회" },
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
