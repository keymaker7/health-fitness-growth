// 제자리멀리뛰기 측정 로직.
//
// 줄넘기(counter.js)와 근본적으로 다른 점: 결과가 "횟수"가 아니라 "cm" 라서
// 픽셀을 실제 길이로 바꾸는 기준(캘리브레이션)이 반드시 있어야 한다.
//
// 왜 바닥 평면 기준이 원리적으로 맞는가:
//   측정에 필요한 두 지점(발구름선, 착지한 발)은 **둘 다 바닥에 붙어 있다.**
//   바닥 평면의 사영변환(호모그래피)만 알면 카메라가 비스듬해도 실제 좌표가 정확히 나온다.
//   공중에 있는 몸은 이 변환이 성립하지 않으므로 절대 변환하지 않는다.

export const LJ_CONFIG = {
  kpVisMin: 0.5,

  // 준비(SET) 판정
  stillFrames: 6,             // 발이 이 프레임 수만큼 안정되면 준비 완료
  stillMoveRatio: 0.015,      // "안정"의 기준 (키 대비 이동량)

  // 도약 판정
  takeoffRiseRatio: 0.035,    // 발이 준비 위치보다 이만큼(키 대비) 뜨면 도약
  takeoffConfirmFrames: 2,

  // 착지 판정
  landStillFrames: 3,         // 발 움직임이 멈춘 프레임 수
  landMoveRatio: 0.02,
  descentFrames: 2,           // 착지 전에 "내려오는 중"이 확인돼야 하는 프레임 수
  landMedianFrames: 3,        // 착지 지점을 정할 때 쓰는 프레임 수 (중앙값)

  // 착지 프레임 고르기 — 프레임 하나를 잘못 잡으면 기록이 통째로 틀어진다.
  // 착지로 판정된 순간 바로 재지 않고, 뒤 프레임까지 더 본 다음 **가장 안정적인 창**을 고른다.
  // (Sci Rep 2026 "smart monocular vision metrology for standing long jump" 의 stability-window 방식.
  //  그 논문은 240fps 산업용 카메라로 MAE 0.71cm 를 얻었고, 안정 창 판정이 핵심 부품 중 하나였다)
  landWindow: 3,              // 안정 창 크기 (연속 프레임 수)
  landPostS: 0.2,             // 착지 판정 뒤 더 모을 시간(초). 프레임 수는 실제 fps 에 맞춰 정한다 —
                              // 30fps 면 6장, 60fps 면 12장. 프레임 수를 고정하면 느린 기기에서 너무 오래 기다린다.
  landPostMinFrames: 3,
  landPostMaxFrames: 12,
  landPreFrames: 5,           // 착지 판정 앞쪽으로 살펴볼 프레임 수
  landBufFrames: 30,          // 버퍼 길이
  landPostMaxS: 0.35,         // 뒤 프레임을 기다리는 최대 시간 (프레임이 안 들어와도 여기서 끊는다)
  minFlightS: 0.15,           // 이보다 짧으면 점프로 안 봄 (발 흔들림)
  maxFlightS: 2.5,            // 이보다 길면 측정 실패로 처리

  // 착지 접촉점 판정
  handTouchRatio: 0.12,       // 손목이 발 높이에서 이 안쪽이면 "손을 짚었다"로 본다
  cooldownS: 0.6,             // 결과 표시 후 다음 시기를 받기까지

  // 남는 계통오차 보정 — 뒤꿈치 keypoint 가 바닥이 아니라 발목 쪽에 찍히기 때문에
  // 거리가 조금 크게 나온다. 편향의 크기는 카메라 높이·각도에 따라 달라지므로
  // 줄자로 한 번 재서 이 값을 맞추면 그 자리에서는 계속 유효하다.
  offsetCm: 0,

  // 배수(스케일) 보정 — 기준 사각형의 **실제 크기와 입력값이 다르면** 그 비율이 결과에 그대로 곱해진다.
  // 현장에서 실제로 나온 사고다: 깊이 50cm 짜리를 찍고 기본값 300cm 를 그대로 뒀더니
  // 120cm 점프가 720cm 로 나왔다. 더하기 보정(offsetCm)으로는 이런 배수 오류를 못 잡는다.
  // 줄자로 한 번 재서 이 값을 맞추면 사각형의 실제 크기를 몰라도 바로잡힌다.
  scaleK: 1,
};

/** 제자리멀리뛰기 세계기록 373cm — 이걸 넘으면 사람의 기록이 아니라 기준이 틀린 것이다 */
export const LJ_MAX_PLAUSIBLE_CM = 380;
export const LJ_MIN_PLAUSIBLE_CM = 30;

/**
 * 결과가 사람이 낼 수 있는 값인가.
 *
 * 이 검사가 없어서 앱이 700cm 를 아무 말 없이 받아 적었다. 측정은 틀릴 수 있지만,
 * **틀렸다는 걸 모르는 척하는 것**은 다른 문제다. 원인 후보까지 함께 돌려준다.
 */
export function plausibleDistance(cm) {
  if (typeof cm !== 'number' || !isFinite(cm)) return { ok: true, reason: null };
  if (cm > LJ_MAX_PLAUSIBLE_CM) {
    return {
      ok: false,
      reason: `${cm.toFixed(0)}cm 는 사람이 뛸 수 없습니다(세계기록 373cm). ` +
        '**기준 사각형의 실제 크기와 입력한 숫자가 다를 가능성이 큽니다** — 가로·깊이를 줄자로 재서 다시 넣어 주세요.',
    };
  }
  if (cm < LJ_MIN_PLAUSIBLE_CM) {
    return {
      ok: false,
      reason: `${cm.toFixed(0)}cm 는 너무 짧습니다. **기준 사각형을 반대 방향으로 찍었거나** 입력한 크기가 실제보다 작습니다.`,
    };
  }
  return { ok: true, reason: null };
}

/**
 * 잰 값에 보정을 적용한다. 보정은 세 가지 중 하나다 —
 *   ① 다항식(coef)  : 원근에 따른 치우침까지 잡는다. 실측이 3건 이상 넓게 퍼져 있을 때만 쓴다
 *   ② 배수+더하기    : 기준 크기 오류(배수)와 계통편향(더하기)
 *   ③ 아무것도 안 함 : 기본값
 * 다항식을 먼저 보는 이유는, 있으면 그게 가장 많은 정보를 담고 있기 때문이다.
 */
