import type { PapsRecord, User, WorkoutSession } from "@/types/models";
import { getComponent, getExercise, getPapsEvent } from "@/lib/catalog";
import { EMOTION_LABEL } from "@/lib/emotions";
import { getGrowthProgress } from "@/lib/levels";
import { xpFromSessions } from "@/lib/progress";

const SOURCE_KO: Record<string, string> = {
  manual: "직접 입력",
  microbit: "마이크로비트",
  camera: "카메라",
  game: "게임",
  simulation: "시뮬레이션",
};

function cell(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  // Excel이 한글을 깨뜨리지 않도록 UTF-8 BOM과 CRLF를 붙입니다.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function dateParts(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function sessionsCsv(user: User, sessions: WorkoutSession[]) {
  const ordered = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const rows = ordered.map((s, i) => {
    const { date, time } = dateParts(s.startTime);
    const ex = getExercise(s.exerciseId);
    const factors = (ex?.componentIds ?? []).map((c) => getComponent(c)?.name ?? c).join(" ");
    // 그날까지 쌓인 기록으로 계산한 레벨이라, 시간에 따른 성장이 그대로 보입니다.
    const level = getGrowthProgress(xpFromSessions(ordered.slice(0, i + 1))).level;
    return [
      date,
      time,
      user.displayName,
      user.grade,
      user.className,
      s.exerciseName,
      factors,
      s.count || "",
      Math.round(s.durationSec / 60),
      s.accuracy || "",
      s.beforeEmotion ? EMOTION_LABEL[s.beforeEmotion] : "",
      s.afterEmotion ? EMOTION_LABEL[s.afterEmotion] : "",
      SOURCE_KO[s.source] ?? s.source,
      level,
    ];
  });
  return toCsv(
    [
      "날짜",
      "시각",
      "학생",
      "학년",
      "반",
      "종목",
      "체력요인",
      "횟수",
      "시간(분)",
      "정확도(%)",
      "운동전기분",
      "운동후기분",
      "기록방법",
      "레벨",
    ],
    rows,
  );
}

export function papsCsv(user: User, records: PapsRecord[]) {
  const rows = [...records]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((r) => {
      const event = getPapsEvent(r.eventId);
      return [
        dateParts(r.measuredAt).date,
        user.displayName,
        user.grade,
        user.className,
        event?.name ?? r.eventId,
        event?.fitnessFactor ?? "",
        r.value,
        r.unit,
        r.grade,
      ];
    });
  return toCsv(["날짜", "학생", "학년", "반", "종목", "체력요인", "측정값", "단위", "등급"], rows);
}

/**
 * Power Automate가 그대로 먹을 수 있는 평평한 구조입니다.
 * 운동과 측정을 한 배열에 담아 흐름에서 반복문 하나로 끝나게 하고,
 * 값이 비는 항목이 없도록 모든 열을 항상 채웁니다. 빈 값이 있으면 흐름이 실패합니다.
 */
export function uploadPayload(user: User, sessions: WorkoutSession[], records: PapsRecord[]) {
  const no = user.displayName;

  const workoutRows = [...sessions]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((s) => {
      const { date, time } = dateParts(s.startTime);
      const ex = getExercise(s.exerciseId);
      return {
        key: `${no}_${date}_${time}_${s.exerciseName}`,
        no,
        date,
        kind: "운동",
        item: s.exerciseName,
        factor: (ex?.componentIds ?? []).map((c) => getComponent(c)?.name ?? c).join(" "),
        value: s.count,
        unit: "회",
        grade: "",
        minutes: Math.round(s.durationSec / 60),
        mood: s.afterEmotion ? EMOTION_LABEL[s.afterEmotion] : "",
        method: SOURCE_KO[s.source] ?? s.source,
      };
    });

  const papsRows = [...records]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((r) => {
      const { date } = dateParts(r.measuredAt);
      const event = getPapsEvent(r.eventId);
      return {
        key: `${no}_${date}_${event?.name ?? r.eventId}`,
        no,
        date,
        kind: "측정",
        item: event?.name ?? r.eventId,
        factor: event?.fitnessFactor ?? "",
        value: r.value,
        unit: r.unit,
        grade: String(r.grade),
        minutes: 0,
        mood: "",
        method: "PAPS",
      };
    });

  return {
    app: "health-fitness-growth",
    kind: "upload",
    exportedAt: new Date().toISOString(),
    student: { no, grade: user.grade, className: user.className },
    rows: [...workoutRows, ...papsRows],
  };
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function stampedName(prefix: string, studentName: string, ext: string) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const safe = studentName.replace(/[\\/:*?"<>|]/g, "");
  return `${prefix}_${safe}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${ext}`;
}
