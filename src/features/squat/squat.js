// 카메라로 스쿼트를 세는 판정 로직 — 화면·모델과 분리한 순수 로직이다.
//
// 들어오는 것: 자세 인식이 준 landmark(픽셀 좌표 + 신뢰도)와 시각
// 나가는 것  : micro:bit 판과 **똑같은 모양의 메시지** {count, pitch, state, depth}
//              → 그래서 리듬 판정(rhythm.js)과 게임 규칙(game.js)을 그대로 쓸 수 있다
//
// 판정의 뼈대
//   · 모든 길이는 **그 사람의 키(어깨~발목) 대비 비율**로 본다. 절대 픽셀은 카메라 거리에 흔들린다.
//   · 두 가지 근거를 함께 본다 — ① 엉덩이가 얼마나 내려갔나 ② 무릎이 얼마나 굽었나.
//     다리가 화면에 안 잡히는 교실 배치가 흔해서, 무릎을 못 보면 ①만으로도 굴러가야 한다.
//   · 앉았다 **일어선 순간**에 +1 한다 (micro:bit 판과 같은 규칙).

export const SQUAT_CONFIG = {
  downRatio: 0.085,      // 엉덩이가 키의 이만큼 내려가면 '앉음' (140cm 아이의 약 12cm)
  upRatio: 0.035,        // 이만큼까지 돌아오면 '일어섬'
  downKnee: 135,         // 무릎 각도가 이보다 작으면 앉은 것 (보이는 경우에만)
  upKnee: 158,           // 이보다 크면 선 것
  minRepS: 0.30,         // 이보다 짧은 사이클은 흔들림으로 본다
  maxRepS: 6.0,          // 이보다 길면 쉬는 것 — 사이클을 버린다
  cooldownS: 0.25,
  minDepthRatio: 0.10,   // 이 깊이는 넘어야 한 개로 센다
  baselineFrames: 12,    // 서 있는 자세를 이만큼 모아 기준으로 삼는다
  baselineDrift: 0.02,   // 서 있는 동안 기준선을 아주 천천히 따라간다
  visMin: 0.5,
  pitchFullRatio: 0.26,  // 이 깊이를 90° 로 환산한다 (micro:bit 게이지와 눈금을 맞추기 위해)

  // ── 여러 명 · 준비 · 카운트다운 ─────────────────────
  maxPeople: 4,
  matchMaxDistRatio: 0.6,   // 같은 사람으로 볼 최대 이동거리 (키 대비)
  matchSizeWeight: 0.9,     // 키 차이도 함께 본다 (작은 아이가 큰 아이 번호를 뺏지 않게)
  matchAmbiguityMargin: 0.3,// 1·2등 후보가 이만큼 안에서 붙으면 **아무에게도 안 준다**
  velocitySmooth: 0.5,      // 다음 위치 예측용 속도 평활
  minTrackFrames: 6,        // 이만큼 연속으로 보여야 '참가자'로 인정 (유령 인식 차단)
  trackLostS: 3.0,          // 이 시간 안 보이면 자리에서 뺀다
  readyMarginRatio: 0.03,   // 손목이 어깨보다 이만큼(키 대비) 위여야 '들었다'
  readyHoldFrames: 5,       // 연속 몇 프레임 유지해야 준비 확정
  readyReleaseFrames: 10,   // 이만큼 내려가 있어야 준비 해제
  countdownS: 3,            // 모두 준비되면 3·2·1
};

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

/** BlazePose 33 landmark 인덱스 */
export const LM = {
  nose: 0, lShoulder: 11, rShoulder: 12, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
};

/** 세 점이 이루는 각도(도) — 무릎이면 b 가 무릎이다 */
export function angleAt(a, b, c) {
  if (!a || !b || !c) return null;
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const n1 = Math.hypot(v1.x, v1.y), n2 = Math.hypot(v2.x, v2.y);
  if (n1 < 1e-6 || n2 < 1e-6) return null;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (n1 * n2)));
  return Math.acos(cos) * 180 / Math.PI;
}

