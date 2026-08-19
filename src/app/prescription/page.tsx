"use client";

import Link from "next/link";
import { BtnRow, Button, Card, Meter, PageTitle, SectionTitle, Stat, Tag } from "@/components/ui";
import { StandardNote } from "@/components/StandardNote";
import { AskAgentButton } from "@/components/AskAgentButton";
import { useApp } from "@/features/dashboard/AppProvider";
import { DAILY_TARGET_MIN, buildPrescription } from "@/lib/prescription";

export default function PrescriptionPage() {
  const { ready, profile, sessions, user } = useApp();
  if (!ready || !profile || !user) return <p className="text-[var(--muted)]">불러오는 중...</p>;

  const p = buildPrescription(profile, sessions);
  const maxNeed = Math.max(1, ...p.loads.map((l) => Math.max(0, l.need)));

  return (
    <div className="stack">
      <div className="print-hidden">
        <PageTitle
          kicker="맞춤 운동처방"
          title={`${user.displayName}의 4주 계획`}
          sub="지난 4주 동안 실제로 한 운동 기록에서 만들어졌어요. 기록이 바뀌면 처방도 바뀝니다."
        />
        <StandardNote screen="prescription" />
      </div>

      <Card>
        <p className="text-[var(--font-size-400)] font-semibold text-[var(--brand-ink)]">{p.headline}</p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">
          기록 기간 {p.from} ~ {p.to} · 다시 살펴볼 날 {p.reviewOn}
        </p>
        {!p.hasEnoughData ? (
          <p className="mt-[var(--space-150)] text-[var(--font-size-300)] font-semibold text-[var(--status-warning)]">
            아직 기록이 적어서 임시 계획이에요.
          </p>
        ) : null}
        {p.rampNote ? (
          <p className="mt-[var(--space-100)] text-[var(--font-size-300)] font-semibold text-[var(--status-warning)]">
            {p.rampNote}
          </p>
        ) : null}
      </Card>

      <div className="print-hidden">
        <AskAgentButton
          title="왜 이 숫자인가요?"
          hint="주당 횟수와 목표가 왜 그렇게 정해졌는지 Teams 도우미에게 물어볼 수 있어요."
        />
      </div>

      <div className="grid gap-[var(--space-200)] sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Stat label="최근 4주 운동" value={`${p.dataPoints}회`} hint={`주 ${p.weeklyRate}회 · 주 ${p.weeklyMinutes}분`} />
        </Card>
        <Card>
          <Stat label="앱에 남긴 하루 평균" value={`${p.dailyMinutes}분`} hint="학교 체육과 바깥놀이는 여기에 빠져 있어요" />
          <div className="mt-[var(--space-150)]">
            <Meter
              label={`하루 ${DAILY_TARGET_MIN}분 권고`}
              hint={`${p.dailyMinutes}/${DAILY_TARGET_MIN}분`}
              value={Math.min(100, p.dailyTargetRatio)}
            />
          </div>
        </Card>
        <Card>
          <Stat label="연속 운동" value={`${p.streak}일`} hint={`이번 계획은 주 ${p.plannedWeeklyMinutes}분`} />
        </Card>
        <Card>
          <Stat label="이번 계획 강도" value={p.intensity} />
          <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">{p.intensityReason}</p>
        </Card>
      </div>

      <section>
        <SectionTitle>지금 가장 필요한 힘</SectionTitle>
        <Card>
          <div className="space-y-[var(--space-200)]">
            {p.loads.map((l) => (
              <Meter
                key={l.id}
                label={l.name}
                hint={`최근 ${l.minutes}분 · ${l.sessions}회 · 별 ${l.stars}/5`}
                value={(Math.max(0, l.need) / maxNeed) * 100}
                color={l.color}
              />
            ))}
          </div>
          <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
            막대가 길수록 지금 더 필요한 힘이에요. 측정 등급과 최근 4주 운동량을 함께 보고 정합니다.
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle>이렇게 해봐요</SectionTitle>
        <div className="stack">
          {p.items.map((item) => (
            <Card key={`${item.componentId}-${item.exerciseId}`}>
              <div className="flex flex-wrap gap-[var(--space-50)]">
                <Tag tone={item.kind === "성장" ? "brand" : "success"}>
                  {item.componentName} {item.kind}
                </Tag>
                <Tag>주 {item.timesPerWeek}회</Tag>
                <Tag>1회 {item.minutesPerSession}분</Tag>
                {item.nonConsecutive ? <Tag tone="warning">이틀 연속 금지</Tag> : null}
              </div>
              <h2 className="mt-[var(--space-150)] text-[var(--font-size-400)] font-semibold">{item.exerciseName}</h2>
              <p className="mt-[var(--space-50)] text-[var(--font-size-400)] font-semibold text-[var(--brand-ink)]">
                목표 {item.targetLabel}
              </p>
              <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{item.howMuch}</p>
              <p className="mt-[var(--space-100)] text-[var(--font-size-300)]">{item.progression}</p>
              <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">내 기록 · {item.basis}</p>
              <p className="text-[var(--font-size-200)] text-[var(--muted)]">지침 · {item.source}</p>
              <BtnRow className="mt-[var(--space-200)] print-hidden">
                <Link href={`/workout/${item.exerciseId}`}>
                  <Button>운동 시작</Button>
                </Link>
                <Link href={`/health-fitness/${item.componentId}`}>
                  <Button variant="ghost">이 힘 알아보기</Button>
                </Link>
              </BtnRow>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <p className="font-semibold">안전하게</p>
        <ul className="mt-[var(--space-100)] list-disc space-y-[var(--space-50)] pl-5 text-[var(--font-size-300)] text-[var(--muted)]">
          {p.cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      <BtnRow className="print-hidden">
        <Button onClick={() => window.print()}>인쇄 · PDF 저장</Button>
        <Link href="/journal">
          <Button variant="soft">나의 기록</Button>
        </Link>
      </BtnRow>

      <Card>
        <p className="font-semibold">무엇을 근거로 정했나요</p>
        <ul className="mt-[var(--space-100)] list-disc space-y-[var(--space-50)] pl-5 text-[var(--font-size-200)] text-[var(--muted)]">
          <li>WHO·질병관리청 — 5~17세는 하루 평균 60분 이상 활동, 주 3일 이상 숨찬 유산소와 근력·뼈 강화</li>
          <li>미국소아과학회·캐나다운동생리학회 — 아동 근력 운동은 주 2~3회 비연속일, 8~15회 1~2세트, 바른 자세로 해내면 5~10%씩 점증</li>
          <li>ACSM — 유연성은 주 2~3일 이상, 정적 스트레칭 10~30초를 2~4번 반복해 부위당 60초</li>
          <li>교육부 PAPS 운영 매뉴얼 — 평가 결과에 따라 종목별 목표와 활동 횟수를 처방으로 등록</li>
        </ul>
        <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
          한 주 총량은 최근 실제 운동량의 110%를 넘지 않게 자동으로 줄입니다. 갑자기 늘려 다치는 일을 막기 위해서예요.
        </p>
      </Card>

      <p className="text-[var(--font-size-200)] text-[var(--muted)]">
        이 처방은 이 기기에 저장된 나의 기록만 사용합니다. 친구와 비교하지 않고, 의학적 진단이 아닙니다.
        PAPS 재측정은 학교 일정(보통 4월·7월·10월)을 따르고, 이 계획은 4주마다 다시 계산합니다.
      </p>
    </div>
  );
}
