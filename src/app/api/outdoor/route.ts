import { NextResponse } from "next/server";
import { envConfig, fetchOutdoor } from "@/features/outdoor/outdoor";

export const dynamic = "force-dynamic";

/**
 * «오늘 바깥 수업» 데이터. 키가 하나도 없으면 {enabled:false} 만 답해 카드가 조용히 숨는다.
 * 날씨는 기상청 API허브 키(KMA_AUTH_KEY), 미세먼지는 공공데이터포털 키(OUTDOOR_API_KEY) —
 * 둘 중 있는 것만으로도 동작한다. 공공데이터 호출은 10분 캐시라 반 전체가 열어도 부담이 없다.
 */
export async function GET() {
  try {
    const out = await fetchOutdoor();
    if (!out) return NextResponse.json({ enabled: false });
    const cfg = envConfig();
    return NextResponse.json({ enabled: true, sido: cfg.sido, ...out });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
