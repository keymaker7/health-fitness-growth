import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont() {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff/Pretendard-SemiBold.woff",
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image() {
  const font = await loadFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#eef3f8",
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#0c5191",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#0f6cbd",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 3,
              padding: 8,
            }}
          >
            <div style={{ width: 6, height: 10, background: "white" }} />
            <div style={{ width: 6, height: 14, background: "white" }} />
            <div style={{ width: 6, height: 20, background: "white" }} />
          </div>
          초등 건강체력
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 600, color: "#242424", lineHeight: 1.15 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 32, color: "#0c5191", fontWeight: 600 }}>{SITE_TAGLINE}</div>
          <div style={{ fontSize: 24, color: "#616161" }}>PAPS 이해 · 맞춤 운동 · 성장 기록</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [
            {
              name: "Pretendard",
              data: font,
              style: "normal",
              weight: 600,
            },
          ]
        : [],
    },
  );
}