export function applyCorrection(raw, cfg = LJ_CONFIG) {
  const coef = cfg?.correction?.coef;
  if (Array.isArray(coef) && coef.length >= 2) {
    return coef.reduce((sum, b, k) => sum + b * Math.pow(raw, k), 0);
  }
  return raw * (cfg?.scaleK ?? 1) - (cfg?.offsetCm || 0);
}

/**
 * 줄자 실측값으로 보정값을 구한다.
 *
 * @param {Array<{app:number, tape:number}>} pairs
 * @returns {{scale:number, offset:number}}  보정 후 거리 = 잰값 * scale - offset
 *
 * 한 건이면 배수만 맞춘다(더하기까지 맞추면 그 한 점에만 들어맞는 값이 나온다).
 * 두 건 이상이라도 실측값들이 서로 붙어 있으면 기울기를 믿을 수 없으므로 더하기만 맞춘다 —
 * 165·167·166cm 같은 데이터로 기울기를 뽑으면 엉뚱한 배수가 나온다.
 */
export function fitCorrection(pairs) {
  const list = (pairs || []).filter(p => typeof p?.app === 'number' && typeof p?.tape === 'number' && p.app > 0);
  if (!list.length) return { scale: 1, offset: 0 };
  if (list.length === 1) return { scale: list[0].tape / list[0].app, offset: 0 };

  // 실측이 넉넉하고 거리도 넓게 퍼져 있으면 2차식으로 맞춘다.
  // 원근 때문에 남는 치우침은 거리에 따라 **직선이 아니라 완만한 곡선**으로 커진다
  // (Sci Rep 2026 SLJ 논문도 2차 다항식 보정을 썼고, 그게 MAE 를 끌어내린 부품 중 하나였다).
  // 데이터가 적거나 몰려 있으면 곡선을 맞추는 게 오히려 해로우므로 직선으로 물러선다.
  {
    const xs = list.map(p => p.app);
    const spreadAll = Math.max(...xs) - Math.min(...xs);
    if (list.length >= 4 && spreadAll >= 60) {
      const poly = fitPoly(list, 2);
      if (poly) return { scale: 1, offset: 0, coef: poly, degree: 2 };
    }
  }

  const spread = Math.max(...list.map(p => p.app)) - Math.min(...list.map(p => p.app));
  if (spread < 30) {                       // 값이 붙어 있으면 기울기를 뽑지 않는다
    const bias = list.reduce((s, p) => s + (p.app - p.tape), 0) / list.length;
    return { scale: 1, offset: bias };
  }
  // 최소제곱 직선 맞춤: tape = a*app + b  →  scale = a, offset = -b
  const n = list.length;
  const sx = list.reduce((s, p) => s + p.app, 0);
  const sy = list.reduce((s, p) => s + p.tape, 0);
  const sxx = list.reduce((s, p) => s + p.app * p.app, 0);
  const sxy = list.reduce((s, p) => s + p.app * p.tape, 0);
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return { scale: 1, offset: (sx - sy) / n };
  const a = (n * sxy - sx * sy) / den;
  const b = (sy - a * sx) / n;
  return { scale: a, offset: -b };
}

/**
 * 최소제곱 다항식 맞춤 (정규방정식). degree=2 면 [b0, b1, b2] 를 돌려준다.
 * 데이터가 모자라거나 특이하면 null — 억지로 맞추지 않는다.
 */
export function fitPoly(pairs, degree = 2) {
  const n = pairs.length;
  if (n < degree + 2) return null;                   // 계수 개수보다 넉넉해야 의미가 있다
  const m = degree + 1;
  const A = Array.from({ length: m }, () => new Array(m).fill(0));
  const b = new Array(m).fill(0);
  for (const p of pairs) {
    const pow = Array.from({ length: 2 * degree + 1 }, (_, k) => Math.pow(p.app, k));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) A[i][j] += pow[i + j];
      b[i] += pow[i] * p.tape;
    }
  }
  // 가우스 소거
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < m; c++) {
    let piv = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < m; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= m; k++) M[r][k] -= f * M[c][k];
    }
  }
  const coef = M.map((row, i) => row[m] / row[i]);
  return coef.every(v => Number.isFinite(v)) ? coef : null;
}

/**
 * 테스트 모드 통계 — 앱값과 줄자값 쌍에서 오차를 요약한다.
 * MAE(평균 절대오차)가 이 앱의 성적표다. 목표는 1~2cm 이하.
 */
