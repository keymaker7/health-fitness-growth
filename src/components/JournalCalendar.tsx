"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import { dayKey, dayOf, labelKo, monthGrid, WEEKDAY_KO } from "@/lib/day";

/**
 * 한 달 달력. 날짜마다 **무엇이 남았는지를 점으로** 보여준다.
 *
 *   ● 운동   ● 일지   ● 마음
 *
 * 숫자를 적지 않고 점만 찍는 이유: 달력에서 필요한 것은 «얼마나» 가 아니라
 * «했는가 / 비었는가» 다. 아이가 자기 달을 보고 «빈 칸이 며칠이네» 를 알아채는 게 목적이다.
 */
export function JournalCalendar({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (date: string) => void;
}) {
  const { sessions, entries } = useApp();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = value.split("-").map(Number);
    return { year: y, month0: (m ?? 1) - 1 };
  });

  const marks = useMemo(() => {
    const m = new Map<string, { workout: boolean; text: boolean; mood: boolean }>();
    const put = (k: string, patch: Partial<{ workout: boolean; text: boolean; mood: boolean }>) => {
      m.set(k, { workout: false, text: false, mood: false, ...m.get(k), ...patch });
    };
    for (const s of sessions) put(dayOf(s.startTime), { workout: true });
    for (const e of entries) {
      if (e.text.trim()) put(e.date, { text: true });
      if (e.mood) put(e.date, { mood: true });
    }
    return m;
  }, [sessions, entries]);

  const grid = monthGrid(cursor.year, cursor.month0);
  const today = dayKey();
  const move = (delta: number) => {
    const d = new Date(cursor.year, cursor.month0 + delta, 1);
    setCursor({ year: d.getFullYear(), month0: d.getMonth() });
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-[var(--space-100)]">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="지난 달"
          className="rounded-[var(--radius-medium)] px-[var(--space-150)] py-[var(--space-100)] hover:bg-[var(--brand-soft)]"
        >
          ‹
        </button>
        <p className="text-[var(--font-size-400)] font-semibold">
          {cursor.year}년 {cursor.month0 + 1}월
        </p>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="다음 달"
          className="rounded-[var(--radius-medium)] px-[var(--space-150)] py-[var(--space-100)] hover:bg-[var(--brand-soft)]"
        >
          ›
        </button>
      </div>

      <div className="mt-[var(--space-150)] grid grid-cols-7 gap-[var(--space-50)]">
        {WEEKDAY_KO.map((w) => (
          <div key={w} className="py-[var(--space-50)] text-center text-[var(--font-size-300)] text-[var(--muted)]">
            {w}
          </div>
        ))}
        {grid.map(({ key, date, inMonth }) => {
          const mk = marks.get(key);
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={`${labelKo(key)}${mk ? " 기록 있음" : ""}`}
              aria-current={selected ? "date" : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-start rounded-[var(--radius-medium)] py-[var(--space-100)] transition ${
                selected
                  ? "bg-[var(--brand)] text-white"
                  : inMonth
                    ? "hover:bg-[var(--brand-soft)]"
                    : "opacity-35"
              }`}
            >
              <span
                className={`text-[var(--font-size-300)] tabular-nums ${
                  key === today && !selected ? "font-bold text-[var(--brand)]" : ""
                }`}
              >
                {date.getDate()}
              </span>
              <span className="mt-[var(--space-50)] flex gap-[3px]" aria-hidden>
                {mk?.workout ? <Dot on={selected} color="var(--brand)" /> : null}
                {mk?.text ? <Dot on={selected} color="var(--accent, #f59e0b)" /> : null}
                {mk?.mood ? <Dot on={selected} color="var(--p2, #7cc4ff)" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-[var(--space-150)] flex flex-wrap gap-[var(--space-200)] text-[var(--font-size-300)] text-[var(--muted)]">
        <li className="flex items-center gap-[var(--space-50)]"><Dot color="var(--brand)" /> 운동</li>
        <li className="flex items-center gap-[var(--space-50)]"><Dot color="var(--accent, #f59e0b)" /> 일지</li>
        <li className="flex items-center gap-[var(--space-50)]"><Dot color="var(--p2, #7cc4ff)" /> 마음</li>
      </ul>
    </Card>
  );
}

function Dot({ color, on = false }: { color: string; on?: boolean }) {
  return (
    <span
      className="inline-block h-[6px] w-[6px] rounded-full"
      style={{ background: on ? "#fff" : color }}
    />
  );
}
