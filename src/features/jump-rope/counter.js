// 줄넘기 판정 로직 — 파이썬 버전(app/person_state.py, app/session.py)을 그대로 옮긴 것.
// 모든 판정은 "그 사람의 bodyHeight 대비 비율"로 한다. 절대 픽셀값은 쓰지 않는다.

export const CONFIG = {
  // READY 판정
  readyOneHand: true,        // true = 한 손만 들어도 준비 완료 / false = 양손
  readyMarginRatio: 0.02,    // 손목이 어깨보다 이만큼(키 대비) 더 위여야 인정
  readyHoldFrames: 5,        // 연속 프레임 유지해야 확정
  readyReleaseFrames: 8,

  // 점프 판정 (§ 파이썬 config.py 와 동일)
  // ⚠️ 아래 네 값은 함께 움직여야 한다. 하강·착지 기준이 점프 크기보다 크면
  // **낮게 뛰는 아이는 UP 상태가 시작되자마자 무너져 한 번도 안 세진다.**
  // (벤치마크에서 5cm·7cm 점프가 통째로 0회였다 — web/bench.mjs 참조)
  jumpRiseRatio: 0.018,      // GROUND → UP
  jumpPeakMinRatio: 0.025,   // 이 높이 못 넘으면 카운트 안 함 (키 140cm 아이의 3.5cm 쯤)
  fallPeakFraction: 0.6,     // UP → DOWN 은 "정점 대비 60%까지 내려옴"
  jumpFallRatio: 0.015,      // 하강 판정 하한선
  landRatio: 0.012,          // 착지 인정 높이
  landingConfirmFrames: 2,   // 착지 확인 프레임 수 (느린 기기에서는 자동으로 1로 완화)
  slowFrameS: 0.08,          // 프레임 간격이 이보다 길면 = 12.5 FPS 미만 → 느린 기기
  rebaselineBelowS: 1.0,     // baseline 보다 확실히 아래에 1초 이상 머무르면 기준 재설정

  // 오카운트 차단
  ankleConfirmFraction: 0.4, // 진짜 점프면 발목도 뜬다. 몸통 상승량의 이 비율만큼 안 뜨면 무시
  ankleConfirmMinSeen: 0.6,  // 사이클 중 발목이 이 비율 이상 보여야 위 검사 적용
  // 양발 동시 상승 — 제자리 걷기·한 발 들기는 한 발씩 번갈아 올라간다.
  // 이 검사가 있어야 임계값을 낮춰 낮은 점프를 잡으면서도 오카운트가 안 생긴다.
  bothAnkleUpRatio: 0.35,    // 두 발이 각각 이 비율(점프 크기 대비) 이상 떠 있어야 '동시에 떴다'
  bothAnkleMinFrames: 1,     // 그런 프레임이 최소 몇 장이어야 하는가
  // 발목을 못 보면 위 검사를 할 수 없다 = **근거가 적다.** 그럴 때는 문턱을 원래대로 높인다.
  // (이게 없으면 발이 가려진 상태의 제자리 걷기가 점프로 세진다 — 벤치마크에서 40회까지 나왔다)
  peakMinNoAnkle: 0.05,      // 양쪽 발목을 거의 못 봤을 때 요구하는 최소 점프 크기
  peakMinOneAnkle: 0.035,    // 한쪽 발목만 보일 때
  walkRejectRatio: 0.35,     // 사이클 동안 좌우로 이만큼(키 대비) 넘게 움직이면 제자리 점프 아님
  coreHipWeight: 0.6,        // 판정 신호 = 엉덩이 60% + 어깨 40% (다리 노이즈에 덜 흔들림)
  minJumpDurationS: 0.12,

  // ── 낮은 점프까지 세기 (실험, 기본 꺼짐) ──────────────
  // 3cm 처럼 아주 낮은 점프는 문턱(키 대비 2.5%)에 못 미쳐 통째로 안 세진다. 그렇다고 문턱만
  // 낮추면 제자리 걷기가 세진다. 그래서 **높이가 아니라 시간**으로 가른다 — 높이 h 만큼 뜬 몸은
  // 반드시 T = 2√(2h/g) 만에 돌아온다. 걷기의 몸통 흔들림은 같은 진폭이라도 2~3배 느리다.
  //
  // ⚠️ 합성 벤치마크로는 안전을 증명하지 못했다. 실제 아이들 숫자로 확인하기 전까지 기본 꺼짐이다.
  //    (벤치마크의 합성 걷기는 양발이 동시에 올라가 실제보다 점프에 가깝다. 발을 번갈아 드는
  //     현실적인 걷기에서는 오카운트 0 이었지만, landmark 흔들림이 심하면 20초에 3회 나왔다)
  lowJumpEnabled: false,
  lowJumpRiseRatio: 0.008,   // 낮은 점프용 진입 문턱 (기본 0.018)
  lowJumpMinRatio: 0.012,    // 이보다 낮으면 어떤 경우에도 카운트 안 함
  lowJumpBodyCm: 140,        // 아이 키 가정 — 키 대비 비율 × 이 값 = 실제 cm
  lowJumpTolLow: 0.45,       // 측정 체공시간 / 예측 체공시간 허용 하한
  lowJumpTolHigh: 1.9,       // 상한
  lowJumpMinFps: 24,         // 이보다 느린 기기에서는 저점프 판정을 끈다 (프레임이 모자람)
  lowJumpMinFrames: 3,       // 사이클이 이보다 짧으면 신호가 아니라 튄 값이다
  lowJumpSnr: 3.0,           // 서 있을 때의 흔들림(잡음) 대비 이 배수는 돼야 점프로 본다
  lowJumpAnkleFraction: 0.7, // 저점프는 발목 근거를 더 엄격히 본다 (기본 0.4)
  lowJumpBothFrames: 2,      // 양발이 동시에 떠 있던 프레임 수
  // 줄넘기는 **리듬**이 있다. 몸을 앞뒤로 흔드는 동작(2초 주기)은 리듬이 아니다.
  lowJumpRhythm: true,
  lowJumpBeatMinS: 0.22,     // 줄넘기로 볼 수 있는 최소 간격 (4.5회/초)
  lowJumpBeatMaxS: 0.90,     // 최대 간격 (1.1회/초)
  lowJumpBeatTol: 0.35,      // 앞뒤 간격이 이 비율 안에서 일정해야 리듬으로 본다

  // ── 자유낙하 검사 (모든 카운트에 적용) ────────────────
  // 높이만 보면 "느리게 오르내리는 깨작임"도 점프로 세진다(테스트 '낮은 깨작임'이 이걸 잡고 있었다).
  // 뜬 높이에 비해 **너무 오래 떠 있으면** 그건 점프가 아니라 몸을 굽혔다 펴는 동작이다.
  flightSanity: true,
  flightSanityMax: 1.6,      // 측정 체공시간 ÷ 예측 체공시간 상한
  flightSanityMinFps: 20,    // 이보다 느린 기기에서는 판단을 보류한다 (프레임이 모자람)
  maxJumpDurationS: 2.0,
  // 쿨다운 — 너무 길면 **다음 도약을 막아** 빠른 줄넘기가 반토막 난다.
  // 3회/초로 뛰면 착지 뒤 0.1초 만에 다시 뜨는데, 0.22초로 막고 있었다(벤치마크 15/30).
  minJumpIntervalS: 0.15,

  // 스무딩 / 신뢰도
  kpVisMin: 0.5,
  medianWindow: 3,
  // 스무딩 세기는 프레임 수가 아니라 "시간"으로 정한다.
  // 프레임 기준이면 느린 기기(10FPS)에서 신호가 뭉개져 점프를 통째로 놓친다.
  // 스무딩이 세면 **빠른 줄넘기의 짧은 신호를 뭉개** 놓친다. 0.05 → 0.035 로 줄였다.
  emaTauS: 0.035,
  medianMaxDtS: 0.05,     // 프레임 간격이 길면 중앙값 필터를 끈다
  bodyHeightEma: 0.05,
  baselineDriftMaxRatio: 0.02,
  baselineDriftAlpha: 0.02,

  // 트래킹 안정화
  minTrackFrames: 8,
  trackLostGraceS: 5.0,
  trackPruneS: 60.0,
  matchMaxDistRatio: 0.6,    // 같은 사람으로 볼 최대 이동거리 (키 대비)

  countdownSeconds: 3,
  baselineSampleFrames: 10,
  autoStart: false,
};

