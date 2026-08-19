/**
 * Copilot Studio 에 만든 「체육 수업 도우미」.
 *
 * Microsoft 가 Web app 채널에서 내주는 임베드 주소를 그대로 쓴다.
 * (에이전트 화면 → Publish 옆 ⌄ → Web app → Embed code 의 iframe src)
 *
 * 비어 있으면 화면에 아무것도 그리지 않는다. 주소를 못 받는 상황에서도
 * 앱이 깨지지 않게 하기 위함이다.
 */
export const AGENT_EMBED_URL =
  "https://copilotstudio.microsoft.com/environments/9324e73a-cd4e-e049-b7ba-177af6165e9c/bots/crbf2_bot_OW7xEv/webchat?__version__=2&enableFileAttachment=false&cliAgent=true";

/** 학교 계정 안에서만 열리는 주소만 받는다 (Reflect 링크와 같은 원칙) */
export function isAllowedAgentUrl(url: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname.endsWith(".microsoft.com") ||
        u.hostname.endsWith(".office.com") ||
        u.hostname.endsWith(".cloud.microsoft") ||
        u.hostname === "teams.microsoft.com")
    );
  } catch {
    return false;
  }
}

export function agentEmbed() {
  return AGENT_EMBED_URL && isAllowedAgentUrl(AGENT_EMBED_URL) ? AGENT_EMBED_URL : null;
}
