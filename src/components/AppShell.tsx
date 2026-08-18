"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Alert20Filled,
  Alert20Regular,
  ArrowRepeatAll20Filled,
  ArrowRepeatAll20Regular,
  BookOpen20Filled,
  BookOpen20Regular,
  CalendarLtr20Filled,
  CalendarLtr20Regular,
  ClipboardPulse20Filled,
  ClipboardPulse20Regular,
  DocumentOnePage20Filled,
  DocumentOnePage20Regular,
  Dismiss20Regular,
  HeartPulse20Filled,
  HeartPulse20Regular,
  Home20Filled,
  Home20Regular,
  Navigation20Regular,
  Person20Filled,
  Person20Regular,
  PersonRunning20Filled,
  PersonRunning20Regular,
  QuestionCircle20Filled,
  QuestionCircle20Regular,
  Search20Regular,
  Sparkle20Filled,
  Sparkle20Regular,
  Sport20Filled,
  Sport20Regular,
  Timer20Filled,
  Timer20Regular,
} from "@fluentui/react-icons";
import { cn } from "@/lib/utils";
import { useApp } from "@/features/dashboard/AppProvider";
import { activitySummary, WEEKLY_GOAL } from "@/lib/progress";
import { resolveSearchPath } from "@/lib/search";

type IconCmp = ComponentType<{ className?: string }>;

const NAV: { href: string; label: string; Regular: IconCmp; Filled: IconCmp; aliases?: string[] }[] = [
  { href: "/", label: "홈", Regular: Home20Regular, Filled: Home20Filled },
  { href: "/paps", label: "PAPS", Regular: BookOpen20Regular, Filled: BookOpen20Filled },
  { href: "/health-fitness", label: "건강체력", Regular: HeartPulse20Regular, Filled: HeartPulse20Filled },
  { href: "/sport-fitness", label: "운동체력", Regular: Sport20Regular, Filled: Sport20Filled },
  { href: "/recommend", label: "추천 운동", Regular: Sparkle20Regular, Filled: Sparkle20Filled },
  { href: "/prescription", label: "맞춤 운동처방", Regular: ClipboardPulse20Regular, Filled: ClipboardPulse20Filled },
  { href: "/measure", label: "측정 도구", Regular: Timer20Regular, Filled: Timer20Filled },
  { href: "/games/multi-jump", label: "AI 줄넘기", Regular: ArrowRepeatAll20Regular, Filled: ArrowRepeatAll20Filled },
  { href: "/games/squat-race", label: "스쿼트 게임", Regular: PersonRunning20Regular, Filled: PersonRunning20Filled },
  { href: "/journal", label: "나의 기록", Regular: CalendarLtr20Regular, Filled: CalendarLtr20Filled, aliases: ["/growth", "/my-fitness"] },
  { href: "/portfolio", label: "성장 포트폴리오", Regular: DocumentOnePage20Regular, Filled: DocumentOnePage20Filled },
];

const BOTTOM = [
  { href: "/", label: "홈", Regular: Home20Regular, Filled: Home20Filled },
  { href: "/paps", label: "PAPS", Regular: BookOpen20Regular, Filled: BookOpen20Filled },
  { href: "/recommend", label: "추천", Regular: Sparkle20Regular, Filled: Sparkle20Filled },
  { href: "/games/multi-jump", label: "줄넘기", Regular: ArrowRepeatAll20Regular, Filled: ArrowRepeatAll20Filled },
  { href: "/journal", label: "기록", Regular: CalendarLtr20Regular, Filled: CalendarLtr20Filled, aliases: ["/growth"] },
];