// BlazePose 33 landmark 인덱스
export const LM = {
  nose: 0,
  lShoulder: 11, rShoulder: 12,
  lElbow: 13, rElbow: 14,
  lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24,
  lKnee: 25, rKnee: 26,
  lAnkle: 27, rAnkle: 28,
};

export const SKELETON = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [0, 11], [0, 12],
];

const GROUND = 'GROUND', UP = 'UP', DOWN = 'DOWN';

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** landmark 배열(픽셀 좌표 + visibility)에서 판정용 신호를 뽑는다. */
export function extractSignals(pts, cfg = CONFIG) {
  const vis = (i) => pts[i] && pts[i].v >= cfg.kpVisMin;
  const avgY = (a, b) => {
    const ok = [a, b].filter(vis);
    if (!ok.length) return null;
    return ok.reduce((s, i) => s + pts[i].y, 0) / ok.length;
  };
  const avgX = (a, b) => {
    const ok = [a, b].filter(vis);
    if (!ok.length) return null;
    return ok.reduce((s, i) => s + pts[i].x, 0) / ok.length;
  };

  const hipY = avgY(LM.lHip, LM.rHip);
  if (hipY === null) return { valid: false };
  const shoulderY = avgY(LM.lShoulder, LM.rShoulder);
  const ankleY = avgY(LM.lAnkle, LM.rAnkle);
  // 좌우 발목을 따로 본다 — 제자리 걷기는 한 발씩 번갈아 올라가고, 줄넘기는 **양발이 함께** 뜬다.
  // 평균만 보면 이 둘이 구분되지 않는다.
  const ankleLY = vis(LM.lAnkle) ? pts[LM.lAnkle].y : null;
  const ankleRY = vis(LM.rAnkle) ? pts[LM.rAnkle].y : null;
  const hipX = avgX(LM.lHip, LM.rHip);

  let bodyHeight = 0;
  if (ankleY !== null && shoulderY !== null) bodyHeight = ankleY - shoulderY;
  if (bodyHeight <= 1 && shoulderY !== null) bodyHeight = Math.max(hipY - shoulderY, 1) * 2.2;
  bodyHeight = Math.max(bodyHeight, 1);

  // READY: 손목이 같은 쪽 어깨보다 위에 있는가 (화면 y는 아래로 갈수록 커짐)
  const margin = bodyHeight * cfg.readyMarginRatio;
  const leftUp = vis(LM.lWrist) && vis(LM.lShoulder) && pts[LM.lWrist].y < pts[LM.lShoulder].y - margin;
  const rightUp = vis(LM.rWrist) && vis(LM.rShoulder) && pts[LM.rWrist].y < pts[LM.rShoulder].y - margin;
  const handsUp = cfg.readyOneHand ? (leftUp || rightUp) : (leftUp && rightUp);

  // 점프는 몸 전체가 뜨는 것이므로 엉덩이 한 점보다 몸통 중심이 안정적이다
  const coreY = shoulderY === null ? hipY
    : cfg.coreHipWeight * hipY + (1 - cfg.coreHipWeight) * shoulderY;

  return {
    valid: true, hipY, shoulderY: shoulderY ?? hipY - 1, ankleY, ankleLY, ankleRY, coreY,
    conf: [LM.lHip, LM.rHip, LM.lShoulder, LM.rShoulder, LM.lAnkle, LM.rAnkle]
      .map(i => pts[i]?.v ?? 0).reduce((a, b) => a + b, 0) / 6,
    handsUp, bodyHeight, centerX: hipX ?? 0,
  };
}

