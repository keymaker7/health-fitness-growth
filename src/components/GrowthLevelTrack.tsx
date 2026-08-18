import Link from "next/link";
import { GROWTH_RANKS, formatXpRange } from "@/lib/levels";
import { LevelMascot } from "@/components/LevelMascot";
import { Meter } from "@/components/ui";
import { cn } from "@/lib/utils";

type Props = {
  level: number;
  title: string;
  subtitle: string;
  xp: number;
  xpInto: number;
  xpSpan: number;
  xpToNext: number | null;
  progress: number;
  maxed: boolean;
  compact?: boolean;
};

export function GrowthLevelTrack({
  level,
  title,
  subtitle,
  xp,
  xpInto,
  xpSpan,
  xpToNext,
  progress,
  maxed,
  compact,
}: Props) {
  return (
    <section className="card p-[var(--space-200)]" aria-label="성장 레벨 시스템">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-100)]">
        <div>
          <p className="text-[var(--font-size-200)] font-semibold text-[var(--muted)]">성장 레벨 시스템</p>
          <h2 className="mt-[var(--space-50)] text-[var(--font-size-500)] font-semibold">
            Lv.{level} {title}
          </h2>
          <p className="mt-[2px] text-[var(--font-size-300)] text-[var(--muted)]">{subtitle}</p>
        </div>
        <p className="text-[var(--font-size-300)] font-semibold tabular-nums text-[var(--brand-ink)]">
          {xp.toLocaleString("ko-KR")} XP
        </p>
      </div>
      <div className="mt-[var(--space-150)]">
        <Meter
          label={maxed ? "최고 단계" : "다음 레벨"}
          hint={maxed ? "레전드이" : `${xpInto.toLocaleString("ko-KR")} / ${xpSpan.toLocaleString("ko-KR")} · 남은 ${xpToNext?.toLocaleString("ko-KR")} XP`}
          value={progress * 100}
        />
      </div>
      <ol className="level-track mt-[var(--space-200)]">
        {GROWTH_RANKS.map((rank) => {
          const state = rank.level < level ? "done" : rank.level === level ? "now" : "locked";
          return (
            <li key={rank.level}>
              <article
                className={cn("level-node", state === "now" && "is-now", state === "done" && "is-done", state === "locked" && "is-locked")}
                aria-current={state === "now" ? "step" : undefined}
              >
                <LevelMascot level={rank.level} className="level-mascot" />
                <p className="mt-[var(--space-50)] text-[10px] font-semibold text-[var(--muted)]">Lv.{rank.level}</p>
                <p className="text-[var(--font-size-200)] font-semibold break-keep">{rank.name}</p>
                {compact ? null : <p className="mt-[2px] hidden text-[11px] leading-snug text-[var(--muted)] break-keep sm:block">{rank.subtitle}</p>}
                <p className="mt-[2px] text-[10px] tabular-nums text-[var(--muted)]">{formatXpRange(rank)}</p>
              </article>
            </li>
          );
        })}
      </ol>
      {compact ? (
        <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
          운동을 기록할수록 이끼 들판과 레벨이 함께 자라요.{" "}
          <Link href="/growth" className="font-semibold text-[var(--brand)] hover:underline">
            성장 자세히 보기
          </Link>
        </p>
      ) : null}
    </section>
  );
}
