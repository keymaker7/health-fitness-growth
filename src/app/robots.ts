import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const sitemap = new URL("/sitemap.xml", getSiteUrl()).toString();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/settings", "/workout/"],
    },
    sitemap,
  };
}