/** ID 한 명분 상태 (파이썬 PersonState 와 동일한 필드 구성) */
export class PersonState {
  constructor(id, now, cfg) {
    this.id = id;
    this.cfg = cfg;
    this.createdAt = now;
    this.lastSeen = now;

    this.ready = false;
    this.baseline = null;      // {hipY, ankleY, bodyHeight}
    this.jumpState = GROUND;
    this.count = 0;
    this.lastJumpTime = 0;

    this.framesSeen = 0;
    this.bodyHeight = 0;
    this.coreYSmooth = null;
    this.riseRatio = 0;
    this.peakRatio = 0;
    this.centerX = 0;
    this.pts = null;

    this._raw = [];
    this._samples = [];
    this._readyFrames = 0;
    this._releaseFrames = 0;
    this._landFrames = 0;
    this._cycleStart = 0;
    this._belowSince = null;
    this._groundJitter = null;   // 서 있을 때의 흔들림 크기 (저점프 판정의 잡음 기준)
    this._cycleStarts = [];      // 최근 사이클 시작 시각 (리듬 판정)
    this._enterRatio = null;
    this._lastUpdate = null;
    this._dt = 0;
    this._ankleY = null;
    this._peakAnkleRise = 0;
    this._cycleAnkleSeen = 0;
    this._cycleFrames = 0;
    this._cycleStartX = 0;
  }

  update(sig, pts, now, counting) {
    this._dt = this._lastUpdate === null ? 0 : now - this._lastUpdate;
    this._lastUpdate = now;
    this.lastSeen = now;
    this.pts = pts;
    if (!sig.valid) return;

    this.framesSeen++;
    this.centerX = sig.centerX;
    const c = this.cfg;

    this.bodyHeight = this.bodyHeight <= 0 ? sig.bodyHeight
      : (1 - c.bodyHeightEma) * this.bodyHeight + c.bodyHeightEma * sig.bodyHeight;

    // READY (깜빡임 방지용 연속 프레임 조건)
    if (sig.handsUp) {
      this._readyFrames++; this._releaseFrames = 0;
      if (this._readyFrames >= c.readyHoldFrames) this.ready = true;
    } else {
      this._releaseFrames++; this._readyFrames = 0;
      if (this._releaseFrames >= c.readyReleaseFrames) this.ready = false;
    }

    this._ankleY = sig.ankleY;
    this._ankleLY = sig.ankleLY;
    this._ankleRY = sig.ankleRY;

    // 중앙값 필터 → EMA (둘 다 시간 기준)
    this._raw.push(sig.coreY);
    if (this._raw.length > 9) this._raw.shift();
    const win = (this._dt > 0 && this._dt <= c.medianMaxDtS) ? c.medianWindow : 1;
    const med = median(this._raw.slice(-Math.max(1, win)));
    if (this.coreYSmooth === null) {
      this.coreYSmooth = med;
    } else {
      let k = this._dt <= 0 ? 1 : 1 - Math.exp(-this._dt / Math.max(c.emaTauS, 1e-3));
      k = Math.min(1, Math.max(0.15, k));
      this.coreYSmooth = (1 - k) * this.coreYSmooth + k * med;
    }

    this._conf = sig.conf ?? null;
    this._samples.push([this.coreYSmooth, sig.ankleY, this.bodyHeight, sig.ankleLY, sig.ankleRY]);
    if (this._samples.length > 30) this._samples.shift();

    if (counting && this.baseline) this._updateJump(now);
    else this.riseRatio = 0;
    this._prevCoreY = this.coreYSmooth;
  }

