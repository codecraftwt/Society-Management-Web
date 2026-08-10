import {
  MdFamilyRestroom,
  MdDirectionsCarFilled,
  MdReportProblem,
  MdSettings,
  MdHome,
  MdArrowForward,
  MdBadge,
  MdCreditCard,
  MdCheckCircle,
  MdOpenInNew,
  MdUploadFile,
  MdWarning,
  MdInsertDriveFile,
  MdDocumentScanner,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";

/* ── Avatar ── */
function Avatar({ name, size = "lg" }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "R";
  const hue = name
    ? [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360
    : 220;
  const dim = size === "lg" ? "w-20 h-20 text-2xl" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold border-2 shrink-0`}
      style={{
        background: `hsl(${hue},45%,22%)`,
        borderColor: `hsl(${hue},50%,35%)`,
        color: `hsl(${hue},70%,75%)`,
      }}
    >
      {initials}
    </div>
  );
}

/* ── Stat tile ── */
function Stat({ label, value, color }) {
  const colorMap = {
    blue: { text: "text-blue-400", bg: "bg-blue-500/10   border-blue-500/20" },
    green: { text: "text-green-400", bg: "bg-green-500/10  border-green-500/20" },
    yellow: { text: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    purple: { text: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`rounded-xl border p-3 text-center ${c.bg}`}>
      <p className={`text-2xl font-bold leading-none ${c.text}`}>{value}</p>
      <p className="text-[11px] text-secondary mt-1.5">{label}</p>
    </div>
  );
}

/* ── Manage card ── */
function ManageCard({ icon, label, onClick, cfg }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white/5 border ${cfg.border} rounded-xl p-4 flex flex-col items-start gap-3
                  hover:bg-white/8 hover:-translate-y-0.5 transition-all duration-200 group text-left`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border} group-hover:scale-110 transition-transform duration-200`}
      >
        <span className={`text-xl ${cfg.icon}`}>{icon}</span>
      </div>
      <div className="flex items-center justify-between w-full">
        <p className="text-sm font-medium">{label}</p>
        <MdArrowForward
          size={14}
          className="text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
        />
      </div>
    </button>
  );
}

/* ── Single Document Card ── */
function DocCard({ label, icon: Icon, url, accentColor, accentBg, accentBorder }) {
  const isPdf = url?.toLowerCase().includes(".pdf") || url?.includes("/raw/");

  return (
    <div style={{
      flex: 1,
      borderRadius: 14,
      border: `1.5px solid ${url ? accentBorder : "var(--divider, rgba(255,255,255,0.08))"}`,
      background: url ? accentBg : "var(--card-inner-bg, rgba(255,255,255,0.04))",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: "all 0.2s",
      minHeight: 120,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: url ? accentBg : "rgba(255,255,255,0.05)",
          border: `1px solid ${url ? accentBorder : "rgba(255,255,255,0.08)"}`,
        }}>
          <Icon size={20} style={{ color: url ? accentColor : "var(--text-secondary)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: url ? accentColor : "var(--text-secondary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {label}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "2px 0 0" }}>
            {url ? (isPdf ? "PDF Document" : "Image") : "Not uploaded"}
          </p>
        </div>
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: url ? "#4ade80" : "rgba(255,255,255,0.15)",
        }} />
      </div>

      {/* Preview / placeholder */}
      {url ? (
        isPdf ? (
          <div style={{
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <MdInsertDriveFile size={18} style={{ color: accentColor, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {label.toLowerCase().replace(" ", "_")}.pdf
            </span>
          </div>
        ) : (
          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", height: 60 }}>
            <img
              src={url}
              alt={label}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
        )
      ) : (
        <div style={{
          borderRadius: 8,
          border: "1.5px dashed rgba(255,255,255,0.1)",
          padding: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, opacity: 0.6 }}>No document</p>
        </div>
      )}

      {/* View button */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            textDecoration: "none", cursor: "pointer",
            background: accentBg,
            border: `1px solid ${accentBorder}`,
            color: accentColor,
            transition: "all 0.18s",
          }}
        >
          <MdOpenInNew size={13} /> View Document
        </a>
      )}
    </div>
  );
}

/* ── My Documents Section ── */

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();

  const [profile, setProfile] = useState(null);
  const [flatInfo, setFlatInfo] = useState(null);
  const [stats, setStats] = useState({ members: 0, vehicles: 0, visitors: 0 });

  const loadProfile = async () => {
    try {
      const res = await API.get("/users/me");
      setProfile(res.data);
    } catch (err) { console.error(err); }
  };

  const loadFlat = async () => {
    try {
      const res = await API.get("/users/get-flat");
      const flats = Array.isArray(res.data) ? res.data : [];
      setFlatInfo(flats.length > 0 ? flats[0] : null);  // ✅ take first flat
    } catch (err) { setFlatInfo(null); }
  };

  const loadStats = async () => {
    try {
      const [householdRes, visitorRes] = await Promise.all([
        API.get("/household"),
        API.get("/visitors/resident"),
      ]);

      const householdData = Array.isArray(householdRes.data)
        ? householdRes.data
        : householdRes.data?.data || [];

      const visitorData = Array.isArray(visitorRes.data)
        ? visitorRes.data
        : visitorRes.data?.data || [];

      setStats({
        members: householdData.length,
        vehicles: 0,
        visitors: visitorData.filter((v) => !v.exit_time).length,
      });

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProfile();
    loadFlat();
    loadStats();
  }, []);

  const hasFlat = !!flatInfo;

  const handleEmergencyClick = () => {
    if (!hasFlat) { toast.warning(t("rdEmergencyNoFlat")); return; }
    navigate("/resident/emergency");
  };

  const CARD_STYLES = {
    household: { bg: "bg-blue-500/15", border: "border-blue-500/25", icon: "text-blue-400" },
    vehicles: { bg: "bg-purple-500/15", border: "border-purple-500/25", icon: "text-purple-400" },
    emergency: { bg: "bg-red-500/15", border: "border-red-500/25", icon: "text-red-400" },
    settings: { bg: "bg-white/8", border: "border-[#3A8B95]/25", icon: "text-secondary" },
  };

  const manageCards = [
    { icon: <MdFamilyRestroom />, label: t("rdCardHousehold"), style: "household", onClick: () => navigate("/resident/my-household") },
    { icon: <MdDirectionsCarFilled />, label: t("rdCardVehicles"), style: "vehicles", onClick: () => navigate("/resident/my-vehicles") },
    { icon: <MdReportProblem />, label: t("rdCardEmergency"), style: "emergency", onClick: handleEmergencyClick },
    { icon: <MdSettings />, label: t("rdCardSettings"), style: "settings", onClick: () => navigate("/resident/settings") },
    {
      icon: <MdDocumentScanner />, label: t("rdCardMyDocs"), style: "settings", onClick: () => navigate("/resident/my-documents")
    }
  ];

  return (
    <div className="flex justify-center mt-6 px-4 animate-fadeIn">
      <div className="w-full max-w-5xl space-y-5">

        {/* ── PROFILE BANNER ── */}
        <div className="bg-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <Avatar name={profile?.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold leading-tight">
                {profile?.name || t("rdResident")}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                {t("rdRoleBadge")}
              </span>
            </div>
            <div className={`mt-1.5 flex items-center gap-1.5 text-sm ${hasFlat ? "text-secondary" : "text-yellow-400/80"}`}>
              <MdHome size={15} />
              {hasFlat
                ? `${t("rdBlock")} ${flatInfo?.block_name || "—"}, ${t("rdFlat")} ${flatInfo?.flat_number || "—"}`
                : t("rdFlatNotAssigned")}
            </div>
            {profile?.email && (
              <p className="text-xs text-secondary/60 mt-0.5">{profile.email}</p>
            )}
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t("rdStatHousehold")} value={stats.members} color="blue" />
          <Stat label={t("rdStatVehicles")} value={stats.vehicles} color="purple" />
          <Stat label={t("rdStatVisitors")} value={stats.visitors} color="green" />
        </div>

        {/* ── MANAGE GRID ── */}
        <div className="bg-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
            {t("rdManageLabel")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {manageCards.map(({ icon, label, style, onClick }) => (
              <ManageCard key={style} icon={icon} label={label} onClick={onClick} cfg={CARD_STYLES[style]} />
            ))}
          </div>
        </div>




      </div>
    </div>
  );
}