import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 10,
          background: "#0f6cbd",
          padding: 36,
        }}
      >
        <div style={{ width: 28, height: 56, background: "white", borderRadius: 4 }} />
        <div style={{ width: 28, height: 84, background: "white", borderRadius: 4 }} />
        <div style={{ width: 28, height: 112, background: "white", borderRadius: 4 }} />
      </div>
    ),
    size,
  );
}
