// 카메라 열기 / 앞↔뒤 전환 / 거울 모드 — 줄넘기·멀리뛰기 화면이 함께 쓴다.
// UI 는 콜백으로만 알린다 (이 파일은 DOM 을 모른다, video 엘리먼트 하나만 받는다).

// 착지 순간 정밀도는 프레임 간격에 직접 걸린다 — 30fps 는 한 프레임이 3.3cm 쯤 되는 이동을 놓친다.
// 60fps 를 요청하되, 안 되는 기기는 브라우저가 알아서 낮춰 준다(ideal 이라 실패하지 않는다).
const SIZE = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } };

export class CameraController {
  /**
   * @param {HTMLVideoElement} video
   * @param {object} opts  { prefKey, onChange(state), onSwitched(state), onError(msg), onStatus(msg) }
   */
  constructor(video, opts = {}) {
    this.video = video;
    this.prefKey = opts.prefKey || 'jumprope.camera';
    this.on = {
      change: opts.onChange || (() => {}),
      switched: opts.onSwitched || (() => {}),
      error: opts.onError || (() => {}),
      status: opts.onStatus || (() => {}),
    };
    this.stream = null;
    this.facing = 'user';        // 지금 열려 있는 카메라가 앞(user)인지 뒤(environment)인지
    this.mirror = true;          // 화면을 거울처럼 좌우 반전할지 (앞면일 때만 기본 켜짐)
    this.userMirror = null;      // 사용자가 직접 정했으면 그 값이 우선
    this.cameras = [];
    this.currentDeviceId = null;
    this.busy = false;
  }

  // ── 설정 저장 ────────────────────────────────────────
  loadPref() {
    try { return JSON.parse(localStorage.getItem(this.prefKey) || '{}'); } catch { return {}; }
  }
  savePref() {
    try {
      localStorage.setItem(this.prefKey, JSON.stringify({
        deviceId: this.currentDeviceId, facing: this.facing, mirror: this.userMirror,
      }));
    } catch { /* 사파리 프라이빗 모드 등 — 저장 안 돼도 동작에는 지장 없음 */ }
  }

  getStream(video) {
    return navigator.mediaDevices.getUserMedia({ video: { ...SIZE, ...video }, audio: false });
  }

