function angle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (!mag) return 180;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

export type SquatPhase = "stand" | "down" | "up";

export interface SquatResult {
  counted: boolean;
  accurate: boolean;
  kneeAngle: number;
  feedback: string;
  phase: SquatPhase;
}

export class SquatDetector {
  phase: SquatPhase = "stand";
  count = 0;
  accurateCount = 0;

  push(landmarks: { x: number; y: number }[]): SquatResult {
    const hip = mid(landmarks[23], landmarks[24]);
    const knee = mid(landmarks[25], landmarks[26]);
    const ankle = mid(landmarks[27], landmarks[28]);
    const shoulder = mid(landmarks[11], landmarks[12]);
    const kneeAngle = angle(hip, knee, ankle);
    const kneeIn = Math.abs((landmarks[25]?.x ?? 0) - (landmarks[23]?.x ?? 0)) < 0.02;

    let feedback = "무릎을 발끝 방향으로 굽혀 볼까요?";
    let counted = false;
    let accurate = false;

    if (this.phase === "stand" && kneeAngle < 120) {
      this.phase = "down";
      feedback = "좋아요, 조금 더 내려가 볼까요?";
    } else if (this.phase === "down" && kneeAngle < 100) {
      this.phase = "up";
      feedback = "바른 깊이예요. 천천히 일어나 보세요.";
    } else if (this.phase === "down" && kneeAngle > 150) {
      this.phase = "stand";
      this.count += 1;
      counted = true;
      accurate = false;
      feedback = "조금만 더 내려가 볼까요?";
    } else if (this.phase === "up" && kneeAngle > 155) {
      this.phase = "stand";
      this.count += 1;
      counted = true;
      accurate = kneeAngle > 155 && !kneeIn && (shoulder.x - hip.x) ** 2 < 0.02;
      if (accurate) this.accurateCount += 1;
      feedback = accurate ? "정확한 스쿼트예요!" : "허리를 곧게, 무릎이 모이지 않게 해 볼까요?";
    }

    return { counted, accurate, kneeAngle, feedback, phase: this.phase };
  }
}

function mid(a?: { x: number; y: number }, b?: { x: number; y: number }) {
  if (!a && !b) return { x: 0.5, y: 0.5 };
  if (!a) return b!;
  if (!b) return a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
