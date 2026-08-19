// 신호음 재생 — 소리를 내는 일과 "지금이 몇 회째인가"를 알리는 일을 함께 맡는다.
//
// 두 가지를 한 곳에서 하는 이유: 소리와 판정이 어긋나면 안 되기 때문이다.
// 화면 타이머(setInterval)는 브라우저가 바쁘면 수십 ms씩 밀리는데, 셔틀런 후반 단계는
// 한 왕복이 4초도 안 된다. 그래서 소리도 판정도 전부 **오디오 시계**(AudioContext.currentTime)에 건다.
// 오디오 시계는 화면이 버벅여도 밀리지 않는다.
//
// 음원 파일을 쓰지 않고 직접 만드는 이유: 파일이 없어도 규격대로 정확한 간격이 나오고,
// 15m·20m 어느 쪽이든 같은 코드로 만들어진다. (학교 배포 음원을 쓰고 싶으면 그걸 틀고 이 앱은 판정만 해도 된다)

export class BeepPlayer {
  /**
   * @param {object} o
   *   onBeep(entry)      신호음이 울리는 그 순간 (판정은 여기서 한다)
   *   onCountdown(n)     시작 전 3·2·1
   *   onStart()          카운트다운이 끝나고 1회가 시작될 때
   *   onTick(state)      화면 갱신용 (남은 시간 등)
   *   onFinish()         일정표를 끝까지 갔을 때 (21단계 완주)
   */
  constructor(o = {}) {
    this.on = {
      beep: o.onBeep || (() => {}),
      countdown: o.onCountdown || (() => {}),
      start: o.onStart || (() => {}),
      tick: o.onTick || (() => {}),
      finish: o.onFinish || (() => {}),
    };
    this.ctx = null;
    this.schedule = [];
    this.startAt = 0;        // 1회가 시작되는 오디오 시각(초)
    this.nextIndex = 0;      // 아직 소리를 예약하지 않은 신호음
    this.firedIndex = 0;     // 아직 콜백을 부르지 않은 신호음
    this.timer = null;
    this.running = false;
    this.countdownSec = 3;
  }

  /** 아이폰·아이패드는 사용자가 화면을 누른 그 순간에만 소리를 열어준다 */
  async unlock() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx.state === 'running';
  }

  /** 짧은 삐 소리 하나를 오디오 시계의 특정 시각에 예약한다 */
  tone(at, { freq = 880, ms = 120, gain = 0.35 } = {}) {
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // 뚝 끊으면 '틱' 잡음이 나서 앞뒤를 짧게 눕힌다
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(at);
    osc.stop(at + ms / 1000 + 0.05);
  }

  /**
   * @param {Array} schedule paps.buildSchedule() 결과
   */
  async start(schedule, { countdownSec = 3 } = {}) {
    if (!(await this.unlock())) throw new Error('소리를 열 수 없습니다. 화면을 한 번 누른 뒤 다시 시도해 주세요.');
    this.schedule = schedule;
    this.countdownSec = countdownSec;
    this.nextIndex = 0;
    this.firedIndex = 0;
    this.running = true;
    this.startAt = this.ctx.currentTime + countdownSec + 0.2;

    // 카운트다운 3·2·1 — 낮은 음, 시작음은 높게
    for (let i = countdownSec; i >= 1; i--) {
      const at = this.startAt - i;
      this.tone(at, { freq: 520, ms: 100, gain: 0.3 });
    }

    this._loop();
  }

  /** 예약과 콜백을 함께 돌리는 짧은 루프 (오디오 시계 기준 25ms마다) */
  _loop() {
    clearInterval(this.timer);
    let lastCountdown = null;
    let started = false;

    this.timer = setInterval(() => {
      if (!this.running) return;
      const now = this.ctx.currentTime;

      // 카운트다운 알림
      if (now < this.startAt) {
        const n = Math.ceil(this.startAt - now);
        if (n !== lastCountdown && n >= 1 && n <= this.countdownSec) { lastCountdown = n; this.on.countdown(n); }
      } else if (!started) {
        started = true;
        this.on.start();
      }

      // 앞으로 1.5초 안에 울릴 신호음의 소리를 미리 예약해 둔다
      while (this.nextIndex < this.schedule.length) {
        const e = this.schedule[this.nextIndex];
        const at = this.startAt + e.atMs / 1000;
        if (at > now + 1.5) break;
        // 단계가 바뀌는 신호음은 두 번 울려 알린다 (규격대로)
        this.tone(at, { freq: e.levelStart ? 1180 : 880, ms: e.levelStart ? 150 : 110 });
        if (e.levelStart) this.tone(at + 0.2, { freq: 1180, ms: 150 });
        this.nextIndex++;
      }

      // 울린 신호음에 대해 판정 콜백을 부른다 (소리와 같은 시계라 어긋나지 않는다)
      while (this.firedIndex < this.schedule.length) {
        const e = this.schedule[this.firedIndex];
        if (this.startAt + e.atMs / 1000 > now) break;
        this.firedIndex++;
        this.on.beep(e);
      }

      this.on.tick(this.state());

      if (this.firedIndex >= this.schedule.length) { this.stop(); this.on.finish(); }
    }, 25);
  }

  /** 화면에 보여줄 지금 상태 */
  state() {
    if (!this.ctx) return { running: false };
    const now = this.ctx.currentTime;
    const elapsed = now - this.startAt;
    const cur = this.schedule[Math.min(this.firedIndex, this.schedule.length - 1)] || null;
    const nextAt = cur ? this.startAt + cur.atMs / 1000 : null;
    return {
      running: this.running,
      counting: elapsed < 0,
      elapsedSec: Math.max(0, elapsed),
      lap: this.firedIndex,                       // 지금까지 울린 신호음 수 = 요구된 왕복 수
      nextLap: cur ? cur.lap : null,
      level: cur ? cur.level : null,
      levelLap: cur ? cur.levelLap : null,
      secToNext: nextAt === null ? null : Math.max(0, nextAt - now),
      intervalSec: cur ? cur.intervalMs / 1000 : null,
    };
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** 짧은 알림음 (교사 조작 확인용) */
  blip(kind = 'ok') {
    if (!this.ctx) return;
    const at = this.ctx.currentTime + 0.01;
    if (kind === 'warn') { this.tone(at, { freq: 400, ms: 90, gain: 0.25 }); this.tone(at + 0.12, { freq: 320, ms: 120, gain: 0.25 }); }
    else if (kind === 'end') { this.tone(at, { freq: 300, ms: 260, gain: 0.3 }); }
    else this.tone(at, { freq: 760, ms: 70, gain: 0.2 });
  }
}
