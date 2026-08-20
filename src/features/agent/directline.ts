/**
 * Copilot Studio 에이전트와 **앱이 직접 주고받는** 길 (Direct Line).
 *
 * 지금까지 쓰던 iframe 임베드(link.ts)는 채팅창을 끼워 넣기만 해서 **앱이 답을 읽지 못한다.**
 * 일지에 도우미의 말을 남기려면 답을 받아와야 하므로 이 길이 따로 필요하다.
 *
 * 이 파일은 **서버에서만** 돈다. 토큰 주소가 학생 화면에 나가면 누구나 에이전트를 부를 수 있다.
 *
 * 준비물(환경변수) — **둘 중 하나만** 있으면 된다. 없으면 기능이 조용히 꺼지고 앱은 그대로 돈다.
 *   COPILOT_DIRECTLINE_SECRET      Copilot Studio → Agent settings → Safety & access
 *                                  → Web channel security → 비밀키
 *   COPILOT_DIRECTLINE_TOKEN_URL   (예전 방식) 채널 → 모바일 앱 → 토큰 엔드포인트
 *
 * 새로 나온 종류의 에이전트에는 «모바일 앱» 채널이 아직 없다. 대신 위의 비밀키가 있고,
 * 그 키로 **토큰을 대신 발급받아** 쓴다. 비밀키는 비밀번호와 같아서 서버 밖으로 나가면 안 된다 —
 * 그래서 토큰(수명이 짧고 이 대화에만 쓰이는 것)으로 바꿔서 쓴다.
 */

/** 기본은 공개 Direct Line. 시험이나 다른 지역 엔드포인트를 쓸 때만 환경변수로 바꾼다. */
const DL = process.env.COPILOT_DIRECTLINE_BASE ?? "https://directline.botframework.com/v3/directline";
const USER_ID = "student";

export function feedbackEnabled() {
  return Boolean(process.env.COPILOT_DIRECTLINE_SECRET || process.env.COPILOT_DIRECTLINE_TOKEN_URL);
}

async function getToken() {
  const secret = process.env.COPILOT_DIRECTLINE_SECRET;
  if (secret) {
    // 비밀키 → 토큰. 학생 쪽으로 나가는 것은 이 토큰뿐이고, 그나마 서버 안에서만 쓴다.
    const res = await fetch(`${DL}/tokens/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`토큰을 만들지 못했습니다 (${res.status})`);
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error("토큰이 비어 있습니다.");
    return data.token;
  }

  const url = process.env.COPILOT_DIRECTLINE_TOKEN_URL;
  if (!url) throw new Error("도우미가 연결되지 않았습니다.");
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(`토큰을 받지 못했습니다 (${res.status})`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("토큰이 비어 있습니다.");
  return data.token;
}

/**
 * 한 번 묻고 한 번 답을 받는다.
 *
 * Direct Line 은 «보내고 → 새 활동이 올 때까지 확인» 하는 구조라, 답이 올 때까지 몇 번 물어본다.
 * 교실에서 쓰는 것이라 **오래 기다리게 두지 않는다** — 정해진 시간 안에 못 받으면 실패로 알린다.
 */
export async function askAgent(text: string, { timeoutMs = 25_000 } = {}) {
  const token = await getToken();
  const auth = { Authorization: `Bearer ${token}` };

  const started = await fetch(`${DL}/conversations`, { method: "POST", headers: auth });
  if (!started.ok) throw new Error(`대화를 열지 못했습니다 (${started.status})`);
  const { conversationId } = (await started.json()) as { conversationId: string };

  const sent = await fetch(`${DL}/conversations/${conversationId}/activities`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "message", from: { id: USER_ID }, text }),
  });
  if (!sent.ok) throw new Error(`질문을 보내지 못했습니다 (${sent.status})`);

  const deadline = Date.now() + timeoutMs;
  let watermark = "";
  const replies: string[] = [];

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 900));
    const res = await fetch(
      `${DL}/conversations/${conversationId}/activities${watermark ? `?watermark=${watermark}` : ""}`,
      { headers: auth, cache: "no-store" },
    );
    if (!res.ok) continue;
    const data = (await res.json()) as {
      watermark?: string;
      activities?: { type: string; from?: { id?: string }; text?: string }[];
    };
    watermark = data.watermark ?? watermark;
    for (const a of data.activities ?? []) {
      if (a.type !== "message") continue;
      if (a.from?.id === USER_ID) continue;      // 내가 보낸 것은 답이 아니다
      if (a.text?.trim()) replies.push(a.text.trim());
    }
    // 에이전트는 인사말과 본답을 나눠 보내기도 한다. 한 번 받은 뒤 잠깐 더 기다렸다 묶는다.
    if (replies.length) {
      await new Promise((r) => setTimeout(r, 1200));
      const more = await fetch(`${DL}/conversations/${conversationId}/activities?watermark=${watermark}`, {
        headers: auth,
        cache: "no-store",
      });
      if (more.ok) {
        const d2 = (await more.json()) as { activities?: { type: string; from?: { id?: string }; text?: string }[] };
        for (const a of d2.activities ?? []) {
          if (a.type === "message" && a.from?.id !== USER_ID && a.text?.trim()) replies.push(a.text.trim());
        }
      }
      return replies.join("\n\n");
    }
  }
  throw new Error("도우미가 시간 안에 답하지 않았습니다.");
}

/**
 * 일지·운동·마음을 도우미가 읽을 한 덩어리로 만든다.
 *
 * **학생 번호를 함께 싣는다.** 도우미가 답을 SharePoint 에 기록할 때 «누구의 일지인가» 가
 * 있어야 하기 때문이다. 번호만 보낸다 — 이름은 앱이 애초에 받지 않는다.
 */
export function buildPrompt(input: {
  date: string;
  student?: string;
  mood?: string;
  text: string;
  workouts: { name: string; count: number; durationSec: number }[];
}) {
  const lines = [
    input.student ? `학생 번호: ${input.student}` : "학생 번호: (명단 없음)",
    `날짜: ${input.date}`,
    input.mood ? `오늘의 마음: ${input.mood}` : "오늘의 마음: 고르지 않음",
    input.workouts.length
      ? `오늘 한 운동: ${input.workouts.map((w) => `${w.name} ${w.count}회`).join(", ")}`
      : "오늘 한 운동: 없음",
    `일지: ${input.text || "(비어 있음)"}`,
  ];
  return lines.join("\n");
}
