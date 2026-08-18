export const REFLECT_OFFICIAL = {
  home: "https://reflect.microsoft.com/",
  newCheckIn: "https://reflect.new",
  app: "https://reflect.microsoft.com/app",
  support:
    "https://support.microsoft.com/en-us/education/learning-accelerators/get-started-with-microsoft-reflect",
  teamsHelp: "https://learn.microsoft.com/en-us/microsoftteams/reflect",
  classNotebook: "https://aka.ms/reflect/CNB",
  lti: "https://learn.microsoft.com/en-us/microsoft-365/lti/reflect-lti-moodle",
};

export type ReflectKind = "before" | "after" | "brainBreak";

export interface ReflectLinkAdapter {
  openOfficial(kind: ReflectKind, configuredUrl?: string): void;
  canEmbedGenericIframe: false;
  notes: string[];
}

function isAllowedReflectUrl(url: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      (u.hostname === "reflect.microsoft.com" ||
        u.hostname === "reflect.new" ||
        u.hostname.endsWith(".microsoft.com") ||
        u.hostname.endsWith(".office.com") ||
        u.hostname.endsWith(".cloud.microsoft"))
    );
  } catch {
    return false;
  }
}

export const officialReflectAdapter: ReflectLinkAdapter = {
  canEmbedGenericIframe: false,
  notes: [
    "Microsoft Reflect는 웹앱(https://reflect.microsoft.com), Teams, Class Notebook, Microsoft 365 LTI로 공식 제공됩니다.",
    "임의의 웹사이트에 Reflect를 iframe으로 넣는 방식은 공식 문서에서 지원하지 않습니다.",
    "교사가 Reflect에서 만든 체크인 공유 링크가 있으면 그 링크로 이동합니다.",
    "Brain Break는 Reflect 앱 안의 기능으로, 공식 홈/앱에서 실행합니다.",
  ],
  openOfficial(kind, configuredUrl) {
    if (configuredUrl && isAllowedReflectUrl(configuredUrl)) {
      window.open(configuredUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (kind === "brainBreak") {
      window.open(REFLECT_OFFICIAL.home, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(REFLECT_OFFICIAL.home, "_blank", "noopener,noreferrer");
  },
};

let current: ReflectLinkAdapter = officialReflectAdapter;

export function setReflectAdapter(adapter: ReflectLinkAdapter) {
  current = adapter;
}

export function getReflectAdapter() {
  return current;
}
