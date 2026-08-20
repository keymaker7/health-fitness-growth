import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * «교사용 도우미» 화면의 연결 창구.
 *
 * 체육 수업 도우미(부모 에이전트)는 K-Weather 연결 때문에 답이 1분을 넘길 수 있어서,
 * 서버가 답을 기다리는 방식(일지 도우미의 askAgent)은 함수 시간제한에 걸린다.
 * 그래서 서버는 **대화용 토큰만 만들어 주고**, 브라우저가 Direct Line 과 직접 주고받는다.
 * 비밀키(TEACHER_DIRECTLINE_SECRET)는 서버에만 있고, 밖으로 나가는 것은
 * 그 대화에만 쓰이는 짧은 수명의 토큰뿐이다 — 공식 웹챗과 같은 방식이다.
 */

const DL = process.env.COPILOT_DIRECTLINE_BASE ?? "https://directline.botframework.com/v3/directline";

function secret() {
  const s = process.env.TEACHER_DIRECTLINE_SECRET;
  return s && s.trim() ? s.trim() : null;
}

export async function GET() {
  return NextResponse.json({ enabled: Boolean(secret()) });
}

export async function POST() {
  const s = secret();
  if (!s) return NextResponse.json({ enabled: false }, { status: 503 });
  try {
    const res = await fetch(`${DL}/tokens/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: `토큰을 만들지 못했습니다 (${res.status})` }, { status: 502 });
    const data = (await res.json()) as { token?: string };
    if (!data.token) return NextResponse.json({ error: "토큰이 비어 있습니다." }, { status: 502 });
    return NextResponse.json({ token: data.token, base: DL });
  } catch {
    return NextResponse.json({ error: "연결에 실패했습니다." }, { status: 502 });
  }
}
