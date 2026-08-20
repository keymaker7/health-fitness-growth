import type { ReactNode } from "react";

/**
 * 안내 문장의 중요 대목을 자동으로 강조한다 — 아이들이 안내를 훑어도 핵심이 잡히게.
 *   · «...» 로 감싼 버튼·화면 이름  →  굵게 + 브랜드 색
 *   · 숫자+단위 (3초, 15m, 1~4명, 1회 …)  →  굵게
 * 문자열 데이터(사용 방법, PAPS 안내)에만 쓴다. 문장은 그대로 두고 칠만 한다.
 */

const NUM_UNIT = /(\d+(?:[.,]\d+)?(?:\s*[~×]\s*\d+(?:[.,]\d+)?)?\s*(?:회|cm|m|mm|분|초|℃|단계|레인|명|번|개|점|kg|일|주))/g;

function emphNumbers(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(NUM_UNIT)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <b key={`${keyBase}-n${i++}`} className="font-semibold">
        {m[0]}
      </b>,
    );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Emph({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /«([^»]+)»/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push(...emphNumbers(text.slice(last, at), `p${i}`));
    out.push(
      <b key={`g${i++}`} className="font-semibold text-[var(--brand-ink)]">
        «{m[1]}»
      </b>,
    );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(...emphNumbers(text.slice(last), `t${i}`));
  return <>{out}</>;
}