  _updateJump(now) {
    const c = this.cfg;
    const bh = Math.max(this.baseline.bodyHeight, 1);
    const rise = (this.baseline.coreY - this.coreYSmooth) / bh;   // 위로 갈수록 +
    this.riseRatio = rise;

    // 낮은 점프를 잡으려면 진입 문턱부터 내려가야 한다 (0.018 이면 3cm 점프는 스치지도 못한다)
    const enterRatio = (c.lowJumpEnabled && this._dt > 0 && this._dt <= 1 / c.lowJumpMinFps)
      ? c.lowJumpRiseRatio : c.jumpRiseRatio;

    if (this.jumpState === GROUND) {
      this.peakRatio = 0;
      if (rise >= enterRatio) {
        if (now - this.lastJumpTime >= c.minJumpIntervalS) {
          this.jumpState = UP;
          this._cycleStart = now;
          this._cycleStartX = this.centerX;
          this._cycleFrames = 0;
          this._cycleAnkleSeen = 0;
          this._peakAnkleRise = 0;
          this._peakAnkleRiseL = 0;
          this._peakAnkleRiseR = 0;
          this._bothAnkleFrames = 0;
          this._bothUpFrames = 0;
          this.peakRatio = rise;
          this._landFrames = 0;
          this._enterRatio = enterRatio;      // 체공시간 예측에 쓴다 (어느 높이부터 쟀는가)
        }
        this._belowSince = null;
      } else if (Math.abs(rise) < c.baselineDriftMaxRatio) {
        // 서 있는 동안의 흔들림 크기를 계속 재둔다 — 저점프가 '진짜 신호'인지 재는 자
        this._groundJitter = this._groundJitter === null
          ? Math.abs(rise) : 0.9 * this._groundJitter + 0.1 * Math.abs(rise);
        const d = c.baselineDriftAlpha;                          // 아주 천천히 기준 보정
        this.baseline.coreY = (1 - d) * this.baseline.coreY + d * this.coreYSmooth;
        this._belowSince = null;
      } else if (rise < -c.baselineDriftMaxRatio) {
        // 기준선보다 확실히 "아래"에 계속 있다 = 기준을 잘못 잡았거나 위치가 바뀐 것.
        // (점프 중에는 rise 가 양수라 여기 안 걸린다) → 1초 지나면 기준만 다시 잡는다.
        if (this._belowSince === null) this._belowSince = now;
        else if (now - this._belowSince > c.rebaselineBelowS) {
          this.captureBaseline(c.baselineSampleFrames);          // count 는 유지
          this._belowSince = null;
        }
      } else {
        this._belowSince = null;
      }
    }

    if (this.jumpState === UP || this.jumpState === DOWN) this._trackAnkle(bh);

    if (this.jumpState === UP) {
      this.peakRatio = Math.max(this.peakRatio, rise);
      // 낮은 점프는 정점 자체가 낮아 절대 하한(jumpFallRatio)에 걸리면 하강 판정이 안 난다.
      let fallLevel = Math.max(c.jumpFallRatio, this.peakRatio * c.fallPeakFraction);
      if (c.lowJumpEnabled) fallLevel = Math.min(fallLevel, this.peakRatio * 0.75);
      if (now - this._cycleStart > c.maxJumpDurationS) this._abort();
      // else 로 끊지 않고 같은 프레임에서 착지까지 이어 판정한다.
      // 느린 기기는 지면에 닿은 프레임이 딱 한 번뿐이라 놓치면 카운트가 통째로 날아간다.
      else if (rise <= fallLevel) { this.jumpState = DOWN; this._landFrames = 0; }
    }

    if (this.jumpState === DOWN) {
      this.peakRatio = Math.max(this.peakRatio, rise);
      if (now - this._cycleStart > c.maxJumpDurationS) { this._abort(); return; }
      const landLevel = c.lowJumpEnabled ? Math.min(c.landRatio, this.peakRatio * 0.4) : c.landRatio;
      if (rise <= landLevel) this._landFrames++;
      else this._landFrames = 0;

      // 느린 기기(프레임 간격이 긴 경우)는 착지 확인을 1프레임으로 완화한다.
      // 안 그러면 지면 접촉 시간(0.15~0.25초) 동안 2프레임이 안 잡혀 카운트를 통째로 놓친다.
      const needFrames = this._dt >= c.slowFrameS ? 1 : c.landingConfirmFrames;
      if (this._landFrames >= needFrames) {
        const dur = now - this._cycleStart;
        // 리듬은 **의미 있는 크기의 도약**만으로 잰다. 잡음으로 시작된 미세 사이클까지 넣으면
        // 몸 흔들기 중에도 가짜 박자가 만들어져 리듬 검사가 무력해진다.
        if (c.lowJumpEnabled && this.peakRatio >= c.lowJumpMinRatio) {
          this._cycleStarts.push(this._cycleStart);
          if (this._cycleStarts.length > 4) this._cycleStarts.shift();
        }
        const low = this._lowJumpOk(dur);              // 낮지만 자유낙하 시간이 맞는 점프인가
        const ok = (this.peakRatio >= c.jumpPeakMinRatio || low)
          && (dur >= c.minJumpDurationS || low)
          && this._flightSane(dur)
          && now - this.lastJumpTime >= c.minJumpIntervalS
          && this._ankleConfirms()
          && this._stayedInPlace(bh);
        if (ok) { this.count++; this.lastJumpTime = now; }   // ★ 사이클 완주 시에만 +1
        this.jumpState = GROUND;
        this.peakRatio = 0;
        this._landFrames = 0;
      }
    }
  }

