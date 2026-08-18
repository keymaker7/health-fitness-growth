export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Track {
  id: string;
  box: Box;
  vx: number;
  vy: number;
  hits: number;
  missed: number;
  label: string;
  color: string;
}

function iou(a: Box, b: Box) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

const COLORS = ["#0f6cbd", "#4f6bed", "#038387", "#7160e8", "#2c3c85", "#005b70"];

/**
 * Lightweight two-stage IoU tracker.
 * Association idea is inspired by ByteTrack (Zhang et al., ECCV 2022, MIT License)
 * but this is an independent implementation — not a copy of the original code.
 */
export class IoUTracker {
  tracks: Track[] = [];
  nextId = 1;
  maxAge: number;
  constructor(maxAge = 45) {
    this.maxAge = maxAge;
  }

  update(detections: { box: Box; score: number }[], names?: string[]) {
    this.tracks.forEach((t) => {
      t.box.x += t.vx;
      t.box.y += t.vy;
    });

    const high = detections.filter((d) => d.score >= 0.5);
    const low = detections.filter((d) => d.score < 0.5);
    const unmatchedTracks = new Set(this.tracks.map((_, i) => i));
    const assignedDet = new Set<number>();

    const match = (dets: typeof detections, thresh: number) => {
      const pairs: { ti: number; di: number; s: number }[] = [];
      this.tracks.forEach((t, ti) => {
        if (!unmatchedTracks.has(ti)) return;
        dets.forEach((d, di) => {
          if (assignedDet.has(di) && dets === high) return;
          pairs.push({ ti, di, s: iou(t.box, d.box) });
        });
      });
      pairs.sort((a, b) => b.s - a.s);
      for (const p of pairs) {
        if (p.s < thresh) continue;
        if (!unmatchedTracks.has(p.ti) || assignedDet.has(p.di)) continue;
        const t = this.tracks[p.ti];
        const d = dets[p.di];
        t.vx = d.box.x - t.box.x;
        t.vy = d.box.y - t.box.y;
        t.box = { ...d.box };
        t.hits += 1;
        t.missed = 0;
        unmatchedTracks.delete(p.ti);
        assignedDet.add(p.di);
      }
    };

    match(high, 0.25);
    match(low, 0.4);

    unmatchedTracks.forEach((ti) => {
      this.tracks[ti].missed += 1;
    });
    this.tracks = this.tracks.filter((t) => t.missed <= this.maxAge);

    high.forEach((d, di) => {
      if (assignedDet.has(di)) return;
      const idNum = this.nextId++;
      this.tracks.push({
        id: String(idNum).padStart(2, "0"),
        box: { ...d.box },
        vx: 0,
        vy: 0,
        hits: 1,
        missed: 0,
        label: names?.[this.tracks.length] ?? `학생 ${idNum}`,
        color: COLORS[(idNum - 1) % COLORS.length],
      });
    });

    return this.tracks.filter((t) => t.missed === 0 || t.hits >= 3);
  }
}
