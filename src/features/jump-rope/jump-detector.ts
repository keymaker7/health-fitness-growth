export class HipJumpDetector {
  private prevY = 0;
  private goingUp = false;
  private lastJump = 0;
  private airborne = false;
  count = 0;

  constructor(
    private minInterval = 320,
    private rise = 0.018,
  ) {}

  push(hipY: number, now = performance.now()) {
    const dy = this.prevY - hipY;
    if (!this.prevY) {
      this.prevY = hipY;
      return false;
    }
    if (dy > this.rise) {
      this.goingUp = true;
      this.airborne = true;
    }
    if (this.airborne && hipY > this.prevY && this.goingUp && now - this.lastJump > this.minInterval) {
      this.count += 1;
      this.lastJump = now;
      this.goingUp = false;
      this.airborne = false;
      this.prevY = hipY;
      return true;
    }
    this.prevY = hipY;
    return false;
  }
}

export function hipY(landmarks: { x: number; y: number }[]) {
  const a = landmarks[23];
  const b = landmarks[24];
  if (!a || !b) return landmarks[0]?.y ?? 0.5;
  return (a.y + b.y) / 2;
}
