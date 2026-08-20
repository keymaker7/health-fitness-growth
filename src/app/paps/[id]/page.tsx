"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, PageTitle } from "@/components/ui";
import { getPapsEvent } from "@/lib/catalog";
import { PapsMotion } from "@/features/paps/PapsMotion";
import { measureToolsForPaps } from "@/features/measure/registry";
import { Emph } from "@/components/Emph";

export default function PapsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ev = getPapsEvent(id);
  if (!ev) return <p>종목을 찾을 수 없어요.</p>;
  const tools = measureToolsForPaps(ev.id);

  return (
    <div className="stack">
      <PageTitle kicker={ev.fitnessFactor} title={ev.name} sub={ev.purpose} />
      <PapsMotion eventId={ev.id} />
      {tools.map((t) => (
        <Card key={t.id}>
          <p className="font-semibold">{t.name}</p>
          <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{t.description}</p>
          <Link href={`/measure?tool=${t.id}`}>
            <Button className="mt-[var(--space-150)] w-full sm:w-auto">측정 도구 열기</Button>
          </Link>
        </Card>
      ))}
      <Card>
        <p className="font-semibold">측정 목적</p>
        <p className="mt-[var(--space-100)] leading-[var(--line-400)]">{ev.purpose}</p>
      </Card>
      <Card>
        <p className="font-semibold">측정 방법</p>
        <ol className="mt-[var(--space-100)] list-decimal space-y-[var(--space-100)] pl-5">
          {ev.method.map((m) => (
            <li key={m}><Emph text={m} /></li>
          ))}
        </ol>
      </Card>
      <Card>
        <p className="font-semibold">올바른 자세</p>
        <ul className="mt-[var(--space-100)] list-disc space-y-[var(--space-100)] pl-5">
          {ev.posture.map((m) => (
            <li key={m}><Emph text={m} /></li>
          ))}
        </ul>
      </Card>
      <Card>
        <p className="font-semibold">주의사항</p>
        <ul className="mt-[var(--space-100)] list-disc space-y-[var(--space-100)] pl-5">
          {ev.cautions.map((m) => (
            <li key={m}><Emph text={m} /></li>
          ))}
        </ul>
      </Card>
      <Card>
        <p className="text-[var(--font-size-300)] text-[var(--muted)]">적용 · {ev.applicable}</p>
        {ev.place ? <p className="text-[var(--font-size-300)] text-[var(--muted)]">장소 · {ev.place}</p> : null}
        {ev.tools?.length ? <p className="text-[var(--font-size-300)] text-[var(--muted)]">도구 · {ev.tools.join(", ")}</p> : null}
        <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
          {ev.sources.map((s) => `${s.title} (${s.note})`).join(" / ")}
        </p>
      </Card>
      <div className="overflow-hidden rounded-[var(--radius-large)] border border-dashed border-[var(--line)] bg-[var(--bg-subtle)] p-[var(--space-300)] text-center">
        <p className="font-semibold">공식 측정 영상</p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">
          확인된 공식 영상 URL이 없어 자리만 남겨 두었습니다. 학교에서 쓰는 안내 영상을 연결할 수 있어요.
        </p>
      </div>
      {ev.practiceExerciseId ? (
        <Link href={`/workout/${ev.practiceExerciseId}?from=paps`}>
          <Button className="w-full">연습하기</Button>
        </Link>
      ) : null}
    </div>
  );
}