  /** 카메라 목록 갱신. 라벨은 권한을 한 번 허용한 뒤에야 채워진다. */
  async refresh() {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devs.filter(d => d.kind === 'videoinput');
    } catch { this.cameras = []; }
    this.on.change(this);
    return this.cameras;
  }

  /** 트랙이 앞/뒤 어느 카메라인지 알아낸다 (설정값 우선, 없으면 이름으로 추정) */
  detectFacing(track) {
    const s = track?.getSettings?.() || {};
    if (s.facingMode === 'user' || s.facingMode === 'environment') return s.facingMode;
    const label = (track?.label || '').toLowerCase();
    if (/back|rear|environment|후면|뒷/.test(label)) return 'environment';
    if (/front|facetime|face time|user|전면|앞/.test(label)) return 'user';
    return this.facing;
  }

  /** 새 스트림을 화면에 물리고, 앞/뒤·거울 여부를 갱신한다. 이전 스트림은 여기서 정리한다. */
  async applyStream(next) {
    if (this.stream && this.stream !== next) this.stream.getTracks().forEach(t => t.stop());
    this.stream = next;
    this.video.srcObject = next;
    await this.video.play();

    const track = next.getVideoTracks()[0];
    const settings = track?.getSettings?.() || {};
    this.facing = this.detectFacing(track);
    this.currentDeviceId = settings.deviceId || this.currentDeviceId;
    this.mirror = this.userMirror === null ? this.facing !== 'environment' : this.userMirror;

    this.on.error('');
    this.savePref();
    this.on.change(this);
  }

  async start() {
    const pref = this.loadPref();
    if (pref.mirror === true || pref.mirror === false) this.userMirror = pref.mirror;
    // 저장된 카메라 → 저장된 앞/뒤 → 아무거나 순으로 시도
    const attempts = [
      pref.deviceId && { deviceId: { exact: pref.deviceId } },
      { facingMode: pref.facing || this.facing },
      {},
    ].filter(Boolean);

    let lastErr = null;
    for (const c of attempts) {
      try {
        await this.applyStream(await this.getStream(c));
        await this.refresh();          // 권한 허용 후에야 카메라 이름이 나온다
        return true;
      } catch (e) { lastErr = e; }
    }
    this.on.error('카메라를 열 수 없습니다: ' + (lastErr?.message || '알 수 없는 오류') +
      '\n브라우저 주소창의 카메라 아이콘에서 권한을 허용해 주세요.');
    return false;
  }

  /** 지금 카메라 다음 순서의 카메라를 고른다 (앞→뒤→외장캠→…→앞) */
  nextConstraints() {
    const list = this.cameras.filter(c => c.deviceId);
    const attempts = [];
    if (list.length > 1) {
      const i = list.findIndex(c => c.deviceId === this.currentDeviceId);
      attempts.push({ deviceId: { exact: list[(i + 1) % list.length].deviceId } });
    }
    const other = this.facing === 'environment' ? 'user' : 'environment';
    attempts.push({ facingMode: { exact: other } });   // 앞/뒤를 확실히 지정
    attempts.push({ facingMode: other });              // 안 먹는 기기용 완화 요청
    return attempts;
  }

  /**
   * 앞면 ↔ 뒷면 전환.
   * 아이패드·아이폰은 카메라 두 개를 동시에 못 여는 경우가 있어,
   * 실패하면 지금 카메라를 놓아준 뒤 한 번 더 시도하고, 그래도 안 되면 원래대로 되돌린다.
   */
  async switchNext() {
    const before = { deviceId: this.currentDeviceId, facing: this.facing };
    this.busy = true;
    this.on.status('카메라 전환 중…');
    this.on.change(this);
    try {
      await this.refresh();
      const attempts = this.nextConstraints();
      // 완화 요청(facingMode: 'environment')은 카메라가 하나뿐이면 같은 카메라를 그대로 돌려준다.
      // 실제로 바뀌었는지 확인해야 "바꿨습니다" 하고 거짓말을 안 한다.
      const changed = () => this.currentDeviceId !== before.deviceId || this.facing !== before.facing;

      for (const c of attempts) {
        try { await this.applyStream(await this.getStream(c)); if (changed()) return this._switched(); } catch { /* 다음 후보 */ }
      }

      // 2차 시도 — 기존 카메라를 완전히 놓아주고 다시 (아이패드·아이폰 대응)
      if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
      for (const c of attempts) {
        try { await this.applyStream(await this.getStream(c)); if (changed()) return this._switched(); } catch { /* 다음 후보 */ }
      }

      // 못 바꿨다 — 카메라가 꺼져 있으면 원래 것으로 되살린다
      if (!this.stream) {
        const back = before.deviceId ? { deviceId: { exact: before.deviceId } } : { facingMode: before.facing };
        try { await this.applyStream(await this.getStream(back)); } catch { /* 복구도 실패하면 아래 안내만 */ }
      }
      this.on.error(this.cameras.length > 1
        ? '카메라를 전환하지 못했습니다. 다른 앱이 카메라를 쓰고 있는지 확인해 주세요.'
        : '이 기기에는 전환할 다른 카메라가 없습니다. (노트북·PC는 대부분 카메라가 하나입니다)');
      return false;
    } finally {
      this.busy = false;
      this.on.status('');
      this.on.change(this);
    }
  }

  _switched() {
    this.on.switched(this);
    return true;
  }

  /** 목록에서 특정 카메라를 직접 고른다 (외장캠이 여러 대인 PC용) */
  async select(deviceId) {
    if (!deviceId || deviceId === this.currentDeviceId) return false;
    try {
      await this.applyStream(await this.getStream({ deviceId: { exact: deviceId } }));
      return this._switched();
    } catch (err) {
      this.on.error('그 카메라를 열 수 없습니다: ' + err.message);
      this.on.change(this);
      return false;
    }
  }

  setMirror(v) {
    this.userMirror = v;
    this.mirror = v;
    this.savePref();
    this.on.change(this);
  }

  get facingKo() { return this.facing === 'environment' ? '뒷면' : '앞면'; }
  get otherKo() { return this.facing === 'environment' ? '앞면' : '뒷면'; }
  name(dev, i) { return dev.label || `카메라 ${i + 1}`; }

  /** USB 웹캠을 꽂거나 뽑으면 목록을 다시 읽는다 */
  watchDeviceChange() {
    navigator.mediaDevices?.addEventListener?.('devicechange', () => this.refresh());
  }
}