export function errorStats(pairs) {
  const list = (pairs || []).filter(p => typeof p?.app === 'number' && typeof p?.tape === 'number');
  if (!list.length) return { n: 0, mae: null, mean: null, max: null, min: null, maxAbs: null, sd: null };
  const errs = list.map(p => p.app - p.tape);            // + = 앱이 크게 잼
  const abs = errs.map(Math.abs);
  const mean = errs.reduce((s, e) => s + e, 0) / errs.length;
  const mae = abs.reduce((s, e) => s + e, 0) / abs.length;
  const sd = Math.sqrt(errs.reduce((s, e) => s + (e - mean) ** 2, 0) / errs.length);
  return {
    n: list.length,
    mae: Math.round(mae * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    max: Math.round(Math.max(...errs) * 100) / 100,
    min: Math.round(Math.min(...errs) * 100) / 100,
    maxAbs: Math.round(Math.max(...abs) * 100) / 100,
    sd: Math.round(sd * 100) / 100,
  };
}

// BlazePose 33 landmark 중 이 화면에서 쓰는 것
export const LJ_LM = {
  lShoulder: 11, rShoulder: 12,
  lWrist: 15, rWrist: 16,
  lIndex: 19, rIndex: 20,          // 검지 끝 — 손끝으로 기준점을 찍을 때 쓴다
  lHip: 23, rHip: 24,
  lAnkle: 27, rAnkle: 28,
  lHeel: 29, rHeel: 30,
  lFoot: 31, rFoot: 32,
};

export const LJ_STATES = { WAIT: 'WAIT', SET: 'SET', FLIGHT: 'FLIGHT', RESULT: 'RESULT' };

/**
 * 손끝으로 기준점 찍기.
 * 카메라가 3~4m 떨어져 있으면 화면을 탭하러 왔다갔다 해야 한다.
 * 대신 그 자리에서 바닥에 손끝을 대고 잠깐 멈추면 그 지점을 찍는다.
 *
 * 정확도는 화면 탭보다 떨어진다(모델 오차 + 손가락 두께). 찍은 뒤 화면에서 끌어 미세조정하는 것을 전제로 한다.
 */
export class FingerPointer {
  constructor(opts = {}) {
    this.holdS = opts.holdS ?? 1.5;          // 이 시간만큼 멈춰 있어야 확정
    this.moveRatio = opts.moveRatio ?? 0.012; // "멈췄다"의 기준 (화면 가로 대비)
    this.reset();
  }

  reset() { this._at = null; this._origin = null; this._since = 0; this._last = 0; }

  /**
   * @param {{x:number,y:number}|null} tip  이번 프레임의 손끝 (안 보이면 null)
   * @param {number} now  초
   * @param {number} frameW  화면 가로 픽셀 (임계값 정규화용)
   * @returns {{state:'none'|'moving'|'holding'|'done', progress:number, point:?{x,y}}}
   */
  update(tip, now, frameW) {
    this._last = now;
    if (!tip) { this.reset(); return { state: 'none', progress: 0, point: null }; }

    const limit = frameW * this.moveRatio;
    // 프레임당 이동량만 보면 **천천히 끄는 손**이 "멈춰 있다"로 통과한다.
    // 그래서 처음 멈춘 자리(_origin)에서 얼마나 벗어났는지도 함께 본다.
    const jumped = this._at && Math.hypot(tip.x - this._at.x, tip.y - this._at.y) > limit;
    const drifted = this._origin && Math.hypot(tip.x - this._origin.x, tip.y - this._origin.y) > limit;
    if (!this._at || jumped || drifted) {
      this._at = { ...tip };                 // 움직였다 → 다시 처음부터
      this._origin = { ...tip };
      this._since = now;
      return { state: 'moving', progress: 0, point: null };
    }

    // 멈춰 있는 동안 위치를 아주 조금씩 따라가 손떨림을 흡수한다
    this._at = { x: this._at.x * 0.7 + tip.x * 0.3, y: this._at.y * 0.7 + tip.y * 0.3 };

    const held = now - this._since;
    if (held >= this.holdS) {
      const p = { ...this._at };
      this.reset();
      return { state: 'done', progress: 1, point: p };
    }
    return { state: 'holding', progress: held / this.holdS, point: { ...this._at } };
  }
}

/** 두 검지 중 화면에서 더 아래(=바닥에 가까운) 쪽을 손끝으로 본다 */
export function fingerTip(pts, cfg = LJ_CONFIG) {
  let best = null;
  for (const i of [LJ_LM.lIndex, LJ_LM.rIndex]) {
    const p = pts?.[i];
    if (!p || p.v < cfg.kpVisMin) continue;
    if (!best || p.y > best.y) best = { x: p.x, y: p.y };
  }
  return best;
}

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// ── 캘리브레이션 ───────────────────────────────────────

/** 8x8 선형계 풀이 (가우스 소거) — 호모그래피 계산용 */
function solve8(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null;       // 특이행렬 = 네 점이 일직선/중복
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);      // 대각원소로 나눠 해를 얻는다
}