/** landmark 배열에서 판정용 신호를 뽑는다 */
export function extractSquat(pts, cfg = SQUAT_CONFIG) {
  if (!pts || pts.length < 29) return { valid: false };
  const vis = (i) => pts[i] && (pts[i].v ?? 1) >= cfg.visMin;
  const mid = (a, b) => {
    const ok = [a, b].filter(vis);
    if (!ok.length) return null;
    return { x: avg(ok.map(i => pts[i].x)), y: avg(ok.map(i => pts[i].y)) };
  };
  const hip = mid(LM.lHip, LM.rHip);
  const shoulder = mid(LM.lShoulder, LM.rShoulder);
  if (!hip || !shoulder) return { valid: false };
  const knee = mid(LM.lKnee, LM.rKnee);
  const ankle = mid(LM.lAnkle, LM.rAnkle);

  // 키 — 발목이 안 보이면 몸통으로 어림잡는다 (교실에서 다리가 잘리는 배치가 흔하다)
  let bodyHeight = ankle ? ankle.y - shoulder.y : (hip.y - shoulder.y) * 2.2;
  bodyHeight = Math.max(bodyHeight, 1);

  // 무릎 각도 — 좌우 각각 보이는 것만
  const sideAngle = (h, k, a) => (vis(h) && vis(k) && vis(a)
    ? angleAt(pts[h], pts[k], pts[a]) : null);
  const kneeL = sideAngle(LM.lHip, LM.lKnee, LM.lAnkle);
  const kneeR = sideAngle(LM.rHip, LM.rKnee, LM.rAnkle);
  const kneeAngle = kneeL !== null && kneeR !== null ? (kneeL + kneeR) / 2 : (kneeL ?? kneeR);

  // 준비 자세 — **오른손**을 든다. landmark 는 해부학 기준(그 사람의 오른손)이라
  // 화면이 좌우로 뒤집혀도 판정이 바뀌지 않는다.
  const margin = bodyHeight * cfg.readyMarginRatio;
  const rightUp = vis(LM.rWrist) && vis(LM.rShoulder)
    && pts[LM.rWrist].y < pts[LM.rShoulder].y - margin;

  return {
    valid: true, hipY: hip.y, shoulderY: shoulder.y, centerX: hip.x,
    kneeY: knee ? knee.y : null, ankleY: ankle ? ankle.y : null,
    kneeAngle, bodyHeight, rightUp,
    legsVisible: kneeAngle !== null,
    conf: avg([LM.lHip, LM.rHip, LM.lShoulder, LM.rShoulder].map(i => pts[i]?.v ?? 0)),
  };
}

const GROUND = 'GROUND', DOWN = 'DOWN';

/**
 * 한 사람의 스쿼트 카운터.
 * micro:bit 판과 같은 모양의 메시지를 내보내므로 게임 쪽은 손댈 것이 없다.
 */
export class SquatCounter {
  constructor(cfg = {}) {
    this.cfg = { ...SQUAT_CONFIG, ...cfg };
    this.reset();
  }

  reset() {
    this.count = 0;
    this.state = GROUND;
    this.baseline = null;        // 서 있을 때의 엉덩이 y
    this._samples = [];
    this._downAt = 0;
    this._maxDrop = 0;
    this._minKnee = 180;
    this._lastCountAt = -99;
    this.dropRatio = 0;
    this.kneeAngle = null;
    this.legsVisible = false;
    this.lastRepS = null;
  }

  /** 기준(서 있는 자세)을 다시 잡는다 */
  recapture() { this.baseline = null; this._samples = []; }

