import "server-only";

/**
 * «오늘 바깥 수업» 판단 — 공공데이터포털(data.go.kr)의 두 API 를 읽는다.
 *   · 에어코리아 시도별 실시간 측정정보 (미세먼지 PM10·PM2.5)
 *   · 기상청 초단기실황 (기온·강수)
 *
 * 인증키는 서버 환경변수로만 들고(OUTDOOR_API_KEY), 없으면 기능이 조용히 꺼진다 —
 * 도우미 버튼과 같은 규칙이라 키가 없어도 앱은 안 깨진다.
 */

const AIR_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";
const WEATHER_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";

export type OutdoorAir = {
  station: string;
  dataTime: string;
  pm10: number | null;
  pm25: number | null;
  pm10Grade: string;
  pm25Grade: string;
};

export type OutdoorWeather = {
  tempC: number | null;
  rainMm: number | null;
  /** 0 없음 · 1 비 · 2 비/눈 · 3 눈 · 5 빗방울 · 6 빗방울눈날림 · 7 눈날림 */
  rainType: number;
};

export type OutdoorVerdict = {
  level: "ok" | "care" | "stop";
  headline: string;
  reasons: string[];
};

export function envConfig() {
  const key = process.env.OUTDOOR_API_KEY;
  return {
    key: key && key.trim() ? key.trim() : null,
    // keymaker님 학교가 경기라 기본값을 경기(격자는 수원)로 둔다. 환경변수로 바꿀 수 있다.
    sido: process.env.OUTDOOR_SIDO?.trim() || "경기",
    station: process.env.OUTDOOR_STATION?.trim() || null,
    nx: Number(process.env.OUTDOOR_NX) || 60,
    ny: Number(process.env.OUTDOOR_NY) || 121,
  };
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null; // 에어코리아는 결측을 "-" 로 준다
}

/** 에어코리아 등급 구간 (환경부 예보 기준) */
export function pm10GradeOf(v: number | null) {
  if (v === null) return "정보 없음";
  if (v <= 30) return "좋음";
  if (v <= 80) return "보통";
  if (v <= 150) return "나쁨";
  return "매우나쁨";
}
export function pm25GradeOf(v: number | null) {
  if (v === null) return "정보 없음";
  if (v <= 15) return "좋음";
  if (v <= 35) return "보통";
  if (v <= 75) return "나쁨";
  return "매우나쁨";
}

export async function fetchAir(key: string, sido: string, station: string | null): Promise<OutdoorAir | null> {
  const qs = new URLSearchParams({
    serviceKey: key,
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    sidoName: sido,
    ver: "1.0",
  });
  const res = await fetch(`${AIR_URL}?${qs}`, { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    response?: { body?: { items?: Array<Record<string, string>> } };
  } | null;
  const items = data?.response?.body?.items ?? [];
  if (!items.length) return null;
  // 지정한 측정소가 있으면 그것, 없으면 값이 온전한 첫 측정소를 쓴다
  const pick =
    (station && items.find((i) => i.stationName === station)) ||
    items.find((i) => num(i.pm10Value) !== null && num(i.pm25Value) !== null) ||
    items[0];
  const pm10 = num(pick.pm10Value);
  const pm25 = num(pick.pm25Value);
  return {
    station: pick.stationName ?? sido,
    dataTime: pick.dataTime ?? "",
    pm10,
    pm25,
    pm10Grade: pm10GradeOf(pm10),
    pm25Grade: pm25GradeOf(pm25),
  };
}

/** 초단기실황의 발표 시각 — 매시 정각 관측이 10분 뒤에 풀리므로 40분 여유를 두고 정각으로 내림 */
function baseDateTimeKst() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000 - 40 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  const h = String(kst.getUTCHours()).padStart(2, "0");
  return { base_date: `${y}${m}${d}`, base_time: `${h}00` };
}

export async function fetchWeather(key: string, nx: number, ny: number): Promise<OutdoorWeather | null> {
  const { base_date, base_time } = baseDateTimeKst();
  const qs = new URLSearchParams({
    serviceKey: key,
    dataType: "JSON",
    numOfRows: "10",
    pageNo: "1",
    base_date,
    base_time,
    nx: String(nx),
    ny: String(ny),
  });
  const res = await fetch(`${WEATHER_URL}?${qs}`, { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    response?: { body?: { items?: { item?: Array<{ category: string; obsrValue: string }> } } };
  } | null;
  const items = data?.response?.body?.items?.item ?? [];
  if (!items.length) return null;
  const of = (cat: string) => items.find((i) => i.category === cat)?.obsrValue;
  return {
    tempC: num(of("T1H")),
    rainMm: num(of("RN1")),
    rainType: num(of("PTY")) ?? 0,
  };
}

/**
 * 실외 수업 권고 — 학교 고농도 미세먼지 대응 기준을 따른다.
 * 매우나쁨(PM2.5>75 또는 PM10>150)이면 실내 대체, 나쁨이면 자제·단축.
 */
export function judge(air: OutdoorAir | null, weather: OutdoorWeather | null): OutdoorVerdict {
  const reasons: string[] = [];
  let level: OutdoorVerdict["level"] = "ok";

  if (air) {
    const veryBad = (air.pm25 !== null && air.pm25 > 75) || (air.pm10 !== null && air.pm10 > 150);
    const bad = (air.pm25 !== null && air.pm25 > 35) || (air.pm10 !== null && air.pm10 > 80);
    if (veryBad) {
      level = "stop";
      reasons.push("미세먼지 매우나쁨 — 실외 수업을 실내 활동으로 바꾸는 게 좋아요.");
    } else if (bad) {
      level = "care";
      reasons.push("미세먼지 나쁨 — 바깥 활동을 줄이고 격한 운동은 피해요.");
    }
  }
  if (weather) {
    if (weather.rainType > 0) {
      level = "stop";
      reasons.push("비나 눈이 와요 — 실내 수업이 안전해요.");
    } else if (weather.tempC !== null && weather.tempC >= 33) {
      if (level === "ok") level = "care";
      reasons.push("기온이 33℃ 이상이에요 — 그늘·수분을 챙기고 짧게 해요.");
    } else if (weather.tempC !== null && weather.tempC <= -12) {
      if (level === "ok") level = "care";
      reasons.push("한파예요 — 보온을 챙기고 실내 활동을 생각해요.");
    }
  }
  if (!reasons.length) reasons.push("미세먼지·날씨 모두 바깥 수업하기 좋아요.");

  const headline = level === "ok" ? "실외 수업 좋아요" : level === "care" ? "실외 수업은 짧게" : "오늘은 실내가 좋아요";
  return { level, headline, reasons };
}