/** 3×3 선형 연립방정식 (가우스 소거). 특이하면 null. */
function solve3(M, y) {
  const a = M.map((row, i) => [...row, y[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-12) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const fr = a[r][col] / a[col][col];
      for (let cc = col; cc <= 3; cc++) a[r][cc] -= fr * a[col][cc];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

/** N×3 최소제곱: rows·x ≈ b 를 정규방정식(AᵀA x = Aᵀb)으로 푼다. 실패 시 null. */
function solveLeastSquares3(rows, b) {
  const AtA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], Atb = [0, 0, 0];
  for (let k = 0; k < rows.length; k++) {
    const r = rows[k];
    for (let i = 0; i < 3; i++) {
      Atb[i] += r[i] * b[k];
      for (let j = 0; j < 3; j++) AtA[i][j] += r[i] * r[j];
    }
  }
  return solve3(AtA, Atb);
}

/** 3x3 역행렬 (행 우선 9개) — 실좌표를 다시 화면 좌표로 되돌릴 때 쓴다 */
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [
    A / det, (c * h - b * i) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, (c * d - a * f) / det,
    C / det, (b * g - a * h) / det, (a * e - b * d) / det,
  ];
}

/**
 * 화면 좌표 → 바닥 실좌표(cm) 변환기.
 *
 *  mode 'rect'  : 바닥의 알려진 사각형 네 모서리를 찍는다 (권장 — 카메라가 비스듬해도 보정됨)
 *                 순서: 발구름선 왼끝 → 발구름선 오른끝 → 뛰는 방향 먼쪽 오른끝 → 먼쪽 왼끝
 *                 실좌표: (0,0) (W,0) (W,D) (0,D)  ⇒ **거리 = 착지점의 Y**
 *  mode 'two'   : 뛰는 방향으로 놓인 두 점과 그 실제 거리 (간이 — 카메라가 수직일 때만 정확)
 */
export class Calibration {
  constructor(kind, data) { this.kind = kind; Object.assign(this, data); }

  static fromRect(imgPts, widthCm, depthCm) {
    if (!imgPts || imgPts.length !== 4) return new Calibration('none', { error: '네 점이 필요합니다' });
    const world = [[0, 0], [widthCm, 0], [widthCm, depthCm], [0, depthCm]];
    // 화면(x,y) → 실좌표(X,Y) 호모그래피
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = [imgPts[i].x, imgPts[i].y];
      const [X, Y] = world[i];
      A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
    }
    const h = solve8(A, b);
    if (!h) return new Calibration('none', { error: '네 점이 일직선이거나 겹칩니다' });
    return new Calibration('rect', { h: [...h, 1], widthCm, depthCm, imgPts });
  }

  static fromTwoPoints(p1, p2, distCm) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return new Calibration('none', { error: '두 점이 너무 가깝습니다' });
    return new Calibration('two', {
      p1, p2, distCm, cmPerPx: distCm / len, axis: { x: dx / len, y: dy / len },
    });
  }

  /**
   * 뛰는 방향 직선 위의 «거리를 아는 점들»로 보정한다 — 제자리멀리뛰기 전용.
   *
   * 사각형(fromRect)과 달리 세로 크기를 따로 입력받지 않는다. 점마다 "발구름선에서 몇 cm" 인지가
   * 이미 정해져 있어서(0·100·200·300…), 그 값들이 곧 기준이다. 세로 기본값을 잘못 둬서
   * 5cm 점프가 300m 로 뻥튀기되던 사고를 구조적으로 없앤다.
   *
   * 원근 처리: 바닥 직선을 비스듬히 본 카메라에서 «화면상 위치 t» 와 «실제 거리 d» 는
   * 1차식이 아니라 사영변환 d = (a·t + b)/(c·t + 1) 로 이어진다(뫼비우스). 점이 3개 이상이면
   * 이 곡선을 맞춰 먼 쪽 압축까지 잡고, 2개뿐이면 c=0 인 직선(카메라 수직/원거리 가정)으로 물러선다.
   *
   * @param {{x:number,y:number,distCm:number}[]} marks  뛰는 방향으로 찍은 점들 (N>=2), distCm 오름차순 권장
   */
  static fromRuler(marks) {
    if (!marks || marks.length < 2) return new Calibration('none', { error: '점이 2개 이상 필요합니다' });
    const n = marks.length;
    // 1) 점들을 지나는 직선(뛰는 축)을 최소제곱으로 찾는다 — 손으로 찍어 살짝 어긋나도 견딘다.
    const mx = marks.reduce((s, m) => s + m.x, 0) / n;
    const my = marks.reduce((s, m) => s + m.y, 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (const m of marks) { const dx = m.x - mx, dy = m.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    if (sxx + syy < 1) return new Calibration('none', { error: '점들이 한 자리에 뭉쳐 있어요' });
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);   // 주축(공분산 큰 방향) = 직선 방향
    let ax = Math.cos(th), ay = Math.sin(th);
    const far = marks.reduce((a, b) => (b.distCm > a.distCm ? b : a));
    const origin = marks.reduce((a, b) => (b.distCm < a.distCm ? b : a));   // 보통 0cm(발구름선)
    if ((far.x - origin.x) * ax + (far.y - origin.y) * ay < 0) { ax = -ax; ay = -ay; }  // t 증가 = d 증가
    const proj = (x, y) => (x - origin.x) * ax + (y - origin.y) * ay;       // 축 위 위치(px)
    // 2) t(px) → d(cm) 사영변환 맞춤
    const T = marks.map(m => proj(m.x, m.y));
    const D = marks.map(m => m.distCm);
    let a, b, c;
    if (n === 2) {
      const slope = (D[1] - D[0]) / ((T[1] - T[0]) || 1e-9);
      a = slope; b = D[0] - slope * T[0]; c = 0;
    } else {
      // d·(c·t + 1) = a·t + b  →  [t, 1, -d·t]·[a,b,c] = d
      const sol = solveLeastSquares3(T.map((t, i) => [t, 1, -D[i] * t]), D);
      if (!sol) return new Calibration('none', { error: '점 배치가 애매해요 — 다시 찍어 주세요' });
      [a, b, c] = sol;
    }
    // 3) 사영 특이점(분모 c·t+1 = 0)이 측정 구간 안이면 값이 폭발한다 — 극점을 직접 계산해 거부한다.
    //    (여기가 5cm→300m 뻥튀기를 막는 마지막 관문이다)
    const T0 = Math.min(...T), T1 = Math.max(...T), span = (T1 - T0) || 1;
    if (Math.abs(c) > 1e-9) {
      const tPole = -1 / c;
      if (tPole >= T0 - 0.2 * span && tPole <= T1 + 0.6 * span) {
        return new Calibration('none', { error: '점이 원근으로 무너져요 — 카메라를 옆으로 더 멀리 두고 찍어 주세요' });
      }
    }
    return new Calibration('ruler', {
      marks, origin, axis: { x: ax, y: ay }, a, b, c,
      distMin: Math.min(...D), distMax: Math.max(...D),
    });
  }

  get ok() { return this.kind === 'rect' || this.kind === 'two' || this.kind === 'ruler'; }

  /** 화면 좌표 → 바닥 실좌표(cm). Y가 발구름선으로부터의 거리다. */
  toWorld(x, y) {
    if (this.kind === 'rect') {
      const [a, b, c, d, e, f, g, i] = this.h;
      const w = g * x + i * y + 1;
      if (Math.abs(w) < 1e-9) return null;
      return { x: (a * x + b * y + c) / w, y: (d * x + e * y + f) / w };
    }
    if (this.kind === 'two') {
      const vx = x - this.p1.x, vy = y - this.p1.y;
      return {
        x: (-vx * this.axis.y + vy * this.axis.x) * this.cmPerPx,   // 옆으로 벗어난 양
        y: (vx * this.axis.x + vy * this.axis.y) * this.cmPerPx,    // 뛴 방향 거리
      };
    }
    if (this.kind === 'ruler') {
      const ax = this.axis.x, ay = this.axis.y;
      const t = (x - this.origin.x) * ax + (y - this.origin.y) * ay;        // 축 위 위치(px)
      const perp = (x - this.origin.x) * (-ay) + (y - this.origin.y) * ax;  // 축에서 벗어난 양(px)
      const w = this.c * t + 1;
      if (Math.abs(w) < 1e-6) return null;
      const dist = (this.a * t + this.b) / w;                              // 뛴 방향 거리(cm)
      const cmPerPx = (this.a - this.b * this.c) / (w * w);                 // 그 지점 국소 배율
      return { x: perp * cmPerPx, y: dist };
    }
    return null;
  }

  /**
   * 실좌표(cm) → 화면 좌표. toWorld 의 역변환.
   * 바닥에 눈금을 그려 "이 숫자가 어디를 잰 것인지" 눈으로 확인시키는 데 쓴다.
   */
  toImage(X, Y) {
    if (this.kind === 'rect') {
      if (!this._inv) this._inv = invert3(this.h);
      if (!this._inv) return null;
      const [a, b, c, d, e, f, g, i, j] = this._inv;
      const w = g * X + i * Y + j;
      if (Math.abs(w) < 1e-9) return null;
      return { x: (a * X + b * Y + c) / w, y: (d * X + e * Y + f) / w };
    }
    if (this.kind === 'two') {
      const px = X / this.cmPerPx, py = Y / this.cmPerPx;
      return {
        x: this.p1.x + this.axis.x * py - this.axis.y * px,
        y: this.p1.y + this.axis.y * py + this.axis.x * px,
      };
    }
    if (this.kind === 'ruler') {
      // d·(c·t+1)=a·t+b  →  t = (d - b)/(a - d·c)
      const t = (Y - this.b) / (this.a - Y * this.c);
      if (!isFinite(t)) return null;
      const w = this.c * t + 1;
      const cmPerPx = (this.a - this.b * this.c) / (w * w);
      const perpPx = cmPerPx ? X / cmPerPx : 0;
      return {
        x: this.origin.x + this.axis.x * t - this.axis.y * perpPx,
        y: this.origin.y + this.axis.y * t + this.axis.x * perpPx,
      };
    }
    return null;
  }

  /**
   * 카메라 배치 자가진단.
   *
   * 뛰는 방향의 **축 위**(정면 또는 출발선 뒤)에 카메라를 두면 오차가 10배 이상 커진다.
   * (시뮬레이션: 옆 0.8cm vs 정면 12.8cm) 판별은 **가까운 쪽과 먼 쪽의 해상도 비율**로 한다 —
   * 옆에서 찍으면 두 값이 비슷하고(비율 1 근처), 축 위에 있으면 한쪽이 뭉개져 비율이 크게 벌어진다.
   * 절대 해상도는 줌·화면 크기에 따라 달라지므로 판정 기준으로 쓰지 않는다.
   */
  placementCheck() {
    if (this.kind !== 'rect') return null;
    const at = (Y) => {
      const a = this.toImage(this.widthCm / 2, Y), b = this.toImage(this.widthCm / 2, Y + 10);
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) / 10 : 0;
    };
    const near = at(10), far = at(Math.max(20, this.depthCm - 20));
    if (!near || !far) return null;
    const ratio = near / far;
    const kind = ratio < 0.7 ? 'front'          // 카메라가 착지 구역 너머 = 아이가 카메라를 향해 뜀
      : ratio > 2.2 ? 'behind'                  // 카메라가 출발선 뒤 = 뛰는 축 위
        : Math.min(near, far) < 0.5 ? 'lowres'  // 너무 멀거나 너무 줌아웃
          : 'ok';
    return { near, far, ratio, kind };
  }

  /** 착지 구역의 거리 해상도 (1cm 가 화면 몇 px 인가) */
  resolutionPxPerCm() {
    if (this.kind === 'ruler') {
      const Y = (this.distMin + this.distMax) / 2;
      const t = (Y - this.b) / (this.a - Y * this.c);
      const w = this.c * t + 1;
      const cmPerPx = (this.a - this.b * this.c) / (w * w);
      return cmPerPx ? Math.abs(1 / cmPerPx) : null;
    }
    if (this.kind !== 'rect') return null;
    const X = this.widthCm / 2, Y = this.depthCm * 0.6;
    const a = this.toImage(X, Y), b = this.toImage(X, Y + 10);
    if (!a || !b) return null;
    return Math.hypot(a.x - b.x, a.y - b.y) / 10;
  }

  /** 기준 범위 밖이면 오차가 커진다 — 정직하게 알리기 위한 검사 */
  outOfRange(world) {
    if (!world) return false;
    if (this.kind === 'ruler') {
      const m = 30;   // 눈금 밖 30cm 여유
      return world.y < this.distMin - m || world.y > this.distMax + m;
    }
    if (this.kind !== 'rect') return false;
    const m = 20;   // 여유 20cm
    return world.x < -m || world.x > this.widthCm + m || world.y < -m || world.y > this.depthCm + m;
  }
}

