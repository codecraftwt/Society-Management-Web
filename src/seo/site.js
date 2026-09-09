export const SITE_NAME = "Society Management System";
export const SITE_TAGLINE = "Residential Community Management Platform";
export const SITE_DESCRIPTION =
  "A complete digital platform for managing residents, maintenance, visitors, security, communication and everyday society operations.";
export const SITE_KEYWORDS = [
  "society management system",
  "housing society software",
  "residential community management",
  "apartment management software",
  "visitor management",
  "maintenance billing",
  "gate security",
  "housing society India",
].join(", ");

export const OG_IMAGE_PATH = "/og-image.png";

const PRIVATE_PREFIXES = [
  "/superadmin",
  "/admin",
  "/committee",
  "/resident",
  "/family",
  "/guard",
  "/accountant",
  "/registration-pending",
  "/reset-password",
];

const PUBLIC_PAGES = {
  "/": {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    index: true,
  },
  "/login": {
    title: `Login | ${SITE_NAME}`,
    description: "Sign in to manage your housing society — residents, billing, visitors, security, and more.",
    index: true,
  },
  "/register": {
    title: `Create Account | ${SITE_NAME}`,
    description: "Register for Society Management System and start managing your residential community online.",
    index: true,
  },
  "/forgot-password": {
    title: `Forgot Password | ${SITE_NAME}`,
    description: "Reset your Society Management System password and regain access to your society portal.",
    index: true,
  },
};

export function getSiteUrl() {
  const fromEnv = import.meta.env.VITE_SITE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function resolveSeo(pathname) {
  const exact = PUBLIC_PAGES[pathname];
  if (exact) return exact;

  const isPrivate = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    index: !isPrivate,
  };
}

export function getOgLocale() {
  try {
    const lang = localStorage.getItem("app_lang_home") || "en";
    if (lang === "hi") return { html: "hi", og: "hi_IN" };
    if (lang === "mr") return { html: "mr", og: "mr_IN" };
  } catch {
    /* ignore */
  }
  return { html: "en", og: "en_IN" };
}

export function buildJsonLd(siteUrl) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: siteUrl || undefined,
        logo: siteUrl ? `${siteUrl}/favicon.svg` : "/favicon.svg",
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl || undefined,
        description: SITE_DESCRIPTION,
        inLanguage: ["en", "hi", "mr"],
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
      },
    ],
  };
}