  /**
   * 프레임 하나를 먹인다.
   * @returns {{count:number,pitch:number,state:'UP'|'DOWN',depth:number}|null} 상태가 바뀐 순간에만
   */
  update(sig, now) {
    if (!sig || !sig.valid) return null;
    const c = this.cfg;
    const bh = sig.bodyHeight;
    this.legsVisible = sig.legsVisible;
    this.kneeAngle = sig.kneeAngle;

    // 기준 잡기 — 서 있는 프레임을 모은다
    if (this.baseline === null) {
      this._samples.push(sig.hipY);
      if (this._samples.length > c.baselineFrames) this._samples.shift();
      if (this._samples.length >= c.baselineFrames) {
        const s = [...this._samples].sort((a, b) => a - b);
        this.baseline = s[s.length >> 1];        // 평균이 아니라 중앙값 — 한 프레임만 튀어도 기준이 어긋난다
      }
      return null;
    }

    const drop = (sig.hipY - this.baseline) / bh;   // 내려갈수록 +
    this.dropRatio = drop;
    const kneeDown = sig.kneeAngle !== null && sig.kneeAngle <= c.downKnee;
    const kneeUp = sig.kneeAngle === null || sig.kneeAngle >= c.upKnee;

    if (this.state === GROUND) {
      // 서 있는 동안 기준선을 아주 천천히 따라간다 (카메라가 흔들리거나 자리를 옮겨도 버틴다)
      if (Math.abs(drop) < c.upRatio) {
        this.baseline = (1 - c.baselineDrift) * this.baseline + c.baselineDrift * sig.hipY;
      }
      if ((drop >= c.downRatio || kneeDown) && now - this._lastCountAt >= c.cooldownS) {
        this.state = DOWN;
        this._downAt = now;
        this._maxDrop = drop;
        this._minKnee = sig.kneeAngle ?? 180;
        return { count: this.count, pitch: this._pitch(drop), state: 'DOWN', depth: this._pitch(drop) };
      }
      return null;
    }

    // 앉아 있는 동안 — 가장 깊었던 지점을 기억한다
    this._maxDrop = Math.max(this._maxDrop, drop);
    if (sig.kneeAngle !== null) this._minKnee = Math.min(this._minKnee, sig.kneeAngle);

    if (now - this._downAt > c.maxRepS) {           // 너무 오래 앉아 있다 = 쉬는 중
      this.state = GROUND;
      this.baseline = null; this._samples = [];     // 자세가 달라졌을 수 있으니 기준을 다시
      return null;
    }

    if (drop <= c.upRatio && kneeUp) {
      const dur = now - this._downAt;
      this.state = GROUND;
      const deepEnough = this._maxDrop >= c.minDepthRatio
        || (this._minKnee <= c.downKnee - 5);
      if (dur >= c.minRepS && deepEnough && now - this._lastCountAt >= c.cooldownS) {
        this.count++;
        this._lastCountAt = now;
        this.lastRepS = dur;
        return { count: this.count, pitch: this._pitch(drop), state: 'UP', depth: this._pitch(this._maxDrop) };
      }
      return null;                                   // 얕게 까딱한 것 — 세지 않는다
    }
    return null;
  }

  /** 깊이 비율을 micro:bit 판과 같은 0~90 눈금으로 바꾼다 (화면 게이지를 공유하기 위해) */
  _pitch(ratio) {
    return Math.max(0, Math.min(90, (ratio / this.cfg.pitchFullRatio) * 90));
  }
}

// ── 여러 명 · 준비 · 카운트다운 ─────────────────────────
//
// 교실에서 여러 명이 한 화면에 들어온다. 그러면 세 가지가 필요하다.
//   ① 프레임이 바뀌어도 **같은 사람을 같은 번호로** 유지 (자세 인식은 순서를 보장하지 않는다)
//   ② **오른손을 들면 준비 완료** — 아이가 스스로 "나 준비됐다"를 말하는 방법
//   ③ **모두 준비되면 3·2·1** 후 동시에 시작
//
// 준비 자세를 오른손으로 정한 이유: 앉았다 일어설 때 팔은 앞으로 나오지 위로 올라가지 않는다.
// 그래서 게임 중에 실수로 '준비'가 다시 잡히지 않는다.

