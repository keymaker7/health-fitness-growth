import { NextResponse } from "next/server";
import { envConfig, fetchAir, fetchWeather, judge } from "@/features/outdoor/outdoor";

export const dynamic = "force-dynamic";

/**
 * «오늘 바깥 수업» 데이터. 키가 없으면 {enabled:false} 만 답해 카드가 조용히 숨는다.
 * 공공데이터 호출은 fetch revalidate(10분)로 캐시돼 수업 시간에 여러 명이 열어도 부담이 없다.
 */
export async function GET() {
  const cfg = envConfig();
  if (!cfg.key) return NextResponse.json({ enabled: false });
  try {
    const [air, weather] = await Promise.all([
      fetchAir(cfg.key, cfg.sido, cfg.station),
      fetchWeather(cfg.key, cfg.nx, cfg.ny),
    ]);
    if (!air && !weather) return NextResponse.json({ enabled: false });
    return NextResponse.json({ enabled: true, sido: cfg.sido, air, weather, verdict: judge(air, weather) });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
