"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { BeepPlayer } from "@/features/shuttle-run/beep.js";
import { buildSchedule, maxLaps, distanceForGrade, GRADE_LABEL } from "@/features/shuttle-run/paps.js";
import type { ScheduleEntry } from "@/features/shuttle-run/paps";
import type { BeepState } from "@/features/shuttle-run/beep";
import { Roster, parseNames } from "@/features/shuttle-run/roster.js";
import { LaneVision, laneBands, targetSideOf } from "@/features/shuttle-run/vision.js";
import type { LaneVerdict } from "@/features/shuttle-run/vision";
import { CameraController } from "@/features/pose/camera.js";

/**
 * 앱 안에서 왕복오래달리기를 재는 화면 — 셔틀런 앱의 «다인 측정»을 그대로 옮겼다.
 *
 * 신호음(beep.js)·규정(paps.js)·감지(vision.js)·명단(roster.js)은 원본 코드 그대로다.
 * 이 파일은 원본 app.js 가 하던 "언제 누구를 부를지"만 React 로 다시 썼다.
 *
 * 카메라는 관절 인식이 아니라 배경 차이로 레인별 가로 위치만 본다 —
 * 신호음이 울린 순간 "선을 넘어 있었는가"만 판정하면 되기 때문이다. (원본 설계 그대로)
 */

const SAVE_KEY = "shuttlerun.state.v1";
const GRADE_KEYS = ["초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"];

