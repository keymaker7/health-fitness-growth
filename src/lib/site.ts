export const SITE_NAME = "건강체력 성장일지";
export const SITE_SHORT_NAME = "성장일지";
export const SITE_TAGLINE = "측정하는 체육에서 성장하는 체육으로";
export const SITE_DESCRIPTION =
  "초등학생을 위한 건강체력 성장 웹앱. PAPS 종목을 이해하고, 나에게 맞는 운동을 하며, 기록과 마음은 이 기기에만 남깁니다.";
export const SITE_KEYWORDS = [
  "건강체력 성장일지",
  "PAPS",
  "학생건강체력평가",
  "초등 체육",
  "건강체력",
  "운동체력",
  "줄넘기",
  "스쿼트",
  "체력 성장",
  "초등 체력측정",
];

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return new URL(raw || "http://localhost:3000");
}

export const PUBLIC_PATHS = [
  "/",
  "/paps",
  "/health-fitness",
  "/sport-fitness",
  "/recommend",
  "/measure",
  "/journal",
  "/portfolio",
  "/growth",
  "/my-fitness",
  "/games",
  "/games/multi-jump",
  "/games/squat-race",
  "/games/jump-rope",
  "/brain-break",
] as const;
