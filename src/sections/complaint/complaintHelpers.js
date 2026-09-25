import { useEffect, useState } from "react";

export function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

export const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

export const toDateBoundary = (value, endOfDay = false) => {
  if (!value) return "";
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

/* The API join structure can vary. The complaint row may have:
     c.Flat               → direct association on the complaint (flat_id FK)
     c.User?.Flat         → flat joined through User (resident_id → User → Flat)
   Either way we want: "BlockName - FlatNumber (Floor X)"
   If floor is missing (row house / no Floor join) we skip it. */
export const resolveFlatObj = (c) => c.Flat || c.User?.Flat || null;

export const flatLabel = (c, t) => {
  const flat = resolveFlatObj(c);
  if (!flat) return "NA";

  const block      = flat.Block?.name      || flat.block_name      || "";
  const flatNum    = flat.flat_number      || "";
  const floorNum   = flat.floor_number     ?? flat.Floor?.floor_number ?? null;

  const parts = [];
  if (block)   parts.push(block);
  if (flatNum) {
    const labelFlat = t ? t("flatLabel") : "Flat";
    parts.push(`${labelFlat} ${flatNum}`);
  }

  let label = parts.join(" - ") || "NA";
  if (floorNum !== null && floorNum !== undefined) {
    const labelFloor = t ? t("floorLabel") : "Floor";
    label += ` (${labelFloor} ${floorNum})`;
  }
  return label;
};