// ── 프레임 신호 ────────────────────────────────────────

/**
 * 한 사람의 landmark 에서 측정에 필요한 것만 뽑는다.
 * 화면 y는 아래로 갈수록 커진다 → 바닥에 닿은 점 = y가 가장 큰 점.
 */
export function extractFoot(pts, cfg = LJ_CONFIG) {
  const vis = (i) => pts[i] && pts[i].v >= cfg.kpVisMin;
  const avgY = (a, b) => {
    const ok = [a, b].filter(vis);
    return ok.length ? ok.reduce((s, i) => s + pts[i].y, 0) / ok.length : null;
  };

  const shoulderY = avgY(LJ_LM.lShoulder, LJ_LM.rShoulder);
  const hipY = avgY(LJ_LM.lHip, LJ_LM.rHip);
  const ankleY = avgY(LJ_LM.lAnkle, LJ_LM.rAnkle);
  if (hipY === null) return { valid: false };

  let bodyHeight = 0;
  if (ankleY !== null && shoulderY !== null) bodyHeight = ankleY - shoulderY;
  if (bodyHeight <= 1 && shoulderY !== null) bodyHeight = Math.max(hipY - shoulderY, 1) * 2.2;
  bodyHeight = Math.max(bodyHeight, 1);

  // 바닥에 닿을 수 있는 지점들 (규정상 "가장 뒤쪽 접촉점"을 찾아야 하므로 후보를 다 모은다)
  // side 와 신뢰도(v)를 함께 남긴다 — 디버그 화면에서 "왼발 181.3 / 오른발 178.7 → 최종 178.7"
  // 처럼 왜 그 값이 뽑혔는지 보여줘야 하고, 신뢰도 낮은 프레임을 걸러내는 데도 쓴다.
  const feet = [];
  for (const [i, kind, side] of [[LJ_LM.lHeel, 'heel', 'L'], [LJ_LM.rHeel, 'heel', 'R'],
                                 [LJ_LM.lFoot, 'toe', 'L'], [LJ_LM.rFoot, 'toe', 'R']]) {
    if (vis(i)) feet.push({ x: pts[i].x, y: pts[i].y, kind, side, v: pts[i].v });
  }
  // 발목은 바닥에서 8cm 쯤 위라 그대로 쓰면 거리가 과대평가된다 — 발이 안 보일 때만 쓴다
  if (!feet.length) {
    for (const [i, side] of [[LJ_LM.lAnkle, 'L'], [LJ_LM.rAnkle, 'R']]) {
      if (vis(i)) feet.push({ x: pts[i].x, y: pts[i].y, kind: 'ankle', side, v: pts[i].v });
    }
  }
  if (!feet.length) return { valid: false };

  const lowestY = Math.max(...feet.map(p => p.y));       // 가장 아래 = 접지면
  const hands = [];
  for (const [i, side] of [[LJ_LM.lWrist, 'L'], [LJ_LM.rWrist, 'R']]) {
    // 착지 후 뒤로 손을 짚으면 규정상 그 지점이 기록이 된다
    if (vis(i) && pts[i].y > lowestY - bodyHeight * cfg.handTouchRatio) {
      hands.push({ x: pts[i].x, y: pts[i].y, kind: 'hand', side, v: pts[i].v });
    }
  }

  return {
    valid: true, bodyHeight, feet, hands, lowestY,
    footX: feet.reduce((s, p) => s + p.x, 0) / feet.length,
    conf: feet.reduce((s, p) => s + (p.v ?? 1), 0) / feet.length,
  };
}

