import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/account", "/bag", "/checkout"],
    },
    sitemap: "https://www.wonslinen.vn/sitemap.xml",
    host: "https://www.wonslinen.vn",
  };
}
