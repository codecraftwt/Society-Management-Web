import { useEffect, useState } from "react";

export function Spinner({ cls = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${cls}`} style={{ color: "var(--accent)" }} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export function amenityEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("pool") || n.includes("swim")) return "🏊";
  if (n.includes("gym") || n.includes("fitness")) return "🏋️";
  if (n.includes("hall") || n.includes("banquet")) return "🎉";
  if (n.includes("ground") || n.includes("court")) return "⚽";
  if (n.includes("library") || n.includes("reading")) return "📚";
  if (n.includes("yoga") || n.includes("meditation")) return "🧘";
  if (n.includes("park") || n.includes("garden")) return "🌿";
  if (n.includes("club")) return "🎱";
  return "✨";
}

export const PALETTES = [
  { iconBg: "rgba(160,90,255,0.15)", iconBorder: "rgba(160,90,255,0.28)", strip: "#a05aff", stripEnd: "#9e58ff", glow: "rgba(160,90,255,0.20)" },
  { iconBg: "rgba(75,203,235,0.15)", iconBorder: "rgba(75,203,235,0.28)", strip: "#4bcbeb", stripEnd: "#1bcfb4", glow: "rgba(75,203,235,0.20)" },
  { iconBg: "rgba(16,185,129,0.15)", iconBorder: "rgba(16,185,129,0.28)", strip: "#34d399", stripEnd: "#059669", glow: "rgba(16,185,129,0.20)" },
  { iconBg: "rgba(160,90,255,0.15)", iconBorder: "rgba(160,90,255,0.28)", strip: "#4BCBEB", stripEnd: "var(--accent)", glow: "rgba(160,90,255,0.20)" },
  { iconBg: "rgba(244,63,94,0.15)", iconBorder: "rgba(244,63,94,0.28)", strip: "#fb7185", stripEnd: "#be123c", glow: "rgba(244,63,94,0.20)" },
  { iconBg: "rgba(91,141,239,0.15)", iconBorder: "rgba(91,141,239,0.28)", strip: "#94B5F5", stripEnd: "#3E60A3", glow: "rgba(91,141,239,0.20)" },
];

export const isPaidAmenity = (a) => (a?.type || "").toUpperCase() === "PAID";

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}