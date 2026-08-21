"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Alert20Filled,
  Alert20Regular,
  ArrowBounce20Filled,
  ArrowBounce20Regular,
  ArrowRepeatAll20Filled,
  ArrowRepeatAll20Regular,
  BookOpen20Filled,
  BookOpen20Regular,
  Dumbbell20Filled,
  Dumbbell20Regular,
  PlugConnected20Filled,
  PlugConnected20Regular,
  Run20Filled,
  Run20Regular,
  CalendarLtr20Filled,
  CalendarLtr20Regular,
  ClipboardPulse20Filled,
  ClipboardPulse20Regular,
  DocumentOnePage20Filled,
  DocumentOnePage20Regular,
  Dismiss20Regular,
  Flowchart20Filled,
  Flowchart20Regular,
  Home20Filled,
  Home20Regular,
  Navigation20Regular,
  Organization20Filled,
  Organization20Regular,
  Person20Filled,
  Person20Regular,
  QuestionCircle20Filled,
  QuestionCircle20Regular,
  Search20Regular,
  Sparkle20Filled,
  Sparkle20Regular,
  Timer20Filled,
  Timer20Regular,
} from "@fluentui/react-icons";
import { cn } from "@/lib/utils";
import { useApp } from "@/features/dashboard/AppProvider";
import { activitySummary, WEEKLY_GOAL } from "@/lib/progress";
import { resolveSearchPath } from "@/lib/search";

type IconCmp = ComponentType<{ className?: string }>;

// tint: Microsoft 365 앱 아이콘 팔레트 — 메뉴마다 M365 런처처럼 다른 색을 준다 (keymaker님 레퍼런스, 2026-08-21)
const NAV: { href: string; label: string; Regular: IconCmp; Filled: IconCmp; aliases?: string[]; tint: string }[] = [
  { href: "/", label: "홈", Regular: Home20Regular, Filled: Home20Filled, tint: "#0f6cbd" },
  // «나의 기록» 을 홈 바로 밑에 둔다 — 아이가 매일 여는 곳이라 맨 위에 있어야 한다
  { href: "/journal", label: "나의 기록", Regular: CalendarLtr20Regular, Filled: CalendarLtr20Filled, aliases: ["/growth", "/my-fitness"], tint: "#107c41" },
  // 측정 4종은 탭 대신 개별 메뉴로 — /measure?tool= 링크라 isActive 는 안 켜진다(의도)
  // 제자리멀리뛰기·AI 줄넘기·스쿼트 게임은 메뉴에서 뺐다 (2026-08-21, keymaker님 검토 요청).
  { href: "/measure?tool=jump-rope", label: "줄넘기 카운터", Regular: ArrowRepeatAll20Regular, Filled: ArrowRepeatAll20Filled, tint: "#d83b01" },
  { href: "/measure?tool=squat-cam", label: "스쿼트", Regular: Dumbbell20Regular, Filled: Dumbbell20Filled, tint: "#036c70" },
  { href: "/measure?tool=long-jump", label: "제자리멀리뛰기 측정", Regular: ArrowBounce20Regular, Filled: ArrowBounce20Filled, tint: "#4f6bed" },
  { href: "/measure?tool=shuttle-run", label: "왕복오래달리기 측정", Regular: Run20Regular, Filled: Run20Filled, tint: "#c239b3" },
  // micro:bit 기기용 별도 사이트 2개(줄넘기 카운터·스쿼트 파이터) 링크 모음
  { href: "/microbit", label: "Microbit:연결", Regular: PlugConnected20Regular, Filled: PlugConnected20Filled, tint: "#5b5fc7" },
  // 건강체력·운동체력 이론은 /paps 아래쪽에 통합 — 단독 화면(/health-fitness·/sport-fitness)은 딥링크용으로 남아 있다
  { href: "/paps", label: "PAPS와 이론", Regular: BookOpen20Regular, Filled: BookOpen20Filled, aliases: ["/health-fitness", "/sport-fitness"], tint: "#185abd" },
  { href: "/prescription", label: "맞춤 운동처방", Regular: ClipboardPulse20Regular, Filled: ClipboardPulse20Filled, tint: "#13a10e" },
  { href: "/portfolio", label: "성장 포트폴리오", Regular: DocumentOnePage20Regular, Filled: DocumentOnePage20Filled, tint: "#8661c5" },
  // Reflect Brain Break 4종(명상·활동·게임·음악)으로 바로 가는 화면
  { href: "/brain-break", label: "Reflect-뇌의 휴식", Regular: Sparkle20Regular, Filled: Sparkle20Filled, tint: "#e3008c" },
  // 시연 핵심 화면이라 재배치 때 빠졌던 것을 keymaker님 «니 추천대로»로 복귀 (2026-08-21)
  { href: "/teacher", label: "교사용 도우미", Regular: Person20Regular, Filled: Person20Filled, tint: "#ca5010" },
  // 심사·참관용 — 사이트가 어떻게 짜였는지 그림 한 장씩으로 설명한다
  { href: "/system/composition", label: "시스템 구성도", Regular: Organization20Regular, Filled: Organization20Filled, tint: "#486991" },
  { href: "/system/architecture", label: "시스템 구조도", Regular: Flowchart20Regular, Filled: Flowchart20Filled, tint: "#038387" },
];

