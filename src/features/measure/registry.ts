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
  /** 같은 종목의 다른 갈래(기기가 필요한 것 등). 탭을 늘리지 않고 링크로만 안내한다.
   *  url 이 빈 문자열이면 «제작 중» — 자리만 보여주고 누르지 못하게 그린다. */
  alsoAt?: { label: string; url: string };
  /** 화면 아래에 붙는 종목별 사용 방법. 탭을 고르면 그 종목 것만 보인다. */
  guide: { ready: string[]; steps: string[]; tips: string[] };
}

export const MEASURE_TOOLS: MeasureTool[] = [
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
    // keymaker님이 만드는 중 — 링크가 오면 url 만 채우면 된다 (2026-08-21)
    alsoAt: { label: "줄넘기 대결하기 (제작 중 — 곧 열려요)", url: "" },
    guide: {
      ready: [
        "발끝까지 온몸이 화면에 들어오게 서요. 여러 명이면 좌우로 벌려 서요.",
        "필요하면 «뒷면 카메라로» 버튼으로 카메라를 바꿔요.",
      ],
      steps: [
        "인원(1~4명)을 고르고 «카메라 켜기»를 눌러요.",
        "한 손을 들면 «준비»로 표시돼요. 전원이 준비되면 3·2·1 뒤에 자동으로 세기 시작해요.",
        "그냥 뛰면 돼요 — 낮은 점프도 세지만, 걷기·제자리 흔들림은 세지 않아요.",
        "«다시 세기»를 누르면 0부터 다시 세요.",
        "끝나면 «N회를 기록에 담기»를 눌러요.",
      ],
      tips: [
        "인원이 여러 명이면 사람마다 색이 붙고 각자 따로 세져요 — 겹치지 않게 간격을 두세요.",
        "숫자가 잘 안 오르면 카메라에서 두세 걸음 물러나 몸 전체가 보이게 하세요.",
      ],
    },
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
    guide: {
      ready: [
        "온몸이 화면에 들어오게 서요 — 정면도 되고 옆모습도 돼요.",
        "필요하면 «뒷면 카메라로» 버튼으로 카메라를 바꿔요.",
      ],
      steps: [
        "인원(1~4명)을 고르고 «카메라 켜기»를 눌러요.",
        "오른손을 들면 «준비»로 표시되고, 전원이 준비되면 3·2·1 뒤에 시작해요.",
        "충분히 앉았다가 일어서야 1회로 세져요 — 얕게 까딱이는 건 세지 않아요.",
        "«다시 준비»를 누르면 처음부터 다시 해요.",
        "끝나면 «N회를 기록에 담기»를 눌러요.",
      ],
      tips: [
        "다리가 화면에서 잘려도 엉덩이 높이로 판정하니 걱정하지 않아도 돼요.",
        "micro:bit로 친구와 대결하는 판은 아래 링크에 따로 있어요 (기기 필요).",
      ],
    },
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
    guide: {
      ready: [
        "바닥에 테이프로 직사각형을 그려요 — 발구름선 쪽 가로와 뛰는 방향 세로. 실제 길이(cm)를 줄자로 재 두세요.",
        "태블릿은 옆에 두고 바닥 직사각형이 전부 보이게 하세요. 필요하면 «뒷면 카메라로» 버튼으로 카메라를 바꿔요.",
      ],
      steps: [
        "«카메라 켜기»를 눌러요.",
        "화면에서 직사각형 네 귀퉁이를 순서대로 눌러요 — 발구름선 왼쪽 → 발구름선 오른쪽 → 먼쪽 오른쪽 → 먼쪽 왼쪽.",
        "가로·세로 실제 길이(cm)를 넣어요. 이걸로 화면 좌표가 실제 cm로 바뀌어요.",
        "발구름선 뒤에 서서 잠깐 가만히 있으면 준비가 자동으로 잡히고, 뛰면 착지 지점으로 거리가 계산돼요. 선을 밟으면 파울로 표시돼요.",
        "세 번 뛰면 «최고 (파울 제외)» 값이 잡혀요 → «기록에 담기»를 눌러요.",
      ],
      tips: [
        "태블릿이나 카메라를 옮겼으면 «기준 다시 잡기»로 네 점을 다시 찍어야 정확해요.",
        "발뒤꿈치 등 몸에서 가장 뒤에 닿은 곳으로 재요 — 실제 규정과 같아요.",
      ],
    },
  },
  {
    id: "shuttle-run",
    name: "왕복오래달리기 측정",
    factor: "심폐지구력",
    description: "신호음에 맞춰 여러 명이 동시에 뛰고, 카메라가 레인별로 선 통과를 자동 판정해요. 앱 안에서 바로 재고, 인터넷이 끊겨도 돌아갑니다.",
    url: "https://shuttlerun-paps.netlify.app",
    host: "shuttlerun-paps.netlify.app",
    camera: true,
    native: true,
    papsEventIds: ["pacer"],
    exerciseIds: ["shuttle-practice"],
    record: { exerciseId: "shuttle-practice", exerciseName: "왕복오래달리기", exerciseType: "cardio", unit: "회" },
    guide: {
      ready: [
        "콘으로 양쪽 선(15m)을 표시하고, 여러 명이 뛰면 콘으로 레인을 나눠요.",
        "카메라 자동 판정을 쓰려면 태블릿을 옆(측면)에 두고 두 선이 다 보이게 하세요.",
      ],
      steps: [
        "학년·거리·레인 수를 정하고 명단을 붙여넣어요. 명단 없이 «시작»만 눌러도 1번~N번으로 재져요.",
        "(자동 판정) «카메라 켜기» → 아무도 없을 때 «배경 다시 잡기» → 파란 세로선 2개를 실제 콘 위치로, 노란 가로선을 레인 위·아래로 손가락으로 끌어 맞춰요.",
        "학생들이 출발선에 서면 «시작» — 3초 뒤 신호음이 시작돼요. 신호음이 울리기 전에 반대편 선을 완전히 통과해야 인정돼요.",
        "판정이 틀렸으면 그 레인 카드를 눌러 «이번 회 미도달»로 표시해요(교사 판정이 카메라보다 세요). 처음 놓치면 △ 경고, 두 번째면 그 학생만 종료돼요.",
        "조가 끝나면 «다음 조 세우기»로 다음 학생들을 세우고 반복해요. 다 끝나면 기록표를 확인하고 «기록 CSV 복사»로 시트에 붙여넣어요.",
      ],
      tips: [
        "횟수는 신호음마다 1회씩만 올라가요 — 신호음이 울리는 순간 목표 선을 넘어 있으면 인정돼요. 신호음 전에 여러 번 왕복해도 더 올라가지 않아요 (PAPS 규정).",
        "혼자 잴 때는 명단 없이 카메라를 켜고 «시작»만 누르면 화면 전체가 1레인이 돼요.",
        "카메라 없이도 재져요 — 신호음만 틀고, 놓친 학생의 레인 카드만 눌러 주면 돼요.",
        "시작 전에 카메라가 이상하면 자가진단이 먼저 경고를 띄워요. 그때는 선 위치와 배경을 다시 확인하세요.",
      ],
    },
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
