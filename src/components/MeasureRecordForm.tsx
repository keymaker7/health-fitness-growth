"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import type { MeasureTool } from "@/features/measure/registry";

export function MeasureRecordForm({ tool }: { tool: MeasureTool }) {
  const { saveSession } = useApp();
  const [value, setValue] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fromTool, setFromTool] = useState(false);

  // 위 iframe 의 측정 도구가 값을 보내면 이 칸을 대신 채운다.
  // 아이가 숫자를 눈으로 읽어 옮겨 적는 동안 생기는 오타를 없앤다.
  // 저장은 여전히 사람이 누른다 — 연습으로 뛴 값이 기록에 섞이면 처방이 틀어지기 때문이다.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== new URL(tool.url).origin) return;
      const d = e.data;
      if (!d || d.source !== "measure-tool" || d.tool !== tool.id) return;
      const n = Number(d.value);
      if (!Number.isFinite(n) || n <= 0) return;
      setValue(String(Math.round(n)));
      setFromTool(true);
      setSaved(null);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [tool]);

  const count = Number(value);
  const min = Number(minutes);
  const valid = Number.isFinite(count) && count > 0 && Number.isFinite(min) && min > 0;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    const end = new Date();
    const start = new Date(end.getTime() - min * 60000);
    const res = await saveSession({
      exerciseId: tool.record.exerciseId,
      exerciseName: tool.record.exerciseName,
      exerciseType: tool.record.exerciseType,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSec: Math.round(min * 60),
      count: Math.round(count),
      score: Math.round(count),
      accuracy: 0,
      // 도구가 넘긴 값이면 카메라로 잰 것이다. CSV 「기록방법」과 업로드 JSON 이 이 값을 그대로 쓴다.
      source: fromTool && tool.camera ? "camera" : "manual",
      extra: { measureTool: tool.id, unit: tool.record.unit },
    });
    setBusy(false);
    setValue("");
    setFromTool(false);
    setSaved(
      res.isPersonalBest
        ? `최고 기록이에요! ${res.session.count}${tool.record.unit}을 기록에 담았어요.`
        : `${res.session.count}${tool.record.unit}을 기록에 담았어요.`,
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">측정 결과 남기기</Tag>
        <Tag>{tool.record.exerciseName}</Tag>
        {fromTool ? <Tag tone="success">도구에서 값이 넘어왔어요</Tag> : null}
      </div>
      <p className="mt-[var(--space-150)] text-[var(--font-size-300)] text-[var(--muted)]">
        {fromTool
          ? "위 도구에서 잰 값이 아래에 그대로 들어왔어요. 맞는지 확인하고 기록에 담으면 운동처방이 다시 만들어져요."
          : "위 도구에서 측정을 마치고 «성장일지에 넣기»를 누르면 값이 여기로 들어와요. 직접 적어도 됩니다."}
      </p>
      <div className="mt-[var(--space-200)] grid gap-[var(--space-150)] sm:grid-cols-2">
        <label className="block">
          <span className="text-[var(--font-size-300)] font-semibold">측정값 ({tool.record.unit})</span>
          <input
            className="field mt-[var(--space-100)]"
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={tool.record.unit === "cm" ? "예: 152" : "예: 120"}
          />
        </label>
        <label className="block">
          <span className="text-[var(--font-size-300)] font-semibold">걸린 시간 (분)</span>
          <input
            className="field mt-[var(--space-100)]"
            type="number"
            inputMode="numeric"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
      </div>
      <BtnRow className="mt-[var(--space-200)]">
        <Button onClick={submit} disabled={!valid || busy}>
          기록에 담기
        </Button>
        <Link href="/prescription">
          <Button variant="ghost">운동처방 다시 보기</Button>
        </Link>
      </BtnRow>
      {saved ? (
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)] font-semibold text-[var(--brand-ink)]">{saved}</p>
      ) : null}
    </Card>
  );
}