const WAITING = 'WAITING', COUNTDOWN = 'COUNTDOWN', RUNNING = 'RUNNING';
export const SESSION_STATES = { WAITING, COUNTDOWN, RUNNING };

class Person {
  constructor(id, now, cfg) {
    this.id = id;
    this.cfg = cfg;
    this.counter = new SquatCounter(cfg);
    this.firstSeen = now;
    this.lastSeen = now;
    this.frames = 0;
    this.ready = false;
    this.lastX = 0; this.lastY = 0; this.bodyHeight = 1;
    this.vx = 0; this.vy = 0;          // 직전 속도 — 다음 위치를 예측해 교차 상황을 버틴다
    this.heldFrames = 0;               // 애매해서 이번 프레임에 안 붙인 횟수
    this.sig = null;
    this._readyFrames = 0;
    this._releaseFrames = 0;
  }
  /** 충분히 오래 보였는가 — 스쳐 지나간 사람을 참가자로 만들지 않는다 */
  get established() { return this.frames >= this.cfg.minTrackFrames; }
  expired(now) { return now - this.lastSeen > this.cfg.trackLostS; }
}

export class SquatSession {
  constructor(cfg = {}) {
    this.cfg = { ...SQUAT_CONFIG, ...cfg };
    this.people = new Map();
    this.state = WAITING;
    this.nextId = 1;
    this.countdownEndsAt = null;
    this.startedAt = null;
  }

  reset() {
    this.state = WAITING;
    this.countdownEndsAt = null;
    this.startedAt = null;
    for (const p of this.people.values()) { p.ready = false; p._readyFrames = 0; p.counter.reset(); }
  }

  /** 참가자(충분히 보인 사람)들 */
  get participants() { return [...this.people.values()].filter(p => p.established); }

