"use client";

import Link from "next/link";
import { Print20Regular } from "@fluentui/react-icons";
import { BtnRow, Button, Card, Meter, PageTitle, Stars, Stat, Tag } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import { buildPortfolio, portfolioToText } from "@/lib/portfolio";
import { formatDateKo, gradeToStars } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";

export default function PortfolioPage() {
  const { ready, user, profile, paps, sessions, achievements } = useApp();
  if (!ready || !user || !profile) return <p className="text-[var(--muted)]">불러오는 중...</p>;

  const p = buildPortfolio(user, profile, paps, sessions, achievements);
  const created = formatDateKo(p.generatedAt);

  function printPortfolio() {
    window.print();
  }

  function downloadText() {
    const blob = new Blob([portfolioToText(p)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.student.name}-건강체력-성장포트폴리오.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack-lg">
      <div className="print-hidden">
        <PageTitle
          kicker="성장 포트폴리오"
          title={`${p.student.name}의 건강체력 성장`}
          sub="일지 기록이 모이면 포트폴리오가 만들어져요. 인쇄하거나 파일로 저장해 선생님, 가족과 나눌 수 있어요."
        />
        <BtnRow className="mb-[var(--space-200)]">
          <Button onClick={printPortfolio}>
            <Print20Regular />
            인쇄 · PDF 저장
          </Button>
          <Button variant="ghost" onClick={downloadText}>
            글 파일로 저장
          </Button>
          <Link href="/journal">
            <Button variant="soft">나의 기록</Button>
          </Link>
        </BtnRow>
      </div>

      <article className="stack" id="portfolio">
        <Card>
          <p className="text-[var(--font-size-200)] font-semibold text-[var(--muted)]">{SITE_NAME}</p>
          <h1 className="mt-[var(--space-50)] text-[var(--font-size-600)] font-semibold">
            {p.student.grade}학년 {p.student.className} {p.student.name}
          </h1>
          <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">
            {p.period ? `기록 기간 ${p.period.from} ~ ${p.period.to}` : "아직 운동 기록이 없어요"} · 생성일 {created}
          </p>
          <p className="mt-[var(--space-200)] text-[var(--font-size-400)] font-semibold text-[var(--brand-ink)]">{p.headline}</p>
          <div className="mt-[var(--space-150)] space-y-[var(--space-100)] text-[var(--font-size-300)] leading-[var(--line-400)]">
            {p.story.map((s) => (
              <p key={s}>{s}</p>
            ))}
          </div>
        </Card>

        <div className="grid gap-[var(--space-200)] sm:grid-cols-2 xl:grid-cols-5">
          <Card>
            <Stat label="운동 횟수" value={`${p.stats.sessions}회`} />
          </Card>
          <Card>
            <Stat label="운동 시간" value={`${p.stats.minutes}분`} />
          </Card>
          <Card>
            <Stat label="연속 운동" value={`${p.stats.streak}일`} />
          </Card>
          <Card>
            <Stat label="성장 레벨" value={`Lv.${p.stats.level}`} hint={p.stats.levelName} />
          </Card>
          <Card>
            <Stat label="배지" value={`${p.stats.badges}개`} />
          </Card>
        </div>

        <Card>
          <h2 className="text-[var(--font-size-400)] font-semibold">건강체력</h2>
          <p className="mt-[var(--space-50)] text-[var(--font-size-200)] text-[var(--muted)]">학교 측정 결과를 별점으로 나타냅니다. 친구와 비교하지 않아요.</p>
          <div className="mt-[var(--space-200)] grid gap-[var(--space-200)] sm:grid-cols-2">
            {p.fitness
              .filter((f) => f.category === "health")
              .map((f) => (
                <Meter key={f.id} label={f.name} hint={`${f.stars}/5`} value={f.stars * 20} color={f.color} />
              ))}
          </div>
        </Card>

        {p.paps.length ? (
          <Card>
            <h2 className="text-[var(--font-size-400)] font-semibold">PAPS 측정 기록</h2>
            <table className="mt-[var(--space-150)] w-full text-left text-[var(--font-size-300)]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="py-[var(--space-100)] font-semibold">종목</th>
                  <th className="py-[var(--space-100)] font-semibold">기록</th>
                  <th className="py-[var(--space-100)] font-semibold">등급</th>
                </tr>
              </thead>
              <tbody>
                {p.paps.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-[var(--space-100)]">{r.name}</td>
                    <td className="py-[var(--space-100)] tabular-nums">
                      {r.value}
                      {r.unit}
                    </td>
                    <td className="py-[var(--space-100)]">
                      <Stars n={gradeToStars(r.grade as 1 | 2 | 3 | 4 | 5)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">모의 또는 학교에서 입력한 측정값입니다. 이 앱이 등급을 새로 매기지 않습니다.</p>
          </Card>
        ) : null}

        {p.exercises.length ? (
          <Card>
            <h2 className="text-[var(--font-size-400)] font-semibold">운동 성장</h2>
            <ul className="mt-[var(--space-150)]">
              {p.exercises.map((e) => (
                <li key={e.id} className="flex min-w-0 justify-between gap-[var(--space-150)] border-b border-[var(--line)] py-[var(--space-100)] last:border-0">
                  <div className="min-w-0">
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-[var(--font-size-200)] text-[var(--muted)]">
                      {e.sessions}번 · 최고 {e.best}회
                      {e.first !== e.last ? ` · ${e.first} → ${e.last}` : ""}
                    </p>
                  </div>
                  {e.growthPct != null ? (
                    <Tag tone={e.growthPct > 0 ? "success" : e.growthPct < 0 ? "warning" : "neutral"}>
                      {e.growthPct > 0 ? "+" : ""}
                      {e.growthPct}%
                    </Tag>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <p className="font-semibold">아직 운동 기록이 없어요</p>
            <p className="mt-[var(--space-100)] text-[var(--muted)]">추천 운동이나 줄넘기를 한 번 하면, 그 기록이 포트폴리오에 쌓여요.</p>
            <Link href="/recommend" className="mt-[var(--space-150)] inline-block font-semibold text-[var(--brand)] hover:underline">
              추천 운동 시작
            </Link>
          </Card>
        )}

        {p.reflections.length ? (
          <Card>
            <h2 className="text-[var(--font-size-400)] font-semibold">마음 기록</h2>
            <ul className="mt-[var(--space-150)] space-y-[var(--space-150)]">
              {p.reflections.map((r) => (
                <li key={`${r.date}-${r.exercise}-${r.note}`}>
                  <p className="text-[var(--font-size-200)] text-[var(--muted)]">
                    {r.date} · {r.exercise}
                    {r.before && r.after ? ` · ${r.before} → ${r.after}` : ""}
                  </p>
                  {r.note ? <p className="mt-[var(--space-50)]">“{r.note}”</p> : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {p.badges.length ? (
          <Card>
            <h2 className="text-[var(--font-size-400)] font-semibold">받은 배지</h2>
            <div className="mt-[var(--space-150)] grid grid-cols-2 gap-[var(--space-150)] sm:grid-cols-3">
              {p.badges.map((b) => (
                <div key={`${b.name}-${b.unlockedAt}`}>
                  <p className="text-[var(--font-size-500)]" aria-hidden>
                    {b.emoji}
                  </p>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-[var(--font-size-200)] text-[var(--muted)]">{b.description}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <h2 className="text-[var(--font-size-400)] font-semibold">다음에 키울 힘</h2>
          <p className="mt-[var(--space-100)] font-semibold text-[var(--brand-ink)]">{p.nextFocus.name}</p>
          <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">{p.nextFocus.reason}</p>
          <Link href={p.nextFocus.href} className="print-hidden mt-[var(--space-150)] inline-block font-semibold text-[var(--brand)] hover:underline">
            관련 운동 보기
          </Link>
        </Card>

        <p className="text-[var(--font-size-200)] text-[var(--muted)]">
          출처: 이 기기의 건강체력 성장일지 · 로컬 저장 · 생성 {created}
        </p>
      </article>
    </div>
  );
}