  // ── 오카운트 차단 ────────────────────────────────────
  _trackAnkle(bh) {
    this._cycleFrames++;
    if (this._ankleY === null || this._ankleY === undefined) return;
    if (!this.baseline || this.baseline.ankleY === null) return;
    this._cycleAnkleSeen++;
    this._peakAnkleRise = Math.max(this._peakAnkleRise, (this.baseline.ankleY - this._ankleY) / bh);

    // 좌우 각각의 상승도 따로 기록한다 (한 발씩 번갈아 드는 동작을 걸러내기 위해)
    const b = this.baseline;
    if (this._ankleLY !== null && this._ankleLY !== undefined && b.ankleLY !== null && b.ankleLY !== undefined) {
      this._peakAnkleRiseL = Math.max(this._peakAnkleRiseL, (b.ankleLY - this._ankleLY) / bh);
      this._bothAnkleFrames++;
    }
    if (this._ankleRY !== null && this._ankleRY !== undefined && b.ankleRY !== null && b.ankleRY !== undefined) {
      this._peakAnkleRiseR = Math.max(this._peakAnkleRiseR, (b.ankleRY - this._ankleRY) / bh);
    }
    // 이 프레임에서 두 발이 동시에 떠 있었는가 (한 발만 드는 동작과 구분하는 핵심 신호)
    if (this._ankleLY !== null && this._ankleRY !== null && b.ankleLY != null && b.ankleRY != null) {
      const up = this.cfg.bothAnkleUpRatio * Math.max(this.peakRatio, this.cfg.jumpPeakMinRatio);
      if ((b.ankleLY - this._ankleLY) / bh >= up && (b.ankleRY - this._ankleRY) / bh >= up) this._bothUpFrames++;
    }
  }

  /**
   * 진짜 점프면 발목도 뜬다. 까치발·상체만 까딱은 발목이 그대로다.
   * 여기에 더해 **양발이 함께 떴는가**를 본다 — 제자리 걷기·한 발 들기는 한 발씩 번갈아 올라간다.
   * 이 검사가 있어야 임계값을 낮춰 낮은 점프를 잡으면서도 오카운트가 안 생긴다.
   */
  _ankleConfirms() {
    const c = this.cfg;
    if (!this.baseline || this.baseline.ankleY === null || this._cycleFrames === 0) {
      return this.peakRatio >= c.peakMinNoAnkle;
    }
    const seen = this._cycleAnkleSeen / this._cycleFrames;
    // 발목을 못 봤으면 검사를 **생략하는 게 아니라**, 근거가 적은 만큼 문턱을 높인다.
    if (seen < c.ankleConfirmMinSeen) return this.peakRatio >= c.peakMinNoAnkle;
    if (this._peakAnkleRise < this.peakRatio * c.ankleConfirmFraction) return false;

    // 좌우를 다 본 프레임이 충분하면 '양발 동시' 검사를, 아니면 문턱을 높여 대신한다
    if (this._bothAnkleFrames / this._cycleFrames >= c.ankleConfirmMinSeen) {
      if (this._bothUpFrames < c.bothAnkleMinFrames) return false;
    } else if (this.peakRatio < c.peakMinOneAnkle) {
      return false;
    }
    return true;
  }

