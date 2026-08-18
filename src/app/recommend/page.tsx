"use client";

import Link from "next/link";
import { BtnRow, Button, Card, PageTitle, Tag } from "@/components/ui";
import { WhyButton } from "@/components/WhyButton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useApp } from "@/features/dashboard/AppProvider";
import { getRecommendations } from "@/features/recommendation/engine";
import { getComponent, getExercise, getVideoForExercise } from "@/lib/catalog";
import { DIFFICULTY_KO } from "@/lib/progress";

export default function RecommendPage() {
  const { ready, profile } = useApp();
  if (!ready || !profile) return <p className="text-[var(--muted)]">불러오는 중...</p>;
  const recs = getRecommendations(profile);

  return (
    <div className="stack-lg">
      <PageTitle
        kicker="추천 운동"
        title="지금 나에게 필요한 움직임"
        sub="부족한 체력 요소부터 골라 줘요. 정보는 짧게, 시작 버튼은 분명하게."
      />
      <div className="grid gap-[var(--space-200)] lg:grid-cols-2">
        {recs.map((r) => {
          const ex = getExercise(r.exerciseId);
          const c = getComponent(r.targetComponentId);
          if (!ex) return null;
          const video = getVideoForExercise(ex.id);
          return (
            <Card key={r.id} className="flex flex-col overflow-hidden">
              {video?.youtubeId ? <VideoPlayer video={video} title={ex.name} flush /> : null}
              <div className="flex flex-wrap gap-[var(--space-50)]">
                <Tag tone="brand">{c?.name ?? "체력"}</Tag>
                <Tag>{DIFFICULTY_KO[ex.difficulty] ?? ex.difficulty}</Tag>
                <Tag>약 {ex.recommendedMinutes}분</Tag>
              </div>
              <h2 className="mt-[var(--space-150)] text-[var(--font-size-400)] font-semibold">{ex.name}</h2>
              {r.mission ? (
                <p className="mt-[var(--space-50)] text-[var(--font-size-300)] font-semibold text-[var(--brand-ink)]">
                  오늘의 미션 · {r.mission}
                </p>
              ) : null}
              <div className="mt-[var(--space-100)]">
                <WhyButton reason={r.reasonKid} />
              </div>
              <BtnRow className="mt-[var(--space-200)]">
                <Link href={`/workout/${ex.id}`}>
                  <Button>운동 시작</Button>
                </Link>
              </BtnRow>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