// ── 한 시기(試技) 측정 ─────────────────────────────────

export class LongJumpSession {
  constructor(cfg = LJ_CONFIG, calibration = null) {
    // 일부만 넘겨도 나머지는 기본값을 쓴다. 복사본을 갖기 때문에,
    // 밖에서 설정을 바꿨다면 setConfig() 로 알려줘야 한다 (보정값이 그렇다).
    this.cfg = { ...LJ_CONFIG, ...cfg };
    this.cal = calibration;
    this.state = LJ_STATES.WAIT;
    this.attempts = [];
    this._fps = 0;
    this._reset();
  }

  /** 착지 뒤 더 볼 프레임 수 — 실제 fps 에 맞춘다 (30fps: 6장, 60fps: 12장) */
  get postFrames() {
    const fps = this._fps || 30;
    const n = Math.round((this.cfg.landPostS ?? 0.2) * fps);
    return Math.max(this.cfg.landPostMinFrames ?? 3, Math.min(this.cfg.landPostMaxFrames ?? 12, n));
  }

  /** 측정 중에 바뀔 수 있는 설정(보정값 등)을 반영한다 */
  setConfig(patch) { this.cfg = { ...this.cfg, ...patch }; return this.cfg; }

  setCalibration(cal) { this.cal = cal; this.reset(); }

  _reset() {
    this.setY = null;          // 준비 자세일 때 발의 화면 y (도약 판정 기준)
    this.setWorld = null;      // 준비 자세일 때 발의 실좌표
    this._still = 0;
    this._rise = 0;
    this._landStill = 0;
    this._prevLowest = null;
    this._prevX = null;
    this._prevRaw = null;
    this._prevT = null;
    this._lowBuf = [];
    this._xBuf = [];
    this._descFrames = 0;
    this._takeoffAt = 0;
    this._landBuf = [];
    this._landAt = null;        // 착지로 판정된 시각 (그 뒤 프레임을 더 모으는 중이면 non-null)
    this._landIdx = null;       // 버퍼에서 착지로 판정된 프레임의 위치
    this.foulAtSet = false;
    this.result = null;
    this.warning = null;
  }

  reset() {
    this.state = LJ_STATES.WAIT;
    this._reset();
  }

  /** 여러 명이 잡히면 가장 크게 보이는(=가까운) 한 명만 측정한다 */
  static pick(observations) {
    let best = null;
    for (const o of observations) {
      if (!o.sig?.valid) continue;
      if (!best || o.sig.bodyHeight > best.sig.bodyHeight) best = o;
    }
    return best;
  }

  update(observations, now) {
    const obs = LongJumpSession.pick(observations);
    if (!obs) {
      if (this.state === LJ_STATES.SET || this.state === LJ_STATES.WAIT) this.state = LJ_STATES.WAIT;
      return this.snapshot();
    }
    const s = obs.sig;
    const bh = s.bodyHeight;

    // 실제 프레임 속도를 재둔다 — 착지 뒤 몇 장을 더 볼지가 여기에 달렸다
    if (this._prevT !== null) {
      const dt = now - this._prevT;
      if (dt > 0.002 && dt < 0.5) this._fps = this._fps ? this._fps * 0.8 + (1 / dt) * 0.2 : 1 / dt;
    }
    this._prevT = now;

    // keypoint 는 프레임마다 몇 픽셀씩 떨린다. 상태 판정은 중앙값으로 걸러진 값으로 한다.
    // (측정값 자체는 착지 프레임들의 중앙값을 따로 쓴다 — _measure 참조)
    this._lowBuf.push(s.lowestY); if (this._lowBuf.length > 3) this._lowBuf.shift();
    this._xBuf.push(s.footX); if (this._xBuf.length > 3) this._xBuf.shift();
    const lowest = median(this._lowBuf);
    const footX = median(this._xBuf);

    // "멈췄다"는 판정에 세로만 보면 안 된다. 점프 정점에서는 세로 속도가 0이라
    // 공중에 떠 있는 순간을 착지로 오판한다 (실제로 34cm씩 틀렸다).
    // 가로 이동까지 함께 본다 — 공중에서는 몸이 앞으로 계속 나아간다.
    const move = this._prevLowest === null ? 0
      : Math.hypot(lowest - this._prevLowest, footX - this._prevX);
    // 내려오는 중인가 (화면 y가 커지는 방향) — 착지는 반드시 하강 뒤에 온다
    const falling = this._prevLowest !== null && (lowest - this._prevLowest) > 0.004 * bh;
    if (falling) this._descFrames++;
    else if (move > this.cfg.landMoveRatio * bh) this._descFrames = 0;

    // 스무딩된 값은 한 프레임 늦게 반응한다. 도약 첫 프레임에서 "아직 서 있다"고 잘못 보면
    // 공중에 뜬 자세로 준비 기준을 다시 잡아버린다 (파울 판정이 통째로 날아갔다).
    // 그래서 "확실히 움직였다"는 판단만은 원본 좌표로 한다.
    const rawMove = this._prevRaw === null ? 0
      : Math.hypot(s.lowestY - this._prevRaw.y, s.footX - this._prevRaw.x);
    this._prevRaw = { x: s.footX, y: s.lowestY };
    const movedForReal = rawMove > this.cfg.stillMoveRatio * bh * 2;

    this._prevLowest = lowest;
    this._prevX = footX;
    s.lowestY = lowest;

    switch (this.state) {
      case LJ_STATES.WAIT:
      case LJ_STATES.SET: {
        // 발이 멈춰 있으면 준비 완료 — 그때의 발 위치가 도약 기준이 된다
        if (move <= this.cfg.stillMoveRatio * bh && !movedForReal) this._still++;
        else this._still = 0;

        if (this._still >= this.cfg.stillFrames) {
          this.setY = s.lowestY;
          this.setWorld = this.cal?.ok ? this.cal.toWorld(s.footX, s.lowestY) : null;
          // 파울 = 발의 **가장 앞쪽**(발끝)이 발구름선을 넘은 상태 (실좌표 Y > 0)
          this.foulAtSet = this._frontMost(s) > 0;
          this.state = LJ_STATES.SET;
        }

        // 준비 상태에서 발이 뜨면 도약
        if (this.state === LJ_STATES.SET && this.setY !== null
            && this.setY - s.lowestY >= this.cfg.takeoffRiseRatio * bh) {
          this._rise++;
          if (this._rise >= this.cfg.takeoffConfirmFrames) {
            this.state = LJ_STATES.FLIGHT;
            this._takeoffAt = now;
            this._landStill = 0;
            this._landBuf = [];
            this.result = null;
          }
        } else {
          this._rise = 0;
        }
        break;
      }

      case LJ_STATES.FLIGHT: {
        const flight = now - this._takeoffAt;
        if (this._landAt === null && flight > this.cfg.maxFlightS) {   // 너무 오래 = 측정 실패
          this.state = LJ_STATES.WAIT;
          this._reset();
          this.warning = '측정에 실패했습니다 — 다시 서 주세요';
          break;
        }
        // 발이 다시 멈추면 착지
        if (move <= this.cfg.landMoveRatio * bh) this._landStill++;
        else this._landStill = 0;

        // 프레임을 통째로 쌓는다 — 나중에 "어느 프레임이 가장 안정적이었나"를 되돌아보기 위해서다
        // contacts = 바닥에 닿았다고 볼 수 있는 점들(측정에 쓴다)
        // feet = 보이는 발 점 전부(왼발·오른발을 따로 보여주는 데 쓴다 — 뜬 발도 화면에는 나와야 한다)
        this._landBuf.push({
          t: now, contacts: this._contacts(s), feet: s.feet ?? [],
          lowestY: s.lowestY, footX, conf: s.conf ?? 1, bh,
        });
        if (this._landBuf.length > this.cfg.landBufFrames) {
          this._landBuf.shift();
          if (this._landIdx !== null) this._landIdx--;
        }

        // 하강을 거친 뒤 멈춰야 착지다 (정점에서 잠깐 멈춘 것과 구분)
        if (this._landAt === null
            && this._landStill >= this.cfg.landStillFrames && flight >= this.cfg.minFlightS
            && this._descFrames >= this.cfg.descentFrames) {
          // 여기서 바로 재지 않는다. 착지 뒤 몇 프레임을 더 본 다음 가장 안정적인 구간을 고른다.
          this._landAt = now;
          this._landIdx = this._landBuf.length - 1;
        }

        if (this._landAt !== null) {
          const after = this._landBuf.length - 1 - this._landIdx;
          if (after >= this.postFrames || now - this._landAt > this.cfg.landPostMaxS) {
            this._measure(now);
            this.state = LJ_STATES.RESULT;
          }
        }
        break;
      }

      case LJ_STATES.RESULT: {
        // 결과를 보여주는 동안, 사람이 다시 제자리에 서면 다음 시기를 받는다.
        // (멈춰 있는 시간은 쿨다운 중에도 쌓는다 — 안 그러면 연속 시기가 안 잡힌다)
        if (move <= this.cfg.stillMoveRatio * bh) this._still++;
        else this._still = 0;

        const since = this.result?.landedAt ?? this.result?.at ?? 0;
        if (this._still >= this.cfg.stillFrames && now - since > this.cfg.cooldownS) {
          const keep = this.result;
          this._reset();
          this.result = keep;                // 화면에는 직전 기록을 계속 보여준다
          this.state = LJ_STATES.WAIT;
        }
        break;
      }
    }
    return this.snapshot();
  }