  /**
   * 낮은 점프 구제 (실험) — **높이가 아니라 시간**으로 진짜 점프인지 가른다.
   *
   * 높이 h(cm) 만큼 뜬 몸은 반드시 T = 2√(2h/g) 만에 돌아온다. 우리가 재는 구간은 진입 문턱(a)
   * 위에 머문 시간이라 T·√(1−a/h) 이 예측값이다. 걷기의 몸통 흔들림은 같은 진폭에서 2~3배 느리다.
   * 여기에 잡음 대비 크기·발목 근거·리듬까지 전부 통과해야 인정한다.
   */
  _lowJumpOk(dur) {
    const c = this.cfg;
    if (!c.lowJumpEnabled) return false;
    if (this.peakRatio < c.lowJumpMinRatio || this.peakRatio >= c.jumpPeakMinRatio) return false;
    if (!(this._dt > 0 && this._dt <= 1 / c.lowJumpMinFps)) return false;
    if (this._cycleFrames < c.lowJumpMinFrames) return false;
    // 서 있을 때의 흔들림보다 확실히 커야 한다. 이게 없으면 잡음이 점프로 세진다.
    if (this._groundJitter !== null && this.peakRatio < this._groundJitter * c.lowJumpSnr) return false;
    // 발목 근거도 더 엄격히 — 저점프는 몸통 신호가 작아서 발목이 사실상 유일한 증거다
    if (this._peakAnkleRise < this.peakRatio * c.lowJumpAnkleFraction) return false;
    if (this._bothUpFrames < c.lowJumpBothFrames) return false;
    if (c.lowJumpRhythm && !this._rhythmOk()) return false;
    const a = this._enterRatio ?? c.lowJumpRiseRatio;
    if (this.peakRatio <= a) return false;
    const hCm = this.peakRatio * c.lowJumpBodyCm;
    const T = 2 * Math.sqrt(2 * hCm / 980);
    const predicted = T * Math.sqrt(Math.max(0, 1 - a / this.peakRatio));
    if (predicted <= 0) return false;
    const measured = Math.max(0, dur - this._landFrames * this._dt);   // 착지 확인 지연 보정
    const ratio = measured / predicted;
    return ratio >= c.lowJumpTolLow && ratio <= c.lowJumpTolHigh;
  }

  /**
   * 자유낙하 검사 — 뜬 높이에 비해 너무 오래 떠 있으면 점프가 아니다.
   *
   * 높이 h(cm) 만큼 뜬 몸은 T = 2√(2h/g) 만에 돌아온다. 우리가 재는 건 진입 문턱(a) 위에
   * 머문 시간이라 예측값은 T·√(1−a/h). 무릎을 굽혔다 펴는 '깨작임'은 같은 높이에서 2배쯤 느리다.
   * (아래쪽은 안 본다 — 느린 기기에서 짧게 잡히는 건 정상이라 위쪽만 자른다)
   */
  _flightSane(dur) {
    const c = this.cfg;
    if (!c.flightSanity) return true;
    if (!(this._dt > 0 && this._dt <= 1 / c.flightSanityMinFps)) return true;
    const a = this._enterRatio ?? c.jumpRiseRatio;
    if (this.peakRatio <= a) return true;
    const hCm = this.peakRatio * c.lowJumpBodyCm;
    const predicted = 2 * Math.sqrt(2 * hCm / 980) * Math.sqrt(Math.max(0, 1 - a / this.peakRatio));
    if (predicted <= 0) return true;
    const measured = Math.max(0, dur - this._landFrames * this._dt);
    return measured <= predicted * c.flightSanityMax;
  }

  /** 줄넘기 리듬인가 — 최근 세 번의 도약 간격이 일정한가 (몸 흔들기는 2초 주기라 걸린다) */
  _rhythmOk() {
    const c = this.cfg;
    const s = this._cycleStarts;
    if (s.length < 3) return false;
    const d1 = s[s.length - 2] - s[s.length - 3];
    const d2 = s[s.length - 1] - s[s.length - 2];
    for (const d of [d1, d2]) if (d < c.lowJumpBeatMinS || d > c.lowJumpBeatMaxS) return false;
    return Math.abs(d1 - d2) <= c.lowJumpBeatTol * Math.max(d1, d2);
  }

  /** 제자리 점프인가 (좌우로 크게 움직였으면 걷거나 뛰어간 것) */
  _stayedInPlace(bh) {
    return Math.abs(this.centerX - this._cycleStartX) / Math.max(bh, 1) <= this.cfg.walkRejectRatio;
  }

  _abort() { this.jumpState = GROUND; this.peakRatio = 0; this._landFrames = 0; }

  captureBaseline(n) {
    if (!this._samples.length) return false;
    // 평균이 아니라 중앙값 — 캡처 순간 한 프레임만 튀어도 기준이 어긋나면
    // 그 사람의 카운트가 통째로 틀어진다.
    const s = this._samples.slice(-n);
    const cores = s.map(x => x[0]);
    const ankles = s.map(x => x[1]).filter(v => v !== null && v !== undefined);
    const hs = s.map(x => x[2]);
    const lAnk = s.map(x => x[3]).filter(v => v !== null && v !== undefined);
    const rAnk = s.map(x => x[4]).filter(v => v !== null && v !== undefined);
    this.baseline = {
      coreY: median(cores),
      ankleY: ankles.length ? median(ankles) : null,
      ankleLY: lAnk.length ? median(lAnk) : null,
      ankleRY: rAnk.length ? median(rAnk) : null,
      bodyHeight: Math.max(median(hs), 1),
    };
    this.jumpState = GROUND;
    this.peakRatio = 0; this.riseRatio = 0; this._landFrames = 0;
    return true;
  }

