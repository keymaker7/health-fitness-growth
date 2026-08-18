import type { PapsRecord, User, WorkoutSession } from "../src/types/models";
import { papsCsv, sessionsCsv } from "../src/lib/csv";

const user: User = {
  id: "u",
  displayName: "김하준",
  grade: 5,
  className: "3반",
  createdAt: "2026-03-02T00:00:00.000Z",
};

const sessions: WorkoutSession[] = [
  {
    id: "s1",
    userId: "u",
    exerciseId: "jump-rope",
    exerciseName: "줄넘기",
    exerciseType: "cardio",
    startTime: "2026-08-10T09:00:00+09:00",
    endTime: "2026-08-10T09:04:00+09:00",
    durationSec: 240,
    count: 118,
    score: 118,
    accuracy: 0,
    afterEmotion: "proud",
    source: "camera",
  },
  {
    id: "s2",
    userId: "u",
    exerciseId: "squat",
    exerciseName: '스쿼트, "무릎" 주의',
    exerciseType: "strength",
    startTime: "2026-08-14T16:20:00+09:00",
    endTime: "2026-08-14T16:25:00+09:00",
    durationSec: 300,
    count: 28,
    score: 28,
    accuracy: 92,
    beforeEmotion: "worried",
    afterEmotion: "happy",
    source: "manual",
  },
];

const paps: PapsRecord[] = [
  { id: "p1", userId: "u", measuredAt: "2026-04-08T00:00:00+09:00", eventId: "pacer", value: 42, unit: "회", grade: 4 },
  {
    id: "p2",
    userId: "u",
    measuredAt: "2026-04-08T00:00:00+09:00",
    eventId: "sit-and-reach",
    value: 3.5,
    unit: "cm",
    grade: 3,
  },
];

const a = sessionsCsv(user, sessions);
const b = papsCsv(user, paps);

console.log("BOM:", a.charCodeAt(0) === 0xfeff);
console.log("CRLF:", a.includes("\r\n"));
console.log("\n--- 운동기록 ---");
console.log(a.replace(/\uFEFF/, ""));
console.log("--- PAPS ---");
console.log(b.replace(/\uFEFF/, ""));
