import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { envConfig, fetchAir, fetchOutdoor, fetchWeather, fetchWeatherKma, pm10GradeOf, pm25GradeOf } from "@/features/outdoor/outdoor";

/**
 * 이 앱이 직접 제공하는 MCP 서버.
 *
 * 공공데이터포털은 공식 MCP 서버가 없어서(개인 제작 로컬용뿐), 우리가 공공데이터
 * (에어코리아 미세먼지·기상청 실황)를 도구로 감싸 인터넷에 내놓는다.
 * Copilot Studio의 「바깥 수업 도우미」 에이전트가 이 주소를 MCP 도구로 물어 쓴다.
 *
 * 읽기 전용 공공 정보만 내놓으므로 인증 없이 연다. 학생·기록 데이터는 여기 없다.
 */

const RAIN_LABEL: Record<number, string> = {
  0: "없음", 1: "비", 2: "비/눈", 3: "눈", 5: "빗방울", 6: "빗방울·눈날림", 7: "눈날림",
};

function noKeyText() {
  return {
    content: [
      {
        type: "text" as const,
        text: "아직 인증키가 서버에 설정되지 않았어요 (기상청 API허브 KMA_AUTH_KEY 또는 공공데이터포털 OUTDOOR_API_KEY). 키를 설정하면 실시간 자료로 답합니다.",
      },
    ],
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "outdoor_class_check",
      {
        title: "바깥 수업 판단",
        description:
          "지금 실외 체육 수업을 해도 되는지 판단한다. 에어코리아 미세먼지와 기상청 실황을 함께 보고 «실외 좋아요/짧게/실내가 좋아요»와 근거를 돌려준다. 학교 고농도 미세먼지 대응 기준(나쁨 자제, 매우나쁨 실내 대체)을 따른다.",
        inputSchema: z.object({
          sido: z.string().optional().describe("시/도 이름 (예: 경기, 서울). 생략하면 학교 지역(경기)"),
        }),
      },
      async ({ sido }) => {
        const out = await fetchOutdoor(sido);
        if (!out) return noKeyText();
        const { air, weather, verdict: v } = out;
        const lines = [
          `판단: ${v.headline}`,
          ...v.reasons.map((r) => `- ${r}`),
          air ? `미세먼지: PM10 ${air.pm10 ?? "?"}㎍/㎥(${air.pm10Grade}) · PM2.5 ${air.pm25 ?? "?"}㎍/㎥(${air.pm25Grade}) — ${air.station} 측정소 ${air.dataTime}` : "미세먼지: 자료 없음",
          weather ? `날씨: 기온 ${weather.tempC ?? "?"}℃ · 강수형태 ${RAIN_LABEL[weather.rainType] ?? "?"} · 1시간 강수 ${weather.rainMm ?? 0}mm` : "날씨: 자료 없음",
          "출처: 공공데이터포털(한국환경공단 에어코리아, 기상청)",
        ];
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      },
    );

    server.registerTool(
      "air_quality",
      {
        title: "미세먼지 조회",
        description: "에어코리아 실시간 미세먼지(PM10·PM2.5)와 등급을 조회한다.",
        inputSchema: z.object({
          sido: z.string().optional().describe("시/도 이름 (예: 경기, 서울). 생략하면 경기"),
        }),
      },
      async ({ sido }) => {
        const cfg = envConfig();
        if (!cfg.key) return noKeyText();
        const air = await fetchAir(cfg.key, sido?.trim() || cfg.sido, cfg.station);
        if (!air) return { content: [{ type: "text" as const, text: "측정 자료를 가져오지 못했어요." }] };
        const text = `${air.station} 측정소 (${air.dataTime}) — PM10 ${air.pm10 ?? "?"}㎍/㎥(${pm10GradeOf(air.pm10)}), PM2.5 ${air.pm25 ?? "?"}㎍/㎥(${pm25GradeOf(air.pm25)}). 출처: 에어코리아.`;
        return { content: [{ type: "text" as const, text }] };
      },
    );

    server.registerTool(
      "weather_now",
      {
        title: "지금 날씨",
        description: "기상청 초단기실황으로 현재 기온·강수 상태를 조회한다.",
        inputSchema: z.object({}),
      },
      async () => {
        const cfg = envConfig();
        if (!cfg.key && !cfg.kmaKey) return noKeyText();
        const w = cfg.kmaKey ? await fetchWeatherKma(cfg.kmaKey, cfg.stn) : await fetchWeather(cfg.key!, cfg.nx, cfg.ny);
        if (!w) return { content: [{ type: "text" as const, text: "기상 자료를 가져오지 못했어요." }] };
        const text = `기온 ${w.tempC ?? "?"}℃ · 강수형태 ${RAIN_LABEL[w.rainType] ?? "?"} · 1시간 강수 ${w.rainMm ?? 0}mm. 출처: 기상청 초단기실황.`;
        return { content: [{ type: "text" as const, text }] };
      },
    );
  },
  {
    serverInfo: { name: "health-fitness-outdoor", version: "1.0.0" },
  },
);

export { handler as GET, handler as POST };