  resetProgress() {
    this.baseline = null; this.jumpState = GROUND; this.count = 0;
    this.lastJumpTime = 0; this.peakRatio = 0; this.riseRatio = 0; this._landFrames = 0;
  }

  /**
   * 개발자 화면용 상태 덤프 — "왜 안 세지나"를 눈으로 보기 위한 것.
   * 여기 값들이 곧 판정에 쓰이는 값이다(따로 계산하지 않는다).
   */
  debug(now = 0) {
    const c = this.cfg;
    const bh = this.baseline ? Math.max(this.baseline.bodyHeight, 1) : Math.max(this.bodyHeight, 1);
    const riseOf = (y, base) => (y == null || base == null ? null : (base - y) / bh);
    return {
      jumpState: this.jumpState,
      rise: this.riseRatio ?? 0,                 // 지금 얼마나 떠 있나 (키 대비)
      peak: this.peakRatio ?? 0,                 // 이번 사이클의 최고점
      velocity: this._dt > 0 ? ((this._prevCoreY ?? this.coreYSmooth) - this.coreYSmooth) / bh / this._dt : 0,
      coreY: this.coreYSmooth,
      baselineY: this.baseline?.coreY ?? null,
      ankleL: riseOf(this._ankleLY, this.baseline?.ankleLY),
      ankleR: riseOf(this._ankleRY, this.baseline?.ankleRY),
      bothUpFrames: this._bothUpFrames ?? 0,
      bodyHeight: bh,
      conf: this._conf ?? null,
      lastSeenAgoS: now ? now - this.lastSeen : 0,
      // 지금 이 사람에게 적용되는 문턱 (근거가 적으면 높아진다)
      thRise: c.lowJumpEnabled ? c.lowJumpRiseRatio : c.jumpRiseRatio,
      thPeak: c.jumpPeakMinRatio,
      // 낮은 점프까지 세는 중이면 실제로 넘어야 할 선이 내려간다 — 그래프 점선도 그 값을 따라야 한다
      thPeakEffective: (() => {
        const base = this._ankleEvidence() === 'both' ? c.jumpPeakMinRatio
          : this._ankleEvidence() === 'one' ? c.peakMinOneAnkle : c.peakMinNoAnkle;
        return c.lowJumpEnabled && this._ankleEvidence() === 'both'
          ? Math.min(base, c.lowJumpMinRatio) : base;
      })(),
      ankleEvidence: this._ankleEvidence(),
      lowJump: !!c.lowJumpEnabled,
    };
  }

  /** 이번 사이클에서 발목 근거가 얼마나 있었나 — 문턱이 여기에 따라 달라진다 */
  _ankleEvidence() {
    const c = this.cfg;
    if (!this.baseline || this.baseline.ankleY === null || !this._cycleFrames) return 'none';
    if (this._cycleAnkleSeen / this._cycleFrames < c.ankleConfirmMinSeen) return 'none';
    return this._bothAnkleFrames / this._cycleFrames >= c.ankleConfirmMinSeen ? 'both' : 'one';
  }

  get stable() { return this.framesSeen >= this.cfg.minTrackFrames; }
  present(now) { return now - this.lastSeen <= this.cfg.trackLostGraceS; }
  expired(now) { return now - this.lastSeen > this.cfg.trackPruneS; }
  get displayState() {
    if (!this.baseline) return this.ready ? 'READY' : 'WAIT';
    return (this.jumpState === UP || this.jumpState === DOWN) ? 'JUMPING' : 'GROUND';
  }
}

/**
 * MediaPipe 는 프레임마다 사람 순서가 뒤바뀌고 ID를 주지 않는다.
 * → 엉덩이 중심 거리로 직접 매칭해 지속 ID를 만든다 (탐욕적 최근접 매칭).
 */
export class Tracker {
  constructor(cfg) { this.cfg = cfg; this.nextId = 1; this.tracks = new Map(); }

