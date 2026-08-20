export type FitnessCategory = "health" | "sport";

export type HealthComponentId =
  | "cardio"
  | "strength"
  | "endurance"
  | "flexibility"
  | "body-composition";

export type SportComponentId =
  | "power"
  | "agility"
  | "balance"
  | "coordination"
  | "reaction";

export type FitnessComponentId = HealthComponentId | SportComponentId;

export type WorkoutSource =
  | "manual"
  | "microbit"
  | "camera"
  | "game"
  | "simulation";

export type EmotionKey =
  | "calm"
  | "happy"
  | "excited"
  | "tired"
  | "worried"
  | "proud";

export type PapsGrade = 1 | 2 | 3 | 4 | 5;

export interface User {
  id: string;
  displayName: string;
  grade: number;
  className: string;
  createdAt: string;
}

export interface FitnessProfile {
  userId: string;
  updatedAt: string;
  components: Record<FitnessComponentId, PapsGrade>;
  notes?: string;
}

export interface PapsRecord {
  id: string;
  userId: string;
  measuredAt: string;
  eventId: string;
  value: number;
  unit: string;
  grade: PapsGrade;
}

export interface FitnessComponent {
  id: FitnessComponentId;
  category: FitnessCategory;
  name: string;
  emoji: string;
  color: string;
  kidDescription: string;
  papsNote?: string;
}

export interface PapsEvent {
  id: string;
  name: string;
  fitnessFactor: string;
  fitnessComponentIds: FitnessComponentId[];
  purpose: string;
  method: string[];
  posture: string[];
  cautions: string[];
  place?: string;
  tools?: string[];
  applicable: string;
  unit: string;
  practiceExerciseId?: string;
  sources: { title: string; note: string }[];
}

export interface ExerciseVideo {
  id: string;
  exerciseId: string;
  title: string;
  fitnessComponent: FitnessComponentId;
  difficulty: "easy" | "normal" | "challenge";
  recommendedMinutes: number;
  youtubeId: string | null;
  description: string;
  cautions: string[];
}

export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  componentIds: FitnessComponentId[];
  difficulty: "easy" | "normal" | "challenge";
  recommendedMinutes: number;
  howTo: string[];
  cautions: string[];
  videoId?: string;
  gameHref?: string;
}

export interface ExerciseRecommendation {
  id: string;
  exerciseId: string;
  reasonKid: string;
  targetComponentId: FitnessComponentId;
  mission?: string;
}

export interface EmotionCheckIn {
  id: string;
  userId: string;
  sessionId?: string;
  phase: "before" | "after" | "brain-break";
  localMood?: EmotionKey;
  localNote?: string;
  reflectOpened: boolean;
  reflectConfirmed: boolean;
  createdAt: string;
}

/**
 * 하루치 일지. **날짜 하나에 하나**다 (id 가 곧 날짜라 덮어쓰면 그날 것이 갱신된다).
 *
 * 운동 기록(WorkoutSession)과 나눠 둔 이유: 운동은 «몸이 한 일»이고 일지는 «아이가 쓴 말»이다.
 * 운동을 안 한 날에도 일지는 쓸 수 있어야 하고, 하루에 운동을 세 번 해도 일지는 한 장이다.
 */
export interface JournalEntry {
  /** userId + 날짜(YYYY-MM-DD) */
  id: string;
  userId: string;
  /** YYYY-MM-DD (그 기기의 날짜) */
  date: string;
  /** 오늘 어땠는지 — 아이가 쓴 말 */
  text: string;
  /** 오늘의 마음 (운동 전후와 별개로, 하루를 통틀어) */
  mood?: EmotionKey;
  /** 이 일지에 대한 도우미의 답. 받은 것만 남는다 */
  feedback?: string;
  feedbackAt?: string;
  /**
   * 그날 Microsoft Reflect 체크인을 마쳤다고 아이가 표시했는지.
   * 공식 체크인은 Reflect 안에 남고, 여기에는 «했다»는 표시만 둔다.
   */
  reflectConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  count: number;
  score: number;
  accuracy: number;
  beforeEmotion?: EmotionKey;
  afterEmotion?: EmotionKey;
  beforeNote?: string;
  afterNote?: string;
  source: WorkoutSource;
  extra?: Record<string, number | string | boolean>;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface Achievement {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: string;
}

export interface AppSettings {
  beforeReflectUrl: string;
  afterReflectUrl: string;
  studentName: string;
  /**
   * 학급 명단. **번호만 담는다** — 실명을 넣지 않는 것이 이 앱의 원칙이다.
   * 비어 있으면 예전처럼 «이 기기 = 학생 한 명» 으로 동작한다.
   */
  roster?: string[];
  /** 지금 이 기기에서 기록 중인 학생 (roster 의 한 항목) */
  activeStudent?: string;
}

export interface JumpRopeSnapshot {
  count: number;
  durationMs: number;
  maxStreak: number;
  rpm: number;
  running: boolean;
}

export interface TrackedPerson {
  id: string;
  label: string;
  box: { x: number; y: number; w: number; h: number };
  jumps: number;
  color: string;
}
