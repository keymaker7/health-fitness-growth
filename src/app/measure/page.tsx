"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Open20Regular } from "@fluentui/react-icons";
import { Card, PageTitle, Pivot, Tag } from "@/components/ui";
import { MeasureRecordForm } from "@/components/MeasureRecordForm";
import { StandardNote } from "@/components/StandardNote";
import { AskAgentButton } from "@/components/AskAgentButton";
import { CameraCounter } from "@/features/jump-rope/CameraCounter";
import { SquatCamera } from "@/features/squat/SquatCamera";
import { MEASURE_TOOLS, getMeasureTool } from "@/features/measure/registry";

/** 앱 안에서 재는 도구를 종목에 맞게 고른다. */
function NativeTool({ id, onCount }: { id: string; onCount: (total: number) => void }) {
  if (id === "squat-cam") return <SquatCamera onCount={onCount} />;
  return <CameraCounter onCount={onCount} />;
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
      </Card>

      {tool.native ? (
        <NativeTool
          key={tool.id}
          id={tool.id}
          onCount={(total) =>
            // 값 전달은 바깥 도구와 같은 길을 쓴다. 받는 쪽을 두 벌 만들지 않기 위해서다.
            window.postMessage(
              { source: "measure-tool", tool: tool.id, value: total, unit: tool.record.unit },
              window.location.origin,
            )
          }
        />
      ) : (
        <div className="measure-frame">
          <iframe
            key={tool.id}
            src={tool.url}
            title={tool.name}
            className="h-full w-full"
            allow="camera; microphone; fullscreen; autoplay; accelerometer; gyroscope"
          />
        </div>
      )}

      <MeasureRecordForm key={tool.id} tool={tool} />
      <AskAgentButton
        title="측정 방법이 헷갈리나요?"
        hint="파울, 신호음, 준비물, 안전 수칙을 Teams 도우미가 매뉴얼 근거로 알려줘요."
      />
      <p className="text-[var(--font-size-200)] text-[var(--muted)]">
        카메라를 쓰는 도구는 브라우저가 권한을 물어봐요. 화면이 비어 있으면 새 탭에서 열어 주세요.
      </p>
    </div>
  );
}