  assign(observations, now) {
    // observations: [{sig, pts}]
    const used = new Set();
    const result = [];

    // 1) 기존 트랙에 가장 가까운 관측 붙이기
    const tracks = [...this.tracks.values()].sort((a, b) => a.lastSeen === b.lastSeen ? a.id - b.id : b.lastSeen - a.lastSeen);
    for (const tr of tracks) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < observations.length; i++) {
        if (used.has(i)) continue;
        const o = observations[i];
        if (!o.sig.valid) continue;
        const d = Math.hypot(o.sig.centerX - tr.lastX, o.sig.hipY - tr.lastY);
        const limit = Math.max(tr.bodyHeight, o.sig.bodyHeight) * this.cfg.matchMaxDistRatio;
        if (d < bestD && d <= limit) { bestD = d; best = i; }
      }
      if (best >= 0) {
        used.add(best);
        result.push({ track: tr, obs: observations[best] });
      }
    }

    // 2) 남은 관측 = 새로 들어온 사람
    for (let i = 0; i < observations.length; i++) {
      if (used.has(i) || !observations[i].sig.valid) continue;
      const tr = new PersonState(this.nextId++, now, this.cfg);
      this.tracks.set(tr.id, tr);
      result.push({ track: tr, obs: observations[i] });
    }

    for (const { track, obs } of result) {
      track.lastX = obs.sig.centerX;
      track.lastY = obs.sig.hipY;
    }
    return result;
  }

  prune(now) {
    for (const [id, tr] of this.tracks) if (tr.expired(now)) this.tracks.delete(id);
  }
}

const WAITING = 'WAITING', COUNTDOWN = 'COUNTDOWN', RUNNING = 'RUNNING';

/** 세션: READY 게이트 → 3·2·1 → 개인별 baseline → 카운트 */
export class Session {
  constructor(cfg = CONFIG) {
    this.cfg = cfg;
    this.tracker = new Tracker(cfg);
    this.state = WAITING;
    this.countdownStartedAt = 0;
    this.startedAt = null;
    this.banner = null;
    this.bannerUntil = 0;
  }

  get persons() { return [...this.tracker.tracks.values()]; }

  participants(now) { return this.persons.filter(p => p.stable && p.present(now)); }

  update(observations, now) {
    const counting = this.state === RUNNING;
    const pairs = this.tracker.assign(observations, now);
    for (const { track, obs } of pairs) {
      // 오래 사라졌다 돌아오면 기준만 다시 잡는다 (카운트는 유지)
      if (track.baseline && now - track.lastSeen > 2.0) { track.baseline = null; track._samples = []; }
      track.update(obs.sig, obs.pts, now, counting);
    }
    this.tracker.prune(now);
    this._advance(now);
  }

  _advance(now) {
    if (this.banner && now >= this.bannerUntil) this.banner = null;
    const parts = this.participants(now);

    if (this.cfg.autoStart) {
      if (this.state !== RUNNING) { this.state = RUNNING; this.startedAt = now; }
      this._ensureBaselines(now);
      return;
    }

    if (this.state === WAITING) {
      if (parts.length && parts.every(p => p.ready)) {
        this.state = COUNTDOWN;
        this.countdownStartedAt = now;
      }
    } else if (this.state === COUNTDOWN) {
      if (!parts.length) { this.state = WAITING; return; }
      if (now - this.countdownStartedAt >= this.cfg.countdownSeconds) {
        this.state = RUNNING;
        this.startedAt = now;
        this.banner = 'START!';
        this.bannerUntil = now + 1.2;
        for (const p of parts) { p.resetProgress(); p.captureBaseline(this.cfg.baselineSampleFrames); }
      }
    } else {
      this._ensureBaselines(now);
    }
  }

  _ensureBaselines(now) {
    for (const p of this.participants(now)) {
      if (!p.baseline && p._samples.length >= this.cfg.baselineSampleFrames) {
        p.captureBaseline(this.cfg.baselineSampleFrames);
      }
    }
  }

  countdownNumber(now) {
    if (this.state !== COUNTDOWN) return null;
    const remain = this.cfg.countdownSeconds - (now - this.countdownStartedAt);
    return Math.max(1, Math.min(Math.ceil(this.cfg.countdownSeconds), Math.floor(remain) + 1));
  }

  reset(now) {
    this.state = WAITING;
    this.startedAt = null;
    this.banner = 'RESET';
    this.bannerUntil = now + 0.8;
    for (const p of this.persons) p.resetProgress();
  }

  /**
   * 카메라를 바꾸면 화면 기하가 통째로 달라진다 (좌우가 뒤집히고 화각·거리도 다름).
   * 기존 트랙 위치로 매칭하면 엉뚱한 사람에게 남의 횟수가 붙을 수 있어 트랙까지 버린다.
   */
  hardReset(now) {
    this.tracker.tracks.clear();
    this.tracker.nextId = 1;
    this.reset(now);
  }

  snapshot(now) {
    const people = this.persons.filter(p => p.stable).sort((a, b) => a.id - b.id);
    return {
      session: this.state,
      countdown: this.countdownNumber(now),
      banner: this.banner,
      elapsed: this.startedAt === null ? 0 : now - this.startedAt,
      totalCount: people.reduce((s, p) => s + p.count, 0),
      readyCount: people.filter(p => p.ready && p.present(now)).length,
      presentCount: people.filter(p => p.present(now)).length,
      people: people.map(p => ({
        id: p.id, ready: p.ready, state: p.displayState, count: p.count,
        present: p.present(now), hasBaseline: !!p.baseline,
        debug: p.debug(now),
      })),
    };
  }
}

export const STATES = { WAITING, COUNTDOWN, RUNNING };