  /**
   * 한 프레임의 모든 사람을 먹인다.
   * @param {Array<{pts:Array, sig:object}>} obs 인식된 사람들
   * @returns {{people:Array, state:string, countdownLeft:number|null, started:boolean, messages:Array}}
   */
  update(obs, now) {
    const c = this.cfg;
    const valid = (obs || []).filter(o => o.sig && o.sig.valid);
    const used = new Set();

    // ① 기존 사람에게 관측을 붙인다.
    //
    // 순서대로 "각자 제일 가까운 것"을 집으면 **먼저 처리된 사람이 남의 자리를 뺏는다.**
    // 그래서 모든 짝의 비용을 먼저 구해 **싼 것부터** 배정한다. 비용에는 거리뿐 아니라
    // **키 차이**도 넣는다 — 큰 아이와 작은 아이가 스쳐도 서로 바뀌지 않는다.
    //
    // 그리고 1등과 2등 후보가 비슷하게 붙으면(= 두 사람이 겹쳐 누가 누군지 애매하면)
    // **아무에게도 안 붙인다.** 잘못 붙이면 그 순간부터 두 아이의 횟수가 뒤섞이는데,
    // 안 붙이면 그 프레임만 건너뛰고 (3초 안에 다시 보이면) 번호가 그대로 유지된다.
    const cands = [];
    for (const p of this.people.values()) {
      const dt = Math.max(0, Math.min(0.5, now - p.lastSeen));
      const predX = p.lastX + p.vx * dt, predY = p.lastY + p.vy * dt;
      for (let i = 0; i < valid.length; i++) {
        const s = valid[i].sig;
        const scale = Math.max(p.bodyHeight, s.bodyHeight, 1);
        const dist = Math.hypot(s.centerX - predX, s.hipY - predY) / scale;
        if (dist > c.matchMaxDistRatio) continue;
        const sizeDiff = Math.abs(p.bodyHeight - s.bodyHeight) / scale;
        cands.push({ p, i, cost: dist + sizeDiff * c.matchSizeWeight });
      }
    }
    cands.sort((a, b) => a.cost - b.cost);

    const pairs = [];
    const takenTracks = new Set();
    for (const cd of cands) {
      if (takenTracks.has(cd.p.id) || used.has(cd.i)) continue;
      // 같은 사람(또는 같은 관측)을 두고 다투는 다음 후보
      const rival = cands.find(o => o !== cd && !takenTracks.has(o.p.id) && !used.has(o.i)
        && (o.p.id === cd.p.id || o.i === cd.i));
      if (rival && rival.cost <= cd.cost * (1 + c.matchAmbiguityMargin)) {
        // 애매하다 — 이번 프레임은 건너뛴다 (번호를 바꾸느니 잠깐 비운다)
        cd.p.heldFrames++;
        takenTracks.add(cd.p.id);
        used.add(cd.i);
        continue;
      }
      takenTracks.add(cd.p.id);
      used.add(cd.i);
      cd.p.heldFrames = 0;
      pairs.push([cd.p, valid[cd.i]]);
    }

    // ② 남은 관측 = 새로 들어온 사람 (정원까지만)
    for (let i = 0; i < valid.length; i++) {
      if (used.has(i)) continue;
      if (this.people.size >= c.maxPeople) continue;
      const p = new Person(this.nextId++, now, this.cfg);
      this.people.set(p.id, p);
      pairs.push([p, valid[i]]);
    }

    // ③ 각자 갱신 — 준비 자세와 스쿼트 세기
    const messages = [];
    for (const [p, o] of pairs) {
      const dt = Math.max(1e-3, Math.min(0.5, now - p.lastSeen));
      const vx = (o.sig.centerX - p.lastX) / dt, vy = (o.sig.hipY - p.lastY) / dt;
      if (p.frames > 0) {
        p.vx = (1 - c.velocitySmooth) * p.vx + c.velocitySmooth * vx;
        p.vy = (1 - c.velocitySmooth) * p.vy + c.velocitySmooth * vy;
      }
      p.lastSeen = now;
      p.frames++;
      p.sig = o.sig;
      p.lastX = o.sig.centerX;
      p.lastY = o.sig.hipY;
      p.bodyHeight = o.sig.bodyHeight;

      // 준비 — 시작 전에만 판정한다 (게임 중에는 손을 들어도 아무 일 없다)
      if (this.state === WAITING) {
        if (o.sig.rightUp) {
          p._readyFrames++; p._releaseFrames = 0;
          if (p._readyFrames >= c.readyHoldFrames) p.ready = true;
        } else {
          p._releaseFrames++; p._readyFrames = 0;
          if (p._releaseFrames >= c.readyReleaseFrames) p.ready = false;
        }
      }

      // 스쿼트는 시작 전에도 계속 읽는다 (기준선을 미리 잡아둬야 시작하자마자 셀 수 있다)
      const msg = p.counter.update(o.sig, now);
      if (msg && this.state === RUNNING) messages.push({ id: p.id, msg });
    }

    for (const [id, p] of this.people) if (p.expired(now)) this.people.delete(id);

    // ④ 상태 진행
    let started = false;
    const parts = this.participants;
    if (this.state === WAITING) {
      if (parts.length > 0 && parts.every(p => p.ready)) {
        this.state = COUNTDOWN;
        this.countdownEndsAt = now + c.countdownS;
      }
    } else if (this.state === COUNTDOWN) {
      if (now >= this.countdownEndsAt) {
        this.state = RUNNING;
        this.startedAt = now;
        started = true;
        // 시작 순간의 자세를 기준으로 다시 잡는다 (손을 내린 자세가 진짜 출발 자세다)
        for (const p of this.people.values()) p.counter.recapture();
      }
    }

    return {
      state: this.state,
      started,
      countdownLeft: this.state === COUNTDOWN ? Math.max(0, this.countdownEndsAt - now) : null,
      messages,
      people: [...this.people.values()].map(p => ({
        id: p.id, established: p.established, ready: p.ready, heldFrames: p.heldFrames,
        count: p.counter.count, dropRatio: p.counter.dropRatio,
        legsVisible: p.counter.legsVisible, baselineReady: p.counter.baseline !== null,
        sig: p.sig,
      })),
    };
  }
}
