"use client";

import Link from "next/link";
import { useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import type { MeasureTool } from "@/features/measure/registry";

export function MeasureRecordForm({ tool }: { tool: MeasureTool }) {
  const { saveSession } = useApp();
  const [value, setValue] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      source: "manual",
      extra: { measureTool: tool.id, unit: tool.record.unit },
    });
    setBusy(false);
    setValue("");
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
      </div>
      <p className="mt-[var(--space-150)] text-[var(--font-size-300)] text-[var(--muted)]">
        도구에서 나온 값을 여기에 적으면 나의 기록이 되고, 맞춤 운동처방이 그 값에 맞게 다시 만들어져요.
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
