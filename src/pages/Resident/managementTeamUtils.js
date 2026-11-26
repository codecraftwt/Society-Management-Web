import { API_BASE } from "../../config/apiConfig";

export const DESIGNATION_STYLES = {
  SOCIETY_ADMIN: {
    bg: "rgba(37, 99, 235, 0.12)",
    color: "#1D4ED8",
    border: "rgba(37, 99, 235, 0.28)",
    gradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    pillGradient: "linear-gradient(135deg, #2563EB, #1D4ED8)",
  },
  CHAIRMAN: {
    bg: "rgba(234, 88, 12, 0.12)",
    color: "#C2410C",
    border: "rgba(234, 88, 12, 0.28)",
    gradient: "linear-gradient(135deg, #FB923C, #EA580C)",
    pillGradient: "linear-gradient(135deg, #F59E0B, #EA580C)",
  },
  SECRETARY: {
    bg: "rgba(139, 92, 246, 0.12)",
    color: "#7C3AED",
    border: "rgba(139, 92, 246, 0.28)",
    gradient: "linear-gradient(135deg, #A855F7, #7C3AED)",
    pillGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
  },
  TREASURER: {
    bg: "rgba(20, 184, 166, 0.12)",
    color: "#0F766E",
    border: "rgba(20, 184, 166, 0.28)",
    gradient: "linear-gradient(135deg, #14B8A6, #0D9488)",
    pillGradient: "linear-gradient(135deg, #14B8A6, #0F766E)",
  },
  COMMITTEE_MEMBER: {
    bg: "rgba(16, 185, 129, 0.12)",
    color: "#047857",
    border: "rgba(16, 185, 129, 0.28)",
    gradient: "linear-gradient(135deg, #34D399, #059669)",
    pillGradient: "linear-gradient(135deg, #10B981, #059669)",
  },
  ACCOUNTANT: {
    bg: "rgba(124, 58, 237, 0.12)",
    color: "#6D28D9",
    border: "rgba(124, 58, 237, 0.28)",
    gradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    pillGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
  },
};

export function getDesignationStyle(roleKey) {
  return DESIGNATION_STYLES[roleKey] || DESIGNATION_STYLES.COMMITTEE_MEMBER;
}

export function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0] ? parts[0][0].toUpperCase() : "?";
}

export function resolveProfilePictureUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const base = (API_BASE || "").replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return base ? `${base}${path}` : path;
}

export function cleanPhoneForTel(phone) {
  if (!phone) return "";
  return String(phone).replace(/[^0-9+]/g, "");
}

export function filterManagementTeam(members, { roleFilter = "ALL", search = "" } = {}) {
  const list = Array.isArray(members) ? members : [];
  const query = String(search || "").trim().toLowerCase();

  return list.filter((member) => {
    if (roleFilter !== "ALL") {
      if (roleFilter === "COMMITTEE") {
        const committeeKeys = new Set(["CHAIRMAN", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"]);
        const hasCommittee =
          committeeKeys.has(member.role_key) ||
          (Array.isArray(member.designations) &&
            member.designations.some((d) =>
              ["Chairman", "Secretary", "Treasurer", "Committee Member"].includes(d)
            ));
        if (!hasCommittee) return false;
      } else if (member.role_key !== roleFilter) {
        const matchesSecondary =
          roleFilter === "ACCOUNTANT" &&
          Array.isArray(member.designations) &&
          member.designations.includes("Accountant");
        const matchesAdmin =
          roleFilter === "SOCIETY_ADMIN" &&
          Array.isArray(member.designations) &&
          member.designations.includes("Society Admin");
        if (!matchesSecondary && !matchesAdmin) return false;
      }
    }

    if (!query) return true;

    const haystacks = [
      member.name,
      member.designation,
      ...(Array.isArray(member.designations) ? member.designations : []),
      member.email,
      member.phone,
    ];
    return haystacks.some((val) => String(val || "").toLowerCase().includes(query));
  });
}
