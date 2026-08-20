// 레인별 위치 감지 — 카메라 화면에서 "몇 번 레인의 아이가 지금 화면 가로 어디에 있나"만 뽑는다.
//
// 왜 관절 인식(자세 추정)을 쓰지 않는가:
//   셔틀런에서 횟수는 신호음이 정한다. 카메라가 답해야 하는 질문은 하나뿐이다 —
//   "신호음이 울린 그 순간 이 아이가 선을 넘어 있었나". 그건 가로 위치 하나면 된다.
//   관절 33개를 15m 밖에서 찾는 건 신뢰도가 무너지는데, 움직이는 덩어리의 가로 위치는 그 거리에서도 잡힌다.
//   덕분에 20MB짜리 모델이 아예 필요 없다 — 앱이 즉시 열리고 교실 와이파이가 끊겨도 상관없다.
//
// 누가 누구인지(신원)는 추적으로 풀지 않는다. 콘으로 레인이 나뉘어 있으니
// "화면의 몇 번째 가로 띠인가"가 곧 학생 번호다. 레인은 움직이지 않으므로 번호를 잃어버릴 일이 없다.

/** 레인을 화면 세로 구간으로 균등하게 나눈다 (0~1 비율). 나중에 손으로 조정할 수 있다. */
export function laneBands(count, top = 0.15, bottom = 0.95) {
  const out = [];
  const h = (bottom - top) / Math.max(count, 1);
  for (let i = 0; i < count; i++) out.push({ y0: top + h * i, y1: top + h * (i + 1) });
  return out;
}

/** 배경을 조금씩 따라가게 갱신한다 (조명 변화·그림자에 끌려가지 않을 만큼만 느리게) */
export function updateBackground(bg, frame, alpha = 0.02) {
  for (let i = 0; i < bg.length; i++) bg[i] += (frame[i] - bg[i]) * alpha;
  return bg;
}

/**
 * 한 레인 띠 안에서 "배경과 다른 픽셀"의 가로 위치를 뽑는다.
 *
 * 중심(centroid)이 아니라 무게중심을 쓰되 픽셀 수도 함께 돌려준다.
 * 픽셀이 너무 적으면 사람이 없는 것으로 보고 null을 준다 — 없는데 있다고 하지 않기 위해서다.
 *
 * @returns {{x:number, count:number}|null}  x는 0~1 (화면 왼쪽 0, 오른쪽 1)
 */
export function foregroundStats(frame, bg, w, h, band, thresh = 24, minPixels = 12) {
  const y0 = Math.max(0, Math.floor(band.y0 * h));
  const y1 = Math.min(h, Math.ceil(band.y1 * h));
  let sum = 0, count = 0;
  for (let y = y0; y < y1; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (Math.abs(frame[row + x] - bg[row + x]) > thresh) { sum += x; count++; }
    }
  }
  if (count < minPixels) return null;
  return { x: (sum / count) / (w - 1), count };
}

/** 선을 넘었는가. side는 그 선이 화면의 어느 쪽 끝인가를 뜻한다. */
export function reached(x, lineX, side) {
  if (typeof x !== 'number') return false;
  return side === 'left' ? x <= lineX : x >= lineX;
}

/**
 * 한 레인의 위치를 시간에 따라 다듬는다.
 *
 * 그대로 쓰지 않는 이유: 한 프레임만 튀어도(다른 아이가 띠를 스쳐 지나감, 조명 깜빡임)
 * 신호음이 하필 그 순간에 울리면 기록이 틀어진다. 그래서 최근 값을 섞고,
 * 사람이 잠깐 안 보여도 마지막 위치를 짧은 시간 붙잡는다.
 */
export class LaneTracker {
  constructor(o = {}) {
    this.smooth = o.smooth ?? 0.5;      // 0에 가까울수록 과거를 더 믿는다
    this.holdMs = o.holdMs ?? 700;      // 사람을 놓쳤을 때 마지막 위치를 붙잡는 시간
    this.x = null;
    this.lastSeenMs = -Infinity;
    this.count = 0;
  }

  /** 매 프레임 호출. stats가 null이면 이번 프레임엔 안 보였다는 뜻. */
  update(stats, nowMs) {
    if (!stats) return this.x;
    this.x = this.x === null ? stats.x : this.x + (stats.x - this.x) * this.smooth;
    this.lastSeenMs = nowMs;
    this.count = stats.count;
    return this.x;
  }

  /** 신호음 순간에 쓸 위치. 너무 오래 못 봤으면 null (모르면 모른다고 한다). */
  positionAt(nowMs) {
    if (this.x === null) return null;
    return (nowMs - this.lastSeenMs) <= this.holdMs ? this.x : null;
  }

  reset() { this.x = null; this.lastSeenMs = -Infinity; this.count = 0; }
}

/**
 * 화면 전체를 한 번에 다루는 감지기. 프레임(회색조 Uint8ClampedArray)을 계속 넣어주면
 * 레인별 위치를 유지하고, 신호음 순간에 판정을 돌려준다.
 */
export class LaneVision {
  /**
   * @param {object} o  { w, h, lanes:[{y0,y1}], lineLeft, lineRight, thresh, minPixels, alpha }
   */
  constructor(o = {}) {
    this.w = o.w || 192;
    this.h = o.h || 108;
    this.lanes = o.lanes || laneBands(4);
    this.lineLeft = o.lineLeft ?? 0.12;    // 화면에서 A선의 가로 위치 (0~1)
    this.lineRight = o.lineRight ?? 0.88;  // B선
    this.thresh = o.thresh ?? 24;
    this.minPixels = o.minPixels ?? 12;
    this.alpha = o.alpha ?? 0.02;
    this.bg = null;
    this.trackers = this.lanes.map(() => new LaneTracker());
  }

  setLanes(lanes) {
    this.lanes = lanes;
    this.trackers = lanes.map(() => new LaneTracker());
  }

  /** 배경을 지금 화면으로 다시 잡는다 (카메라를 옮겼거나 아이들이 자리를 바꿨을 때) */
  resetBackground() { this.bg = null; this.trackers.forEach(t => t.reset()); }

  /** @returns {Array<number|null>} 레인별 가로 위치 */
  push(frame, nowMs) {
    if (!this.bg || this.bg.length !== frame.length) {
      this.bg = Float32Array.from(frame);   // 첫 프레임을 배경으로 삼는다
      return this.lanes.map(() => null);
    }
    const out = this.lanes.map((band, i) => {
      const s = foregroundStats(frame, this.bg, this.w, this.h, band, this.thresh, this.minPixels);
      return this.trackers[i].update(s, nowMs);
    });
    updateBackground(this.bg, frame, this.alpha);
    return out;
  }

  /**
   * 신호음 순간의 판정.
   * @param {'left'|'right'} side  이번 신호음에 닿아야 하는 선
   * @returns {Array<{reached:boolean, x:number|null, known:boolean}>}
   */
  judge(side, nowMs) {
    const lineX = side === 'left' ? this.lineLeft : this.lineRight;
    return this.trackers.map(t => {
      const x = t.positionAt(nowMs);
      return { x, known: x !== null, reached: reached(x, lineX, side) };
    });
  }
}

/**
 * 이번 왕복이 어느 쪽 선을 향하는가.
 * 1회는 출발선(왼쪽)에서 반대편(오른쪽)으로 가고, 그다음은 번갈아 간다.
 * startSide는 아이들이 처음 서 있는 쪽이다.
 */
export function targetSideOf(lap, startSide = 'left') {
  const other = startSide === 'left' ? 'right' : 'left';
  return lap % 2 === 1 ? other : startSide;
}
