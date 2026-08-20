/**
 * 일지 한 장을 **교사용 장부(SharePoint)** 에 남긴다.
 *
 * 왜 도우미에게 안 맡기고 앱이 직접 부르는가 —
 *
 * 1. **익명 대화에서는 도우미가 도구를 못 부른다.** 학생 화면은 로그인이 없는데
 *    (`Authentication = No authentication`), 그 상태에서는 에이전트가 붙여 둔
 *    Power Automate 도구를 호출하지 않는다. 스튜디오 테스트(로그인 상태)에서는
 *    같은 도구가 잘 불린다 — 그래서 «되는 줄 알았다가» 라이브에서 빈 장부가 된다.
 * 2. 설령 불린다 해도 **부를지 말지는 모델이 정한다.** 장부는 30명이면 30줄이
 *    빠짐없이 쌓여야 하므로 «대체로 부른다»로는 부족하다.
 *
 * 그래서 기록은 서버 코드가 확정적으로 한다. 흐름의 «HTTP 요청을 받을 때» 주소는
 * 그 자체가 열쇠(SAS 서명 포함)라서 **서버 밖으로 나가면 안 된다.**
 *
 * 환경변수가 없으면 조용히 꺼진다 — 장부가 없어도 아이는 답을 그대로 받는다.
 */

export function journalLogEnabled() {
  return Boolean(process.env.JOURNAL_LOG_FLOW_URL);
}

export interface JournalLogRow {
  student?: string;
  date: string;
  mood?: string;
  workout: string;
  journal: string;
  feedback: string;
}

/**
 * 장부에 한 줄 남긴다.
 *
 * **절대 예외를 밖으로 던지지 않는다.** 기록이 실패해도 아이에게는 도우미의 답이
 * 그대로 가야 한다 — 어젯밤 도구를 잘못 붙여 답 자체가 막혔던 적이 있어서,
 * 이 경로는 «실패해도 조용히» 로 못 박아 둔다.
 */
export async function logJournal(row: JournalLogRow, { timeoutMs = 8_000 } = {}) {
  const url = process.env.JOURNAL_LOG_FLOW_URL;
  if (!url) return { ok: false as const, skipped: true as const };

  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: control.signal,
      body: JSON.stringify({
        student: row.student ?? "",
        date: row.date,
        mood: row.mood ?? "",
        workout: row.workout,
        journal: row.journal,
        feedback: row.feedback,
      }),
    });
    if (!res.ok) {
      console.error("[journal-log] 흐름이 거절했습니다", res.status, (await res.text()).slice(0, 300));
      return { ok: false as const, skipped: false as const };
    }
    return { ok: true as const, skipped: false as const };
  } catch (e) {
    console.error("[journal-log]", e);
    return { ok: false as const, skipped: false as const };
  } finally {
    clearTimeout(timer);
  }
}