export function ShuttleRun({ onCount }: { onCount?: (total: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const rosterRef = useRef(new Roster({ lanes: 4, gradeKey: "초6" }));
  const visionRef = useRef(new LaneVision({ w: 192, h: 108, lanes: laneBands(4) }));
  const playerRef = useRef<InstanceType<typeof BeepPlayer> | null>(null);
  const camRef = useRef<CameraController | null>(null);
  const smallRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  const laneTopRef = useRef(0.18);
  const laneBottomRef = useRef(0.95);
  const startSideRef = useRef<"left" | "right">("left");
  const pendingMissRef = useRef<boolean[]>([]);
  const lastVerdictsRef = useRef<LaneVerdict[]>([]);
  const camOnRef = useRef(false);
  const autoJudgeRef = useRef(true);
  const distanceRef = useRef(15);
  const dragRef = useRef<null | "lineLeft" | "lineRight" | "top" | "bottom">(null);

  const [namesText, setNamesText] = useState("");
  const [gradeKey, setGradeKey] = useState("초6");
  const [lanes, setLanes] = useState(4);
  const [distance, setDistance] = useState(15);
  const [camOn, setCamOn] = useState(false);
  const [autoJudge, setAutoJudge] = useState(true);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stage, setStage] = useState<BeepState | null>(null);
  const [status, setStatus] = useState("학년·레인 수를 정하고 명단을 넣으세요. 명단 없이 레인 번호만으로도 잽니다.");
  const [, setTickCount] = useState(0);
  const bump = useCallback(() => setTickCount((t) => t + 1), []);

  distanceRef.current = distance;
  autoJudgeRef.current = autoJudge;

  const save = useCallback(() => {
    const vision = visionRef.current;
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          roster: rosterRef.current.toJSON(),
          distanceM: distanceRef.current,
          startSide: startSideRef.current,
          view: { lineLeft: vision.lineLeft, lineRight: vision.lineRight, top: laneTopRef.current, bottom: laneBottomRef.current },
        }),
      );
    } catch {
      /* 저장이 막혀 있어도 측정은 계속돼야 한다 */
    }
  }, []);

  const syncLanes = useCallback(() => {
    const roster = rosterRef.current;
    visionRef.current.setLanes(laneBands(roster.lanes, laneTopRef.current, laneBottomRef.current));
    pendingMissRef.current = Array(roster.lanes).fill(false);
    lastVerdictsRef.current = [];
  }, []);

  /** 저장된 명단·선 위치 복원 (원본 load() 그대로) */
  useEffect(() => {
    try {
      const o = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (o) {
        rosterRef.current = Roster.fromJSON(o.roster);
        distanceRef.current = o.distanceM || 15;
        startSideRef.current = o.startSide || "left";
        const vision = visionRef.current;
        if (o.view) {
          vision.lineLeft = o.view.lineLeft ?? vision.lineLeft;
          vision.lineRight = o.view.lineRight ?? vision.lineRight;
          laneTopRef.current = o.view.top ?? laneTopRef.current;
          laneBottomRef.current = o.view.bottom ?? laneBottomRef.current;
        }
      }
    } catch {
      /* 저장값이 깨졌으면 기본값으로 시작한다 */
    }
    const roster = rosterRef.current;
    setNamesText(roster.students.map((s) => (s.sex ? `${s.name} ${s.sex === "female" ? "여" : "남"}` : s.name)).join("\n"));
    setGradeKey(roster.gradeKey);
    setLanes(roster.lanes);
    setDistance(distanceRef.current);
    syncLanes();
    if (!roster.heat.length) roster.nextHeat();
    bump();
  }, [syncLanes, bump]);

  // ── 카메라 ──────────────────────────────────────────────
  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const c = overlayRef.current;
    if (!video || !c) return;
    const vision = visionRef.current;
    if (c.width !== video.clientWidth || c.height !== video.clientHeight) {
      c.width = video.clientWidth;
      c.height = video.clientHeight;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    ctx.lineWidth = 1;
    vision.lanes.forEach((b, i) => {
      ctx.fillStyle = i % 2 ? "rgba(91,140,255,.07)" : "rgba(91,140,255,.13)";
      ctx.fillRect(0, b.y0 * H, W, (b.y1 - b.y0) * H);
      ctx.fillStyle = "rgba(238,242,255,.85)";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(`${i + 1}`, 6, b.y0 * H + 16);
    });

    ctx.strokeStyle = "#ffb020";
    ctx.lineWidth = 2;
    [laneTopRef.current, laneBottomRef.current].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y * H);
      ctx.lineTo(W, y * H);
      ctx.stroke();
    });

    ctx.strokeStyle = "#5b8cff";
    ctx.lineWidth = 3;
    [vision.lineLeft, vision.lineRight].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x * W, 0);
      ctx.lineTo(x * W, H);
      ctx.stroke();
    });

    vision.trackers.forEach((t, i) => {
      const x = t.positionAt(performance.now());
      if (x === null) return;
      const band = vision.lanes[i];
      if (!band) return;
      const cy = ((band.y0 + band.y1) / 2) * H;
      ctx.fillStyle = "#33d17a";
      ctx.beginPath();
      ctx.arc(x * W, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const visionLoop = useCallback(() => {
    rafRef.current = requestAnimationFrame(visionLoop);
    const video = videoRef.current;
    if (!camOnRef.current || !video || !video.videoWidth) return;
    const vision = visionRef.current;
    if (!smallRef.current) {
      smallRef.current = document.createElement("canvas");
      smallRef.current.width = vision.w;
      smallRef.current.height = vision.h;
    }
    const small = smallRef.current;
    const sctx = small.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;
    sctx.drawImage(video, 0, 0, small.width, small.height);
    const img = sctx.getImageData(0, 0, small.width, small.height).data;
    const gray = new Uint8ClampedArray(small.width * small.height);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (img[p] * 77 + img[p + 1] * 150 + img[p + 2] * 29) >> 8; // 사람 눈에 맞춘 회색조
    }
    vision.push(gray, performance.now());
    drawOverlay();
  }, [drawOverlay]);

  const startCam = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!camRef.current) {
      camRef.current = new CameraController(video, {
        prefKey: "jumprope.camera",
        onError: (m: string) => { if (m) setStatus(m); },
        onChange: () => bump(),
      });
      camRef.current.watchDeviceChange();
    }
    if (!(await camRef.current.start())) return;
    // 화면·오버레이·판정이 전부 같은 (안 뒤집힌) 좌표를 쓰도록 거울은 끈다.
    camRef.current.setMirror(false);
    camOnRef.current = true;
    setCamOn(true);
    visionRef.current.resetBackground();
    setStatus("아무도 없는 상태에서 «배경 다시 잡기»를 누른 뒤, 파란 선 두 개를 실제 콘 위치에 끌어 맞추세요.");
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(visionLoop);
  }, [visionLoop, bump]);

  const stopCam = useCallback(() => {
    camOnRef.current = false;
    setCamOn(false);
    cancelAnimationFrame(rafRef.current);
    camRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const flipCam = useCallback(async () => {
    const cam = camRef.current;
    if (!cam || cam.busy) return;
    if (await cam.switchNext()) {
      cam.setMirror(false);
      // 카메라가 바뀌면 지난 배경은 쓸 수 없다 — 바로 다시 잡는다.
      visionRef.current.resetBackground();
      setStatus(`${cam.facingKo} 카메라로 바꿨어요. 아무도 없을 때 배경이 다시 잡힙니다.`);
    }
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      playerRef.current?.stop();
      camRef.current?.stream?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  // 화면이 꺼지면 측정이 멈춘다 — 태블릿에서 흔한 사고라 미리 막는다 (원본 그대로)
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: { release?: () => Promise<void> } | null = null;
    const acquire = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<never> } }).wakeLock.request("screen");
      } catch {
        /* 지원 안 하면 그만 */
      }
    };
    const onVis = () => { if (document.visibilityState === "visible") void acquire(); };
    document.addEventListener("visibilitychange", onVis);
    void acquire();
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release?.();
    };
  }, [running]);

  // ── 설정 ────────────────────────────────────────────────
  const applySetup = useCallback(() => {
    const roster = rosterRef.current;
    const students = parseNames(namesText);
    const laneN = Math.max(1, Math.min(8, lanes || 4));
    roster.setStudents(students, gradeKey, laneN);
    syncLanes();
    roster.nextHeat();
    save();
    bump();
    setStatus(
      students.length
        ? `${students.length}명 · ${laneN}개 레인 · ${distanceRef.current}m — 한 조에 ${laneN}명씩 ${Math.ceil(students.length / laneN)}조로 돕니다.`
        : "명단이 비어 있습니다. 명단 없이도 레인 번호만으로 측정할 수 있습니다.",
    );
  }, [namesText, gradeKey, lanes, syncLanes, save, bump]);

  // ── 판정 (원본 handleBeep 그대로) ────────────────────────
  const handleBeep = useCallback(
    (entry: ScheduleEntry, player: InstanceType<typeof BeepPlayer>) => {
      const roster = rosterRef.current;
      const vision = visionRef.current;
      const side = targetSideOf(entry.lap, startSideRef.current);
      const now = performance.now();
      const verdicts = camOnRef.current && autoJudgeRef.current ? vision.judge(side, now) : null;
      lastVerdictsRef.current = verdicts || [];

      const runners = roster.heatRunners();
      let anyWarn = false;
      let anyEnd = false;

      runners.forEach((r, lane) => {
        if (!r || r.done) return;
        let reached: boolean;
        if (pendingMissRef.current[lane]) reached = false; // 교사 판정이 가장 세다
        else if (verdicts && verdicts[lane]?.known) reached = verdicts[lane].reached;
        else reached = true; // 모르면 아이에게 유리하게 (교사가 되돌릴 수 있다)

        const res = r.onBeep(entry.lap, reached);
        if (res === "warn") anyWarn = true;
        if (res === "end") anyEnd = true;
      });

      pendingMissRef.current.fill(false);
      if (anyEnd) player.blip("end");
      else if (anyWarn) player.blip("warn");

      if (roster.heatFinished) {
        finishAll("이 조는 모두 끝났습니다. «다음 조 세우기»를 누르세요.");
      } else {
        if (anyEnd) save();
        bump();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [save, bump],
  );

  const finishAll = useCallback(
    (msg: string) => {
      playerRef.current?.stop();
      rosterRef.current.heatRunners().forEach((r) => r?.stop());
      setRunning(false);
      setStage(null);
      setCountdown(null);
      setStatus(msg);
      save();
      bump();
    },
    [save, bump],
  );

  /**
   * 출발 직전 자가진단 — 카메라 판정을 믿어도 되는 상태인가. (원본 preflight 그대로)
   * 판정이 틀리면 규정상 미도달 두 번으로 조 전체가 두 번 만에 끝나므로, 시작 전에 잡아야 한다.
   */
  const preflight = useCallback((): { ok: boolean; msg: string } => {
    if (!camOnRef.current || !autoJudgeRef.current) return { ok: true, msg: "" };
    const roster = rosterRef.current;
    const vision = visionRef.current;
    const now = performance.now();
    const lanesInUse = roster.heat.map((si, lane) => ({ si, lane })).filter((o) => o.si !== null && o.si !== undefined);
    if (!lanesInUse.length) return { ok: true, msg: "" };

    const seen = lanesInUse.map((o) => ({ ...o, x: vision.trackers[o.lane]?.positionAt(now) ?? null }));
    const missing = seen.filter((o) => o.x === null);
    if (missing.length) {
      return {
        ok: false,
        msg:
          `⚠️ ${missing.map((o) => `${o.lane + 1}번 레인`).join(" · ")}에서 아이가 안 보입니다.\n` +
          "레인 띠(노란 가로선)가 아이들 위·아래를 덮고 있는지, 아무도 없을 때 «배경 다시 잡기»를 눌렀는지 확인해 주세요.\n" +
          "이대로 시작하면 안 보이는 레인은 «통과»로 처리됩니다.",
      };
    }

    const line = startSideRef.current === "left" ? vision.lineLeft : vision.lineRight;
    const far = seen.filter((o) => Math.abs((o.x as number) - line) > 0.25);
    if (far.length) {
      return {
        ok: false,
        msg:
          `⚠️ ${far.map((o) => `${o.lane + 1}번 레인`).join(" · ")}의 아이가 출발선에서 멀리 떨어져 보입니다.\n` +
          "파란 세로선 두 개가 실제 콘(선) 위치에 맞는지 확인해 주세요.\n" +
          "선이 어긋나면 규정상 미도달 두 번으로 조 전체가 두 번 만에 종료됩니다.",
      };
    }
    return { ok: true, msg: "" };
  }, []);

  const start = useCallback(async () => {
    const roster = rosterRef.current;
    const vision = visionRef.current;
    // 명단이 비어 있으면 레인 번호(1번~N번)로 채운다 — 명단 없이도, 혼자서도 바로 잰다.
    if (roster.count === 0) {
      // 카메라 자동 판정 + 명단 없음 = 대부분 혼자 재는 경우다.
      // 레인이 4개면 화면이 4개 띠로 갈려 한 사람 몸이 여러 띠에 걸치고,
      // 신호음 순간 선에 없으면 미도달 두 번으로 끝나 «1회에서 멈춘 것»처럼 보인다.
      // 그래서 이때는 화면 전체를 1레인으로 쓴다. 여럿이 재려면 명단을 넣으면 된다.
      const laneCount = camOnRef.current && autoJudgeRef.current ? 1 : roster.lanes;
      roster.setStudents(
        Array.from({ length: laneCount }, (_, i) => ({ name: `${i + 1}번`, sex: null })),
        roster.gradeKey,
        laneCount,
      );
      setLanes(laneCount);
      syncLanes();
    }
    if (!roster.heat.length || roster.heat.every((v) => v === null || v === undefined)) roster.nextHeat();
    if (roster.heat.every((v) => v === null || v === undefined)) {
      setStatus("모두 측정을 마쳤어요. 다시 재려면 «기록 지우기»를 누르세요.");
      return;
    }
    pendingMissRef.current = Array(roster.lanes).fill(false);
    lastVerdictsRef.current = [];

    // 아이들이 어느 쪽에 서 있는지 카메라로 먼저 본다 (없으면 왼쪽 출발로 본다)
    if (camOnRef.current) {
      const xs = vision.trackers.map((t) => t.positionAt(performance.now())).filter((x): x is number => x !== null);
      if (xs.length) startSideRef.current = xs.reduce((a, b) => a + b, 0) / xs.length > 0.5 ? "right" : "left";
    }

    const pf = preflight();
    if (!pf.ok && !window.confirm(`${pf.msg}\n\n그래도 시작할까요?\n(카메라 자동 판정을 끄고 손으로 판정하실 수도 있습니다)`)) return;

    const player = new BeepPlayer({
      onBeep: (entry: ScheduleEntry) => handleBeep(entry, player),
      onCountdown: (n: number) => {
        setCountdown(n);
        setStatus("출발선에 서세요.");
      },
      onStart: () => {
        setCountdown(null);
        setStatus("출발! 신호음이 울리기 전에 반대편 선을 양 발로 통과하세요.");
      },
      onTick: (s: BeepState) => setStage(s),
      onFinish: () => finishAll("21단계까지 완주했습니다 — 대단합니다!"),
    });
    playerRef.current = player;

    try {
      await player.start(buildSchedule(distanceRef.current), { countdownSec: 3 });
    } catch (e) {
      setStatus((e as Error).message);
      return;
    }
    setRunning(true);
    save();
    bump();
  }, [preflight, handleBeep, finishAll, save, bump, syncLanes]);

  // ── 선·경계 드래그 (아이패드에서 손가락으로 맞춘다) ─────────
  const dragPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = overlayRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const vision = visionRef.current;
    const p = dragPos(e);
    const cands: Array<{ k: "lineLeft" | "lineRight" | "top" | "bottom"; d: number }> = [
      { k: "lineLeft", d: Math.abs(p.x - vision.lineLeft) },
      { k: "lineRight", d: Math.abs(p.x - vision.lineRight) },
      { k: "top", d: Math.abs(p.y - laneTopRef.current) },
      { k: "bottom", d: Math.abs(p.y - laneBottomRef.current) },
    ];
    cands.sort((a, b) => a.d - b.d);
    if (cands[0].d > 0.08) return; // 아무 데나 눌렀을 땐 아무것도 잡지 않는다
    dragRef.current = cands[0].k;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const vision = visionRef.current;
    const p = dragPos(e);
    if (drag === "lineLeft") vision.lineLeft = Math.min(Math.max(p.x, 0.01), vision.lineRight - 0.05);
    else if (drag === "lineRight") vision.lineRight = Math.max(Math.min(p.x, 0.99), vision.lineLeft + 0.05);
    else if (drag === "top") {
      laneTopRef.current = Math.min(Math.max(p.y, 0), laneBottomRef.current - 0.08);
      syncLanes();
    } else if (drag === "bottom") {
      laneBottomRef.current = Math.max(Math.min(p.y, 1), laneTopRef.current + 0.08);
      syncLanes();
    }
    drawOverlay();
  };
  const onPointerEnd = () => {
    if (dragRef.current) {
      dragRef.current = null;
      save();
      bump();
    }
  };

  // ── 그리기용 파생값 ──────────────────────────────────────
  const roster = rosterRef.current;
  const runners = roster.heatRunners();
  const rows = roster.rows();
  // 혼자(또는 손 판정으로 다 같이) 잰 경우 — 기록이 전부 같으면 그 값을 «기록에 담기»로 내민다.
  const doneRunners = runners.filter((r): r is NonNullable<typeof r> => !!r && r.done);
  const soloRecord =
    !running && doneRunners.length > 0 && doneRunners.every((r) => r.record === doneRunners[0].record) && doneRunners[0].record > 0
      ? doneRunners[0].record
      : null;
  const dirSide = stage?.running ? targetSideOf((stage.lap || 0) + 1, startSideRef.current) : null;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">왕복오래달리기</Tag>
        <Tag>앱 안에서 바로</Tag>
        <Tag>{distance}m</Tag>
        <Tag>{roster.lanes}레인 동시</Tag>
        {camOn ? <Tag tone={autoJudge ? "success" : "neutral"}>{autoJudge ? "카메라 자동 판정" : "손 판정"}</Tag> : null}
      </div>

      {/* 설정 — 측정 중에는 잠근다 */}
      {!running ? (
        <div className="mt-[var(--space-200)] grid gap-[var(--space-150)] sm:grid-cols-2">
          <label className="text-[var(--font-size-300)]">
            학년
            <select className="field mt-[var(--space-50)]" value={gradeKey} onChange={(e) => { setGradeKey(e.target.value); setDistance(distanceForGrade(e.target.value)); }}>
              {GRADE_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="text-[var(--font-size-300)]">
            거리
            <select className="field mt-[var(--space-50)]" value={distance} onChange={(e) => setDistance(Number(e.target.value))}>
              <option value={15}>15m (초등)</option>
              <option value={20}>20m (중·고)</option>
            </select>
          </label>
          <label className="text-[var(--font-size-300)]">
            레인 수 (한 번에 뛰는 인원)
            <input
              className="field mt-[var(--space-50)]"
              type="number"
              min={1}
              max={8}
              value={lanes}
              onChange={(e) => {
                // 원본처럼 바꾸는 즉시 레인 띠·조 편성에 반영한다 (적용 버튼을 기다리지 않는다)
                const n = Math.max(1, Math.min(8, Number(e.target.value) || 4));
                setLanes(n);
                roster.lanes = n;
                syncLanes();
                roster.nextHeat();
                save();
                bump();
              }}
            />
          </label>
          <label className="text-[var(--font-size-300)] sm:row-span-2">
            명단 (한 줄에 한 명, «이름 남/여»)
            <textarea className="field mt-[var(--space-50)] min-h-[6rem]" value={namesText} onChange={(e) => setNamesText(e.target.value)} placeholder={"6-2-01 남\n6-2-02 여"} />
          </label>
          <BtnRow>
            <Button variant="soft" onClick={applySetup}>명단·설정 적용</Button>
            <Button
              variant="ghost"
              onClick={() => {
                roster.nextHeat();
                pendingMissRef.current = Array(roster.lanes).fill(false);
                lastVerdictsRef.current = [];
                save();
                bump();
              }}
            >
              다음 조 세우기
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (!window.confirm("기록을 모두 지웁니다. 계속할까요?")) return;
                roster.clearRecords();
                roster.nextHeat();
                save();
                bump();
                setStatus("기록을 지웠어요. 다시 잴 수 있습니다.");
              }}
            >
              기록 지우기
            </Button>
          </BtnRow>
        </div>
      ) : null}

      {/* 카메라 */}
      <BtnRow className="mt-[var(--space-200)]">
        {camOn ? (
          <Button variant="danger" onClick={stopCam}>카메라 끄기</Button>
        ) : (
          <Button variant="soft" onClick={() => void startCam()}>카메라 켜기 (자동 판정)</Button>
        )}
        {camOn ? (
          <Button variant="ghost" onClick={() => void flipCam()}>📷 {camRef.current?.otherKo ?? "뒷면"} 카메라로</Button>
        ) : null}
        {camOn ? (
          <Button variant="ghost" onClick={() => visionRef.current.resetBackground()}>배경 다시 잡기</Button>
        ) : null}
        {camOn ? (
          <label className="flex items-center gap-[var(--space-50)] text-[var(--font-size-300)]">
            <input type="checkbox" checked={autoJudge} onChange={(e) => setAutoJudge(e.target.checked)} />
            카메라 자동 판정
          </label>
        ) : null}
      </BtnRow>

      {/* 비디오는 항상 같은 노드여야 한다 — 노드가 바뀌면 카메라 스트림이 끊긴다 */}
      <div className={camOn ? "relative mt-[var(--space-150)] overflow-hidden rounded-[var(--radius-medium)] bg-black" : "hidden"}>
        <video ref={videoRef} playsInline muted className="block w-full" />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        />
      </div>
      {camOn ? (
        <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">
          파란 세로선 = 양쪽 콘(선) · 노란 가로선 = 레인 위·아래 경계 — 손가락으로 끌어 실제 위치에 맞추세요.
          초록 점이 아이 위치예요. 카메라는 옆(측면)에 두고, 아무도 없을 때 «배경 다시 잡기»를 누르세요.
          횟수는 <b>신호음마다 1회</b>씩만 올라가요 — 신호음이 울리는 순간 목표 선을 넘어 있으면 인정되고,
          신호음 전에 여러 번 왕복해도 더 올라가지 않아요 (PAPS 규정 그대로).
        </p>
      ) : null}

      {/* 진행 */}
      <div className="mt-[var(--space-200)] grid gap-[var(--space-150)] sm:grid-cols-4">
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">왕복</p>
          <p className="text-[var(--font-size-600)] font-bold text-[var(--brand-ink)]">{stage?.lap ?? 0}</p>
        </div>
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">단계</p>
          <p className="text-[var(--font-size-600)] font-bold">{stage?.level ?? "-"}</p>
        </div>
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">다음 신호음</p>
          <p className="text-[var(--font-size-600)] font-bold">
            {countdown !== null ? countdown : stage?.secToNext != null ? `${stage.secToNext.toFixed(1)}s` : "-"}
          </p>
        </div>
        <div className="rounded-[var(--radius-medium)] bg-[var(--brand-soft)] p-[var(--space-200)] text-center">
          <p className="text-[var(--font-size-200)] text-[var(--muted)]">방향</p>
          <p className="text-[var(--font-size-600)] font-bold">{dirSide ? (dirSide === "left" ? "← 출발선" : "반대편 →") : "-"}</p>
        </div>
      </div>

      {/* 레인 카드 — 누르면 «이번 회 미도달» 표시 (교사 정정, 원본 그대로) */}
      <div className="mt-[var(--space-200)] grid gap-[var(--space-100)] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: roster.lanes }, (_, lane) => {
          const si = roster.heat[lane];
          const r = runners[lane];
          const verdict = lastVerdictsRef.current[lane];
          const name = si === null || si === undefined ? "— 빈 레인 —" : roster.nameOf(si);
          const stateText = !r
            ? ""
            : r.done
              ? `종료 · 기록 ${r.finalLaps}회`
              : pendingMissRef.current[lane]
                ? "⛔️ 이번 회 미도달로 표시됨"
                : r.warnings === 1
                  ? "△ 경고 1회 — 다음 미도달이면 종료"
                  : verdict && !verdict.known
                    ? "⚠️ 카메라가 못 찾는 중 (통과로 처리)"
                    : "뛰는 중";
          return (
            <button
              key={lane}
              type="button"
              disabled={!r || r.done}
              onClick={() => {
                pendingMissRef.current[lane] = !pendingMissRef.current[lane];
                playerRef.current?.blip("ok");
                bump();
              }}
              className={`rounded-[var(--radius-medium)] border border-[var(--line)] p-[var(--space-150)] text-left transition ${
                !r ? "opacity-50" : r.done ? "bg-[var(--brand-soft)]" : pendingMissRef.current[lane] ? "border-red-400 bg-red-50" : "hover:border-[var(--brand-ink)]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-[var(--space-50)]">
                <span className="truncate font-semibold">{name}</span>
                <span className="shrink-0 text-[var(--font-size-200)] text-[var(--muted)]">{lane + 1}번 레인</span>
              </div>
              <p className="text-[var(--font-size-600)] font-bold text-[var(--brand-ink)]">{r ? r.record : "–"}</p>
              <p className="text-[var(--font-size-200)] text-[var(--muted)]">{stateText}</p>
              <p className="break-all text-[var(--font-size-200)]">{r ? r.marks.slice(-24).map((m) => m.mark).join("") : ""}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">{status}</p>

      <BtnRow className="mt-[var(--space-200)]">
        {running ? (
          <Button variant="danger" onClick={() => finishAll("교사가 중단했습니다. 지금까지의 횟수로 기록했습니다.")}>중단</Button>
        ) : (
          <Button onClick={() => void start()}>시작</Button>
        )}
        {soloRecord !== null && soloRecord > 0 && onCount ? (
          <Button variant="soft" onClick={() => onCount(soloRecord)}>{soloRecord}회를 기록에 담기</Button>
        ) : null}
        {rows.length ? (
          <Button
            variant="ghost"
            onClick={async () => {
              const csv = roster.csv();
              try {
                await navigator.clipboard.writeText(csv);
                setStatus("복사했습니다 — 구글 시트나 엑셀에 그대로 붙여넣으세요.");
              } catch {
                window.prompt("아래 내용을 복사하세요", csv);
              }
            }}
          >
            기록 CSV 복사
          </Button>
        ) : null}
      </BtnRow>

      {/* 기록표 */}
      {rows.length ? (
        <div className="mt-[var(--space-200)] overflow-x-auto">
          <table className="w-full text-[var(--font-size-300)]">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                <th className="py-[var(--space-50)] pr-[var(--space-100)]">순서</th>
                <th className="pr-[var(--space-100)]">번호</th>
                <th className="pr-[var(--space-100)]">성별</th>
                <th className="pr-[var(--space-100)]">레인</th>
                <th className="pr-[var(--space-100)]">왕복수</th>
                <th className="pr-[var(--space-100)]">등급(참고)</th>
                <th>기록지</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-[var(--space-50)] pr-[var(--space-100)]">{row.index + 1}</td>
                  <td className="pr-[var(--space-100)]">{row.name}</td>
                  <td className="pr-[var(--space-100)]">{row.sex === "female" ? "여" : row.sex === "male" ? "남" : ""}</td>
                  <td className="pr-[var(--space-100)]">{row.lane ?? ""}</td>
                  <td className="pr-[var(--space-100)] font-bold">{row.laps ?? ""}</td>
                  <td className="pr-[var(--space-100)]">{row.grade ? GRADE_LABEL[row.grade] : ""}</td>
                  <td className="break-all">{row.marks.map((m) => m.mark).join("")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">
            {roster.count
              ? `${roster.count}명 중 ${roster.count - roster.remaining}명 완료 · 남은 인원 ${roster.remaining}명 · 이 종목 최대 ${maxLaps(distance)}회`
              : ""}
            {" "}등급은 참고용이에요 (교육부 원문 표와 대조 전).
          </p>
        </div>
      ) : null}

      <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
        신호음 일정은 교육부 매뉴얼 그대로예요 (최대 {maxLaps(distance)}회). 신호음이 울리기 전에 반대편 선을 완전히 통과해야 인정됩니다.
        처음 한 번 놓치면 그 자리에서 돌아 뛰고, 두 번째로 놓치면 그 학생의 측정이 끝나요.
        카메라 없이도 잴 수 있어요 — 그때는 레인 카드를 눌러 «미도달»만 표시해 주면 됩니다.
      </p>
    </Card>
  );
}
