import { NextResponse } from "next/server";
import { askAgent, buildPrompt, feedbackEnabled } from "@/features/agent/directline";

/**
 * 일지 한 장을 도우미에게 보내고 답을 받아 온다.
 *
 * 토큰은 **여기(서버)에만** 있다. 학생 화면에는 나가지 않는다.
 * 도우미가 아직 연결되지 않았으면 503 으로 알린다 — 화면은 버튼을 감춘다.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 화면이 «도우미 버튼을 보여도 되는지» 묻는 곳 */
export async function GET() {
  return NextResponse.json({ enabled: feedbackEnabled() });
}

export async function POST(req: Request) {
  if (!feedbackEnabled()) {
    return NextResponse.json({ error: "도우미가 아직 연결되지 않았어요." }, { status: 503 });
  }

  let body: { date?: string; student?: string; mood?: string; text?: string; workouts?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청을 읽지 못했어요." }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "날짜가 올바르지 않아요." }, { status: 400 });
  }

  // 아이가 쓴 글이 길어도 도우미에게 통째로 넘기지 않는다 (요금·응답시간 모두 늘어난다)
  const text = (typeof body.text === "string" ? body.text : "").slice(0, 1200);
  const mood = typeof body.mood === "string" ? body.mood.slice(0, 20) : undefined;
  // 번호만 받는다. 이름이 들어와도 20자에서 자르고, 어차피 앱이 이름을 만들지 않는다.
  const student = typeof body.student === "string" ? body.student.slice(0, 20) : undefined;
  const workouts = Array.isArray(body.workouts)
    ? body.workouts.slice(0, 10).map((w) => {
        const o = w as { name?: unknown; count?: unknown; durationSec?: unknown };
        return {
          name: String(o.name ?? "").slice(0, 30),
          count: Number(o.count) || 0,
          durationSec: Number(o.durationSec) || 0,
        };
      })
    : [];

  if (!text.trim() && !workouts.length) {
    return NextResponse.json({ error: "일지를 먼저 써 주세요." }, { status: 400 });
  }

  try {
    const feedback = await askAgent(buildPrompt({ date, student, mood, text, workouts }));
    return NextResponse.json({ feedback });
  } catch (e) {
    // 에이전트 쪽 사정은 아이에게 그대로 보여주지 않는다 — 다시 해보라고만 알린다
    console.error("[journal-feedback]", e);
    return NextResponse.json({ error: "도우미가 지금 답하지 못했어요. 잠시 뒤 다시 해 주세요." }, { status: 502 });
  }
}
