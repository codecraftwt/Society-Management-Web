import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

const PUBLIC_PATHS = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/login", changefreq: "monthly", priority: "0.8" },
  { path: "/register", changefreq: "monthly", priority: "0.8" },
  { path: "/forgot-password", changefreq: "yearly", priority: "0.3" },
];

function seoSitemapPlugin(siteUrl) {
  const origin = String(siteUrl || "").replace(/\/$/, "");

  const loc = (routePath) => {
    if (!origin) return routePath;
    return routePath === "/" ? `${origin}/` : `${origin}${routePath}`;
  };

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PATHS.map(
  (p) => `  <url>
    <loc>${loc(p.path)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
).join("\n")}
</urlset>
`;

  const robotsTxt = `User-agent: *
Allow: /
Allow: /login
Allow: /register
Allow: /forgot-password

Disallow: /superadmin
Disallow: /admin
Disallow: /committee
Disallow: /resident
Disallow: /family
Disallow: /guard
Disallow: /accountant
Disallow: /registration-pending
Disallow: /reset-password

Sitemap: ${origin ? `${origin}/sitemap.xml` : "/sitemap.xml"}
`;

  return {
    name: "seo-sitemap",
    closeBundle() {
      const dist = path.resolve(process.cwd(), "dist");
      if (!fs.existsSync(dist)) return;
      fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemapXml);
      fs.writeFileSync(path.join(dist, "robots.txt"), robotsTxt);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), seoSitemapPlugin(env.VITE_SITE_URL)],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
