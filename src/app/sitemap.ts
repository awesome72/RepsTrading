import type { MetadataRoute } from "next";
import { SITE_URL, indexablePaths } from "@/lib/seo/pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths().map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
