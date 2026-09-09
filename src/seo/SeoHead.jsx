import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  SITE_NAME,
  SITE_KEYWORDS,
  OG_IMAGE_PATH,
  getSiteUrl,
  resolveSeo,
  getOgLocale,
  buildJsonLd,
} from "./site";

function upsertMeta(attr, key, content) {
  if (content == null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(data) {
  const id = "seo-jsonld";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeo(pathname);
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}${pathname === "/" ? "/" : pathname}`;
    const image = `${siteUrl}${OG_IMAGE_PATH}`;
    const robots = seo.index ? "index, follow" : "noindex, nofollow";
    const locale = getOgLocale();

    document.title = seo.title;
    document.documentElement.lang = locale.html;

    upsertMeta("name", "description", seo.description);
    upsertMeta("name", "keywords", SITE_KEYWORDS);
    upsertMeta("name", "author", SITE_NAME);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "googlebot", robots);
    upsertMeta("name", "theme-color", "#0b1220");
    upsertMeta("name", "application-name", SITE_NAME);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", seo.title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:alt", SITE_NAME);
    upsertMeta("property", "og:locale", locale.og);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);
    upsertMeta("name", "twitter:image", image);

    upsertLink("canonical", canonical);
    upsertJsonLd(buildJsonLd(siteUrl));
  }, [pathname]);

  return null;
}
