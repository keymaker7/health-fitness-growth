"use client";

import { useEffect, useRef, useState } from "react";
import { BtnRow, Button, Card, PageTitle, Tag } from "@/components/ui";

/**
 * «교사용 도우미» — 체육 수업 도우미(부모 에이전트)에게 웹앱 안에서 바로 묻는 화면.
 *
 * Teams 없이도 시연 동선(야외 수업 판단 → K-Weather 라우팅, 등급 질문 → 거절)을
 * 이 화면 하나로 보여줄 수 있다. 서버(/api/teacher-agent)가 대화 토큰만 만들어 주고,
 * 브라우저가 Direct Line 과 직접 주고받는다 — K-Weather 체인이 1분 넘게 걸려도 끊기지 않는다.
 */

type Msg = { who: "me" | "agent"; text: string };

const EXAMPLES = ["오늘 야외 수업 해도 돼?", "6-2-07이 32회인데 몇 등급인가요?"];

function nextWatermarkUrl(base: string, conv: string, watermark: string) {
  return `${base}/conversations/${conv}/activities${watermark ? `?watermark=${watermark}` : ""}`;
}

export default function TeacherAgentPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const connRef = useRef<{ base: string; token: string; conv: string; watermark: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/teacher-agent")
      .then((r) => r.json())
      .then((d: { enabled: boolean }) => { if (alive) setEnabled(d.enabled); })
      .catch(() => { if (alive) setEnabled(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [busy]);

  async function ensureConversation() {
    if (connRef.current) return connRef.current;
    const res = await fetch("/api/teacher-agent", { method: "POST" });
    if (!res.ok) throw new Error("도우미가 아직 연결되지 않았어요.");
    const { token, base } = (await res.json()) as { token: string; base: string };
    const started = await fetch(`${base}/conversations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!started.ok) throw new Error("대화를 열지 못했어요.");
    const { conversationId } = (await started.json()) as { conversationId: string };
    connRef.current = { base, token, conv: conversationId, watermark: "" };
    return connRef.current;
  }

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setElapsed(0);
    setInput("");
    setMessages((m) => [...m, { who: "me", text }]);
    try {
      const c = await ensureConversation();
      const auth = { Authorization: `Bearer ${c.token}` };
      const sent = await fetch(`${c.base}/conversations/${c.conv}/activities`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "message", from: { id: "teacher" }, text }),
      });
      if (!sent.ok) throw new Error("질문을 보내지 못했어요.");

      // 에이전트끼리 협업(K-Weather 라우팅)하면 1분 넘게 걸릴 수 있다 — 최대 2분 30초 기다린다.
      const deadline = Date.now() + 150_000;
      const got: string[] = [];
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1200));
        const res = await fetch(nextWatermarkUrl(c.base, c.conv, c.watermark), { headers: auth, cache: "no-store" });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          watermark?: string;
          activities?: Array<{ type: string; text?: string; from?: { id?: string } }>;
        };
        if (data.watermark) c.watermark = data.watermark;
        for (const a of data.activities ?? []) {
          if (a.type === "message" && a.text && a.from?.id !== "teacher") got.push(a.text);
        }
        if (got.length) break;
      }
      if (got.length) {
        setMessages((m) => [...m, ...got.map((t): Msg => ({ who: "agent", text: t }))]);
      } else {
        setMessages((m) => [...m, { who: "agent", text: "답이 늦어지고 있어요. 잠시 뒤 같은 질문을 다시 보내 주세요." }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { who: "agent", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <PageTitle
        kicker="교사용 도우미"
        title="체육 수업 도우미에게 바로 묻기"
        sub="Teams 없이 웹앱 안에서 묻습니다. 날씨·실외 수업 질문은 K-Weather 에이전트로, 측정·처방 질문은 각 담당 에이전트로 라우팅됩니다."
      />

      {enabled === false ? (
        <Card>
          <Tag tone="warning">연결 준비 중</Tag>
          <p className="mt-[var(--space-150)] text-[var(--font-size-300)] text-[var(--muted)]">
            체육 수업 도우미의 Direct Line 비밀키가 아직 서버에 설정되지 않았어요. 키를 넣으면 이 화면이 살아납니다.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-[var(--space-50)]">
            <Tag tone="brand">체육 수업 도우미</Tag>
            <Tag>측정 안내 · 처방 해설 · K-Weather 라우팅</Tag>
          </div>

          <div className="mt-[var(--space-200)] space-y-[var(--space-100)]">
            {messages.length === 0 ? (
              <p className="text-[var(--font-size-300)] text-[var(--muted)]">
                아래 예시를 누르거나 직접 물어보세요. 개별 학생의 등급 판정은 도우미가 정중히 거절합니다 — 그게 이 수업의 원칙이에요.
              </p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.who === "me"
                    ? "ml-auto max-w-[85%] rounded-[var(--radius-medium)] bg-[var(--brand-soft)] px-[var(--space-150)] py-[var(--space-100)] text-[var(--font-size-300)]"
                    : "max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-medium)] border border-[var(--line)] px-[var(--space-150)] py-[var(--space-100)] text-[var(--font-size-300)]"
                }
              >
                {m.text}
              </div>
            ))}
            {busy ? (
              <p className="text-[var(--font-size-200)] text-[var(--muted)]">
                에이전트들이 협업 중이에요… {elapsed}초 (날씨 질문은 1분 넘게 걸릴 수 있어요)
              </p>
            ) : null}
          </div>

          <BtnRow className="mt-[var(--space-200)]">
            {EXAMPLES.map((q) => (
              <Button key={q} variant="soft" disabled={busy} onClick={() => void ask(q)}>
                {q}
              </Button>
            ))}
          </BtnRow>

          <form
            className="mt-[var(--space-150)] flex gap-[var(--space-100)]"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <input
              className="field flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 왕복오래달리기 측정 순서 알려줘"
              disabled={busy}
            />
            <Button disabled={busy || !input.trim()}>묻기</Button>
          </form>

          <p className="mt-[var(--space-150)] text-[var(--font-size-200)] text-[var(--muted)]">
            질문은 학번 외 개인정보 없이 처리되고, 대화는 앱에 저장되지 않아요.
          </p>
        </Card>
      )}
    </div>
  );
}
