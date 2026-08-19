/**
 * Teams 에 게시한 「체육 수업 도우미」 주소.
 *
 * 이 값이 비어 있으면 앱에는 버튼이 아예 나오지 않는다.
 * 조직 승인이 늦어져 주소를 못 받는 상황에서도 화면이 깨지지 않게 하기 위함이다.
 * 주소를 받으면 아래 한 줄만 채우면 된다.
 */
export const AGENT_URL = "";

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

export function agentLink() {
  return AGENT_URL && isAllowedAgentUrl(AGENT_URL) ? AGENT_URL : null;
}
