import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#0f6cbd",
    lang: "ko",
    categories: ["education", "health", "fitness"],
    icons: [
      { src: "/icon/small", sizes: "32x32", type: "image/png" },
      { src: "/icon/medium", sizes: "192x192", type: "image/png" },
      { src: "/icon/large", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
