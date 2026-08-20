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
  /** 같은 종목의 다른 갈래(기기가 필요한 것 등). 탭을 늘리지 않고 링크로만 안내한다. */
  alsoAt?: { label: string; url: string };
}

export const MEASURE_TOOLS: MeasureTool[] = [
  {
    id: "shuttle-run",
    name: "왕복오래달리기 측정",
    factor: "심폐지구력",
    description: "신호음에 맞춰 왕복 횟수를 세요. 앱 안에서 바로 재고, 인터넷이 끊겨도 돌아갑니다.",
    url: "https://shuttlerun-paps.netlify.app",
    host: "shuttlerun-paps.netlify.app",
    camera: false,
    native: true,
    papsEventIds: ["pacer"],
    exerciseIds: ["shuttle-practice"],
    record: { exerciseId: "shuttle-practice", exerciseName: "왕복오래달리기", exerciseType: "cardio", unit: "회" },
  },
  {
    id: "long-jump",
    name: "제자리멀리뛰기 측정",
    factor: "순발력",
    description: "제자리에서 뛴 거리를 cm로 재요. 앱 안에서 바로 재고, 인터넷이 끊겨도 돌아갑니다.",
    url: "https://longjump-measure.netlify.app",
    host: "longjump-measure.netlify.app",
    camera: true,
    native: true,
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
    name: "스쿼트",
    factor: "근지구력",
    description:
      "카메라가 스쿼트 횟수를 세요. 앱 안에서 바로 재고, 인터넷이 끊겨도 돌아갑니다. " +
      "micro:bit를 쓰는 스쿼트 대결은 아래 링크에 따로 있어요.",
    url: "https://squat-cam.netlify.app",
    host: "squat-cam.netlify.app",
    camera: true,
    native: true,
    papsEventIds: [],
    exerciseIds: ["squat"],
    record: { exerciseId: "squat", exerciseName: "스쿼트", exerciseType: "strength", unit: "회" },
    // 같은 종목·같은 단위라 탭을 둘로 두지 않는다. 기기가 있는 교실만 쓰는 갈래여서 링크로 남긴다.
    alsoAt: { label: "micro:bit로 대결하기 (기기 필요)", url: "https://squat-fighter.netlify.app" },
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
