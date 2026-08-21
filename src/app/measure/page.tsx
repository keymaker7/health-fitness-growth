"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Open20Regular } from "@fluentui/react-icons";
import { Card, PageTitle, Pivot, Tag } from "@/components/ui";
import { MeasureRecordForm } from "@/components/MeasureRecordForm";
import { Emph } from "@/components/Emph";
import { StandardNote } from "@/components/StandardNote";
import { AskAgentButton } from "@/components/AskAgentButton";
import { CameraCounter } from "@/features/jump-rope/CameraCounter";
import { SquatCamera } from "@/features/squat/SquatCamera";
import { ShuttleRun } from "@/features/shuttle-run/ShuttleRun";
import { LongJumpCamera } from "@/features/long-jump/LongJumpCamera";
import { MEASURE_TOOLS, getMeasureTool, type MeasureTool } from "@/features/measure/registry";

// 종목별 도구는 아래 JSX에서 각자 제 자리를 갖는다.
// 한 자리에서 key 만 바꿔 갈아끼우는 방식은 이 Next/React 조합에서
// 이전 종목 화면을 못 지우는 버그가 있다 — 탭을 바꿀 때마다 카드가 쌓였다.

/** 값 전달은 바깥 도구와 같은 길(postMessage)을 쓴다. 받는 쪽을 두 벌 만들지 않기 위해서다. */
function sendCount(tool: MeasureTool) {
  return (total: number) =>
    window.postMessage(
      { source: "measure-tool", tool: tool.id, value: total, unit: tool.record.unit },
      window.location.origin,
    );
}

export default function MeasurePage() {
  return (
    <Suspense fallback={<p className="text-[var(--muted)]">불러오는 중...</p>}>
      <MeasureInner />
    </Suspense>
  );
}

function MeasureInner() {
  const sp = useSearchParams();
  const initial = getMeasureTool(sp.get("tool") ?? "") ?? MEASURE_TOOLS[0];
  const [current, setCurrent] = useState(initial.id);
  // 사이드바가 종목별 /measure?tool= 링크를 갖는다 — 이미 이 화면에 있어도 링크를 누르면 종목이 바뀌어야 한다.
  const spTool = sp.get("tool");
  useEffect(() => {
    if (spTool && getMeasureTool(spTool)) setCurrent(spTool);
  }, [spTool]);
  const tool = getMeasureTool(current) ?? MEASURE_TOOLS[0];

  return (
    <div className="stack">
      <PageTitle
        kicker="측정 도구"
        title="교실에서 바로 재는 도구"
        sub="종목마다 만든 측정 도구를 탭으로 열어요. 도구에서 나온 값을 아래에 적으면 나의 기록이 되고, 운동처방이 그 값에 맞게 바뀝니다."
      />
      <StandardNote screen="measure" />
      <Pivot
        value={current}
        onChange={setCurrent}
        options={MEASURE_TOOLS.map((t) => ({ value: t.id, label: t.name }))}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-[var(--space-50)]">
          <Tag tone="brand">{tool.factor}</Tag>
          {tool.camera ? <Tag>카메라 사용</Tag> : null}
          {tool.native ? <Tag tone="success">앱 안에서 측정</Tag> : null}
        </div>
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)] text-[var(--muted)]">{tool.description}</p>
        {tool.native ? null : (
          <a
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            className="mt-[var(--space-100)] inline-flex items-center gap-[var(--space-50)] text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline"
          >
            <Open20Regular />
            새 탭에서 열기
          </a>
        )}
        {tool.alsoAt ? (
          tool.alsoAt.url ? (
            <a
              href={tool.alsoAt.url}
              target="_blank"
              rel="noreferrer"
              className="mt-[var(--space-100)] inline-flex items-center gap-[var(--space-50)] text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline"
            >
              <Open20Regular />
              {tool.alsoAt.label}
            </a>
          ) : (
            // 아직 링크가 없는 갈래 — 자리만 보여준다. url 이 채워지면 위의 진짜 링크로 바뀐다.
            <span
              aria-disabled
              className="mt-[var(--space-100)] inline-flex cursor-default items-center gap-[var(--space-50)] text-[var(--font-size-300)] font-semibold text-[var(--muted)]"
            >
              <Open20Regular />
              {tool.alsoAt.label}
            </span>
          )
        ) : null}
      </Card>

      {tool.native && tool.id === "shuttle-run" ? <ShuttleRun onCount={sendCount(tool)} /> : null}
      {tool.native && tool.id === "long-jump" ? <LongJumpCamera onCount={sendCount(tool)} /> : null}
      {tool.native && tool.id === "jump-rope" ? <CameraCounter onCount={sendCount(tool)} /> : null}
      {tool.native && tool.id === "squat-cam" ? <SquatCamera onCount={sendCount(tool)} /> : null}
      {!tool.native ? (
        <div className="measure-frame">
          <iframe
            key={tool.id}
            src={tool.url}
            title={tool.name}
            className="h-full w-full"
            allow="camera; microphone; fullscreen; autoplay; accelerometer; gyroscope"
          />
        </div>
      ) : null}

      {/* 고른 종목의 사용 방법만 보인다 — 탭을 바꾸면 이 카드도 같이 바뀐다 */}
      <Card>
        <div className="flex flex-wrap items-center gap-[var(--space-50)]">
          <Tag tone="brand">사용 방법</Tag>
          <Tag>{tool.name}</Tag>
        </div>
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)] font-semibold">준비</p>
        <ul className="mt-[var(--space-50)] list-disc space-y-[var(--space-50)] pl-[var(--space-300)] text-[var(--font-size-300)]">
          {tool.guide.ready.map((s, i) => (
            <li key={i}><Emph text={s} /></li>
          ))}
        </ul>
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)] font-semibold">순서</p>
        <ol className="mt-[var(--space-50)] list-decimal space-y-[var(--space-50)] pl-[var(--space-300)] text-[var(--font-size-300)]">
          {tool.guide.steps.map((s, i) => (
            <li key={i}><Emph text={s} /></li>
          ))}
        </ol>
        <p className="mt-[var(--space-150)] text-[var(--font-size-300)] font-semibold">알아두면 좋아요</p>
        <ul className="mt-[var(--space-50)] list-disc space-y-[var(--space-50)] pl-[var(--space-300)] text-[var(--font-size-300)] text-[var(--muted)]">
          {tool.guide.tips.map((s, i) => (
            <li key={i}><Emph text={s} /></li>
          ))}
        </ul>
      </Card>

      <MeasureRecordForm key={tool.id} tool={tool} />
      <AskAgentButton
        title={`${tool.record.exerciseName} 측정이 헷갈리나요?`}
        hint="파울, 신호음, 준비물, 안전 수칙을 Teams 도우미가 매뉴얼 근거로 알려줘요."
      />
      {tool.camera ? (
        <p className="text-[var(--font-size-200)] text-[var(--muted)]">
          카메라를 쓰는 도구는 브라우저가 권한을 물어봐요. 화면이 비어 있으면 권한을 허용했는지 확인해 주세요.
        </p>
      ) : null}
    </div>
  );
}
