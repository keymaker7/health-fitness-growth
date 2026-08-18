import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 32, height: 32 }, id: "small" },
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "medium" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "large" },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = String(await id);
  const px = iconId === "large" ? 512 : iconId === "medium" ? 192 : 32;
  const pad = Math.round(px * 0.18);
  const gap = Math.max(2, Math.round(px * 0.06));
  const bar = Math.max(5, Math.round(px * 0.14));
  const radius = Math.round(px * 0.22);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap,
          background: "#0f6cbd",
          borderRadius: radius,
          padding: pad,
        }}
      >
        <div style={{ width: bar, height: Math.round(px * 0.32), background: "white", borderRadius: 2 }} />
        <div style={{ width: bar, height: Math.round(px * 0.46), background: "white", borderRadius: 2 }} />
        <div style={{ width: bar, height: Math.round(px * 0.62), background: "white", borderRadius: 2 }} />
      </div>
    ),
    { width: px, height: px },
  );
}