  /** 지금 접지 지점 중 가장 앞쪽(발구름선 너머)의 실좌표 Y — 파울 판정용 */
  _frontMost(s) {
    if (!this.cal?.ok) return -Infinity;
    let front = -Infinity;
    for (const p of this._contacts(s)) {
      const w = this.cal.toWorld(p.x, p.y);
      if (w && w.y > front) front = w.y;
    }
    return front;
  }

  /** 이 프레임에서 바닥에 닿아 있다고 볼 수 있는 지점들 */
  _contacts(s) {
    const near = s.lowestY - s.bodyHeight * 0.035;     // 가장 아래에서 키의 3.5% 안쪽만 접지로 인정
    return [...s.feet, ...s.hands].filter(p => p.y >= near);
  }

  /**
   * 한 창(연속 프레임 묶음) 안에서 거리를 뽑는다.
   * 규정상 **발구름선에 가장 가까운 접촉점**이 기록이다 (뒤꿈치가 보통이지만 뒤로 짚은 손도 기록이 된다).
   *
   * @returns {null|{raw:number, kind:string, side:string, leftRaw:?number, rightRaw:?number,
   *                 img:{x,y}, world:{x,y}, spreadCm:number, conf:number}}
   */
  _windowDistance(win) {
    const perFrame = [], picks = [], leftYs = [], rightYs = [];
    for (const f of win) {
      let best = null;
      for (const p of f.contacts) {
        const w = this.cal.toWorld(p.x, p.y);
        if (!w) continue;
        if (!best || w.y < best.w.y) best = { w, p };
      }
      if (best) { perFrame.push(best.w.y); picks.push(best); }

      // 왼발·오른발 뒤꿈치를 따로 남긴다 — "LEFT 181.3 / RIGHT 178.7 → FINAL 178.7" 처럼
      // 왜 그 값이 뽑혔는지 보이게 하기 위해서다. 여기서는 접지 판정으로 걸러내지 않는다
      // (뜬 발도 화면에는 보여줘야 비교가 된다).
      for (const p of f.feet) {
        if (p.kind !== 'heel') continue;
        const w = this.cal.toWorld(p.x, p.y);
        if (w) (p.side === 'L' ? leftYs : rightYs).push(w.y);
      }
    }
    if (!perFrame.length) return null;

    const mid = picks[Math.min(picks.length - 1, Math.floor(picks.length / 2))];
    return {
      raw: median(perFrame),
      kind: mid.p.kind,
      side: mid.p.side ?? null,
      leftRaw: leftYs.length ? median(leftYs) : null,
      rightRaw: rightYs.length ? median(rightYs) : null,
      img: { x: mid.p.x, y: mid.p.y },
      world: { x: mid.w.x, y: mid.w.y },
      spreadCm: Math.max(...perFrame) - Math.min(...perFrame),
      conf: win.reduce((a, f) => a + f.conf, 0) / win.length,
    };
  }

