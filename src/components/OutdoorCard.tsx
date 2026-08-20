"use client";

import { useEffect, useState } from "react";
import { Card, Tag } from "@/components/ui";
import type { OutdoorAir, OutdoorVerdict, OutdoorWeather } from "@/features/outdoor/outdoor";

type Payload = {
  enabled: boolean;
  sido?: string;
  air?: OutdoorAir | null;
  weather?: OutdoorWeather | null;
  verdict?: OutdoorVerdict;
};

/**
 * «오늘 바깥 수업» 카드 — 공공데이터포털(에어코리아·기상청) 실시간 값으로
 * 실외 수업 가능 여부를 알려준다. 서버에 인증키가 없으면 아무것도 그리지 않는다.
 */
export function OutdoorCard() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/outdoor")
      .then((r) => r.json())
      .then((d: Payload) => { if (alive) setData(d); })
      .catch(() => { if (alive) setData({ enabled: false }); });
    return () => { alive = false; };
  }, []);

  if (!data?.enabled || !data.verdict) return null;
  const { air, weather, verdict } = data;
  const tone = verdict.level === "ok" ? "success" : verdict.level === "care" ? "warning" : "danger";

  return (
    <Card className="mb-[var(--space-200)]">
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <Tag tone="brand">오늘 바깥 수업</Tag>
        <Tag tone={tone}>{verdict.headline}</Tag>
        {air ? <Tag>미세먼지 {air.pm10Grade}</Tag> : null}
        {air ? <Tag>초미세먼지 {air.pm25Grade}</Tag> : null}
        {weather && weather.tempC != null ? <Tag>{weather.tempC}℃</Tag> : null}
      </div>
      <ul className="mt-[var(--space-100)] list-disc pl-5 text-[var(--font-size-300)]">
        {verdict.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">
        {air ? `${air.station} 측정소 · ${air.dataTime}` : ""} — 공공데이터포털(에어코리아·기상청) 실시간 자료예요.
      </p>
    </Card>
  );
}