const BOTTOM = [
  { href: "/", label: "홈", Regular: Home20Regular, Filled: Home20Filled, tint: "#0f6cbd" },
  { href: "/journal", label: "기록", Regular: CalendarLtr20Regular, Filled: CalendarLtr20Filled, aliases: ["/growth"], tint: "#107c41" },
  { href: "/measure", label: "측정도구", Regular: Timer20Regular, Filled: Timer20Filled, tint: "#d83b01" },
  { href: "/paps", label: "PAPS", Regular: BookOpen20Regular, Filled: BookOpen20Filled, tint: "#185abd" },
  { href: "/prescription", label: "운동처방", Regular: ClipboardPulse20Regular, Filled: ClipboardPulse20Filled, tint: "#13a10e" },
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
  const { ready, user, sessions, roster, activeStudent, switchStudent } = useApp();
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
            <span className="flex shrink-0" style={{ color: item.tint }} aria-hidden>
              <Icon />
            </span>
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
          <Link href="/" className="flex min-w-0 items-center gap-[var(--space-100)]">
            <span className="copilot-dot inline-block" aria-hidden />
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
          <span className="copilot-dot inline-block lg:hidden" aria-hidden />
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
            <div className="card absolute top-full right-[var(--space-150)] z-40 mt-[var(--space-50)] max-h-[80vh] w-[min(18rem,calc(100vw-1.5rem))] overflow-auto bg-[var(--surface)] p-[var(--space-200)]">
              <p className="font-semibold">{ready ? user?.displayName : "학생"}</p>
              <p className="text-[var(--font-size-300)] text-[var(--muted)]">
                {ready ? `Lv.${summary.level} ${summary.title}` : ""}
              </p>
              <p className="text-[var(--font-size-300)] text-[var(--muted)]">{ready ? `${user?.grade}학년 ${user?.className}` : ""}</p>
              {roster.length ? (
                <div className="mt-[var(--space-150)]">
                  <p className="text-[var(--font-size-300)] font-semibold">누가 기록하나요?</p>
                  <div className="mt-[var(--space-100)] grid max-h-[46vh] grid-cols-3 gap-[var(--space-50)] overflow-auto">
                    {roster.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { void switchStudent(label); setPanel("none"); }}
                        aria-current={label === activeStudent ? "true" : undefined}
                        className={`rounded-[var(--radius-medium)] border px-[var(--space-100)] py-[var(--space-50)] text-[var(--font-size-300)] tabular-nums ${
                          label === activeStudent
                            ? "border-[var(--brand)] bg-[var(--brand-soft)] font-semibold"
                            : "border-[var(--line)] hover:border-[var(--line-strong)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">
                    고른 학생의 기록으로 화면이 바뀝니다. 측정·일지도 그 학생에게 저장됩니다.
                  </p>
                </div>
              ) : null}
              <Link href="/settings" className="mt-[var(--space-150)] inline-block text-[var(--font-size-300)] font-semibold text-[var(--brand)] hover:underline">
                {roster.length ? "명단 고치기" : "설정"}
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
                <span className="flex" style={{ color: item.tint }} aria-hidden>
                  <Icon />
                </span>
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
