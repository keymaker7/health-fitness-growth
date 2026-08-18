import type { MetadataRoute } from "next";
import { PAPS_EVENTS } from "@/lib/catalog";
import { getSiteUrl, PUBLIC_PATHS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().origin;
  const now = new Date();
  const pages: MetadataRoute.Sitemap = PUBLIC_PATHS.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/paps" ? 0.9 : 0.7,
  }));
  for (const event of PAPS_EVENTS) {
    pages.push({
      url: `${base}/paps/${event.id}`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }
  return pages;
}
