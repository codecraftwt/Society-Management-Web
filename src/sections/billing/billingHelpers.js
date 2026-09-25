import { useEffect, useState } from "react";

export const BILL_CATEGORIES = [
  { value: "ELECTRICITY", label: "⚡ Electricity", defaultTitle: "Electricity Bill" },
  { value: "WATER", label: "💧 Water", defaultTitle: "Water Bill" },
  { value: "GAS", label: "🔥 Gas", defaultTitle: "Gas Bill" },
  { value: "PARKING", label: "🚗 Parking", defaultTitle: "Parking Charges" },
  { value: "SECURITY", label: "🛡️ Security", defaultTitle: "Security Charges" },
  { value: "AMENITIES", label: "🏊 Amenities", defaultTitle: "Amenity Charges" },
  { value: "MAINTENANCE", label: "🛠️ Maintenance", defaultTitle: "Maintenance Bill" },
  { value: "DONATION", label: "🤝 Donation", defaultTitle: "Donation" },
  { value: "OTHER", label: "📝 Other", defaultTitle: "Other" },
];

export const BILL_TYPE_FILTERS = [
  { value: "ALL", label: "All Bill Types" },
  { value: "MAINTENANCE", label: "🛠️ Maintenance" },
  { value: "ELECTRICITY", label: "⚡ Electricity" },
  { value: "WATER", label: "💧 Water" },
  { value: "GAS", label: "🔥 Gas" },
  { value: "PARKING", label: "🚗 Parking" },
  { value: "SECURITY", label: "🛡️ Security" },
  { value: "AMENITIES", label: "🏊 Amenities" },
  { value: "DONATION", label: "🤝 Donation" },
  { value: "OTHER", label: "📝 Other" },
];

export function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getCurrentBillingMonth() {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}