function isActive(path: string, href: string, aliases?: string[]) {
  if (href === "/") return path === "/";
  if (path === href || path.startsWith(`${href}/`)) return true;
  return Boolean(aliases?.some((a) => path === a || path.startsWith(`${a}/`)));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"none" | "help" | "bell" | "user">("none");
  const headerRef = useRef<HTMLElement>(null);
  const { ready, user, sessions } = useApp();
  const summary = activitySummary(sessions);

  useEffect(() => {
    setOpen(false);
    setPanel("none");
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!headerRef.current?.contains(e.target as Node)) setPanel("none");
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(resolveSearchPath(query));
    setOpen(false);
  }

  const navLinks = (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-50)]">
      {NAV.map((item) => {
        const on = isActive(path, item.href, item.aliases);
        const Icon = on ? item.Filled : item.Regular;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-[var(--space-150)] rounded-[var(--radius-medium)] px-[var(--space-150)] py-[var(--space-100)] text-[var(--font-size-300)]",
              on ? "bg-[var(--brand-soft)] font-semibold text-[var(--brand-ink)]" : "text-[var(--ink)] hover:bg-[var(--colorNeutralBackground1Hover)]",
            )}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-dvh min-w-0 lg:grid lg:grid-cols-[var(--nav-w)_minmax(0,1fr)]">
      <aside className="glass-chrome print-hidden sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r lg:flex">
        <div className="flex h-[var(--header-h)] items-center px-[var(--space-200)]">
          <Link href="/" className="min-w-0">
            <p className="truncate text-[var(--font-size-300)] font-semibold">건강체력 성장일지</p>
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col px-[var(--space-100)] py-[var(--space-100)]">{navLinks}</nav>
        <div className="border-t border-[var(--line)] px-[var(--space-200)] py-[var(--space-150)]">
          <p className="truncate text-[var(--font-size-300)] font-semibold">
            {ready ? (user?.displayName ?? "학생") : "불러오는 중"}
          </p>
          <p className="truncate text-[var(--font-size-200)] text-[var(--muted)]">
            {ready ? `Lv.${summary.level} ${summary.title} · ${user?.grade ?? 5}학년 ${user?.className ?? ""}` : ""}
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col bg-transparent">
        <header
          ref={headerRef}
          className="glass-chrome print-hidden relative sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-[var(--space-100)] border-b px-[var(--space-150)] pt-[env(safe-area-inset-top)] lg:px-[var(--space-300)]"
        >
          <button className="icon-btn tap lg:hidden" onClick={() => setOpen(true)} aria-label="메뉴 열기">
            <Navigation20Regular />
          </button>
          <p className="min-w-0 truncate text-[var(--font-size-300)] font-semibold lg:hidden">건강체력 성장일지</p>
          <form onSubmit={submitSearch} className="mx-auto hidden min-w-0 max-w-xl flex-1 md:block">
            <label className="relative block">
              <Search20Regular className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="PAPS 종목 또는 체력 요인 검색"
                className="field field-icon"
                aria-label="검색"
              />
            </label>
          </form>
          <div className="ml-auto flex items-center gap-[var(--space-50)]">
            <button className="icon-btn tap md:hidden" onClick={() => router.push("/paps")} aria-label="검색">
              <Search20Regular />
            </button>
            <button className="icon-btn tap" aria-label="알림" aria-expanded={panel === "bell"} onClick={() => setPanel(panel === "bell" ? "none" : "bell")}>
              {panel === "bell" ? <Alert20Filled /> : <Alert20Regular />}
            </button>
            <button className="icon-btn tap" aria-label="도움말" aria-expanded={panel === "help"} onClick={() => setPanel(panel === "help" ? "none" : "help")}>
              {panel === "help" ? <QuestionCircle20Filled /> : <QuestionCircle20Regular />}
            </button>
            <button className="icon-btn tap" aria-label="사용자 프로필" aria-expanded={panel === "user"} onClick={() => setPanel(panel === "user" ? "none" : "user")}>
              {panel === "user" ? <Person20Filled /> : <Person20Regular />}
            </button>
            <span className="persona" aria-hidden>
              {(user?.displayName ?? "학")[0]}
            </span>
          </div>
          {panel === "bell" ? (
            <div className="card absolute top-full right-[var(--space-150)] z-40 mt-[var(--space-50)] w-[min(20rem,calc(100vw-1.5rem))] p-[var(--space-200)]">
              <p className="font-semibold">이번 주 목표</p>
              <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">
                운동 {summary.weekCount} / {WEEKLY_GOAL}회 · {summary.weekMinutes}분
              </p>
            </div>
          ) : null}
          {panel === "help" ? (
            <div className="card absolute top-full right-[var(--space-150)] z-40 mt-[var(--space-50)] w-[min(20rem,calc(100vw-1.5rem))] p-[var(--space-200)]">
              <p className="font-semibold">도움말</p>
              <ul className="mt-[var(--space-100)] space-y-[var(--space-100)] text-[var(--font-size-300)]">
                <li><Link href="/paps" className="font-semibold text-[var(--brand)] hover:underline">PAPS 안내</Link></li>
                <li><Link href="/games" className="font-semibold text-[var(--brand)] hover:underline">체력 게임</Link></li>
                <li><Link href="/portfolio" className="font-semibold text-[var(--brand)] hover:underline">성장 포트폴리오</Link></li>
                <li><Link href="/brain-break" className="font-semibold text-[var(--brand)] hover:underline">마음·몸 회복</Link></li>
              </ul>
            </div>
          ) : null}
          {panel === "user" ? (
            <div className="card absolute top-full right-[var(--space-150)] z-40 mt-[var(--space-50)] w-[min(18rem,calc(100vw-1.5rem))] p-[var(--space-200)]">
              <p className="font-semibold">{ready ? user?.displayName : "학생"}</p>
              <p className="text-[var(--font-size-300)] text-[var(--muted)]">
                {ready ? `Lv.${summary.level} ${summary.title}` : ""}
              </p>
              <p className="text-[var(--font-size-300)] text-[var(--muted)]">{ready ? `${user?.grade}학년 ${user?.className}` : ""}</p>
              <Link href="/settings" className="mt-[var(--space-150)] inline-block text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline">
                설정
              </Link>
            </div>
          ) : null}
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label="닫기" />
            <div className="glass-strong absolute inset-y-0 left-0 flex w-[min(84vw,20rem)] flex-col border-r pt-[max(0.5rem,env(safe-area-inset-top))]">
              <div className="flex h-[var(--header-h)] items-center justify-between px-[var(--space-150)]">
                <p className="font-semibold">메뉴</p>
                <button onClick={() => setOpen(false)} className="icon-btn tap" aria-label="메뉴 닫기">
                  <Dismiss20Regular />
                </button>
              </div>
              <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[var(--space-100)] pb-[var(--space-200)]">{navLinks}</nav>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full min-w-0 max-w-[1080px] flex-1 px-[var(--space-200)] py-[var(--space-300)] pb-[calc(var(--bottom-nav)+env(safe-area-inset-bottom))] sm:px-[var(--space-300)] lg:px-[var(--space-400)] lg:py-[var(--space-400)] lg:pb-[var(--space-500)] print:max-w-none print:px-0 print:py-0 print:pb-0">
          {children}
        </main>

        <nav className="glass-chrome print-hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t px-[var(--space-50)] pt-[var(--space-50)] pb-[max(0.3rem,env(safe-area-inset-bottom))] lg:hidden">
          {BOTTOM.map((item) => {
            const on = isActive(path, item.href, item.aliases);
            const Icon = on ? item.Filled : item.Regular;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-[2px] rounded-[var(--radius-medium)] py-[var(--space-50)] text-[11px]",
                  on ? "bg-[var(--brand-soft)] font-semibold text-[var(--brand-ink)]" : "text-[var(--muted)]",
                )}
              >
                <Icon />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