  /**
   * 착지 프레임 고르기 + 거리 계산.
   *
   * 착지로 판정된 프레임 하나만 믿지 않는다. 그 앞뒤 구간에서 **연속 프레임의 흔들림이 가장 작은 창**을
   * 찾아 그 창의 중앙값을 쓴다. 발이 실제로 바닥에 안착한 구간이 흔들림이 가장 작기 때문이다.
   * (착지 직전 프레임은 아직 공중이고, 한참 뒤 프레임은 이미 일어서는 중이라 둘 다 흔들린다)
   */
  _measure(now) {
    const buf = this._landBuf;
    if (!buf.length || !this.cal?.ok) {
      this.result = { at: now, distanceCm: null, error: '측정 실패 (기준 설정이 필요합니다)' };
      return;
    }
    const cfg = this.cfg;
    const li = this._landIdx ?? buf.length - 1;
    const from = Math.max(0, li - cfg.landPreFrames);
    const to = Math.min(buf.length - 1, li + this.postFrames);
    const W = Math.max(1, cfg.landWindow);

    const candidates = [];
    for (let st = from; st + W - 1 <= to; st++) {
      const win = buf.slice(st, st + W);
      if (win.some(f => !f.contacts.length)) continue;
      const ys = win.map(f => f.lowestY);
      const bh = win[0].bh || 1;
      const shake = (Math.max(...ys) - Math.min(...ys)) / bh;    // 키 대비 흔들림 (기기·거리와 무관해진다)
      const d = this._windowDistance(win);
      if (!d) continue;
      candidates.push({ start: st, offset: st - li, shake, ...d });
    }

    if (!candidates.length) {
      this.result = { at: now, distanceCm: null, error: '착지 지점을 찾지 못했습니다' };
      return;
    }

    // 두 단계로 고른다.
    //
    // ① 믿을 수 있는 창만 남긴다 — **발이 바닥에 있고**(공중 프레임 배제) **흔들림이 작은**(포즈가
    //    튀지 않은) 창. 공중 프레임을 그대로 쓰면 아직 덜 간 위치를 기록해버린다.
    // ② 그중에서 **발구름선에 가장 가까운** 값을 쓴다 — 이게 규정이다.
    //
    // ②가 중요한 이유: 착지 뒤 발이 앞으로 밀리면 나중 프레임일수록 안정적이면서 **더 멀게** 나온다.
    // "가장 안정적인 창"만 보고 고르면 그 밀린 값을 기록하게 된다(실측 비교에서 실제로 나빠졌다).
    // 규정은 처음 닿은 자리, 즉 선에 가장 가까운 접촉점이다.
    const floorY = Math.max(...buf.slice(from, to + 1).map(f => f.lowestY));   // 화면에서 가장 아래 = 바닥에 닿은 상태
    const bh0 = buf[li]?.bh || 1;
    const grounded = candidates.filter(c => {
      const win = buf.slice(c.start, c.start + W);
      const meanLow = win.reduce((a, f) => a + f.lowestY, 0) / win.length;
      return meanLow >= floorY - 0.02 * bh0;
    });
    const pool = grounded.length ? grounded : candidates;

    const minShake = Math.min(...pool.map(c => c.shake));
    const steady = pool.filter(c => c.shake <= Math.max(minShake * 2, 0.008));
    // 후보 중 '가장 작은 값'을 그냥 고르면 후보가 많을수록 값이 낮게 쏠린다(최솟값 선택 편향).
    // 그래서 **처음 바닥에 닿은 순간**에 가장 가까운 창을 쓴다 — 규정이 말하는 그 순간이고,
    // 후보 개수와도 무관하다. (착지 판정은 '발이 멈춘 뒤'라 실제 접지보다 몇 프레임 늦다)
    let touch = li;
    for (let k = from; k <= to; k++) {
      const a = buf[k], b = buf[k + 1];
      // 한 프레임만 튀어 바닥에 닿은 것처럼 보일 수 있으니 두 프레임 연속을 본다
      if (a && b && a.lowestY >= floorY - 0.02 * bh0 && b.lowestY >= floorY - 0.02 * bh0) { touch = k; break; }
    }
    const usable = steady.length ? steady : pool;
    const best = usable.reduce((m, c) =>
      (Math.abs(c.start - touch) < Math.abs(m.start - touch) ? c : m));

    const distance = applyCorrection(best.raw, cfg);
    const out = this.cal.outOfRange(best.world);
    const plaus = plausibleDistance(distance);
    const spread = best.spreadCm;

    this.result = {
      at: now,
      landedAt: this._landAt ?? now,     // 실제로 발이 닿은 시각. 측정은 뒤 프레임을 더 본 뒤라 이보다 늦다
      distanceCm: Math.round(distance * 10) / 10,
      flightS: Math.round(((this._landAt ?? now) - this._takeoffAt) * 100) / 100,
      contactKind: best.kind,
      contactSide: best.side,
      // 화면 어디를 재서 나온 값인지 — "그 숫자가 맞나"를 눈으로 확인할 수 있어야 한다
      contactImg: best.img,
      contactWorld: best.world,
      // 왼발·오른발 각각의 값과 최종 채택 근거 (개발자 모드 표시용)
      leftCm: best.leftRaw === null ? null : Math.round(applyCorrection(best.leftRaw, cfg) * 10) / 10,
      rightCm: best.rightRaw === null ? null : Math.round(applyCorrection(best.rightRaw, cfg) * 10) / 10,
      confidence: Math.round(best.conf * 100) / 100,
      // 착지 프레임 선택 근거
      frameOffset: best.offset,                      // 착지 판정 프레임 기준 몇 프레임 떨어진 창을 골랐나
      shake: Math.round(best.shake * 1000) / 1000,   // 그 창의 흔들림 (작을수록 안정)
      candidates: candidates.map(c => ({
        offset: c.offset, shake: Math.round(c.shake * 1000) / 1000,
        cm: Math.round(applyCorrection(c.raw, cfg) * 10) / 10,
        grounded: grounded.includes(c),
        chosen: c.start === best.start,
      })),
      foul: this.foulAtSet,
      spreadCm: Math.round(spread * 10) / 10,        // 창 안 프레임 간 흔들림 = 이 측정의 불안정도
      outOfRange: out,
      implausible: !plaus.ok,
      warning: !plaus.ok ? plaus.reason
        : out ? '착지점이 기준 사각형 밖입니다 — 오차가 커집니다'
          : (spread > 5 ? '착지 순간이 흔들렸습니다 — 다시 재보세요' : null),
    };
    this.attempts.push(this.result);
  }

  snapshot() {
    return {
      state: this.state,
      calibrated: !!this.cal?.ok,
      setReady: this.state === LJ_STATES.SET,
      foulAtSet: this.foulAtSet,
      result: this.result,
      attempts: this.attempts,
      best: this.attempts.reduce((m, a) => (a.distanceCm && !a.foul && !a.implausible && (!m || a.distanceCm > m) ? a.distanceCm : m), null),
      warning: this.warning,
    };
  }
}
