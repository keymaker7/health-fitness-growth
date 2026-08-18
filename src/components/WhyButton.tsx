"use client";

import { useState } from "react";

export function WhyButton({ reason }: { reason: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="text-sm font-semibold text-[var(--brand)] hover:underline"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        왜 이 운동을 추천했나요?
      </button>
      {open ? (
        <p className="mt-[var(--space-100)] rounded-[var(--radius-small)] bg-[var(--brand-soft)] p-[var(--space-150)] text-[var(--font-size-300)] leading-[var(--line-400)] text-[var(--brand-ink)]">
          {reason}
        </p>
      ) : null}
    </div>
  );
}
