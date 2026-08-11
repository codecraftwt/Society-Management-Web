import { useEffect, useState } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdPerson, MdHome, MdEmail, MdBusiness, MdWarning,
  MdSend, MdCheckCircle, MdShield,
} from "react-icons/md";
import { FaMoneyBillWave } from "react-icons/fa";
import { toast } from "react-toastify";

/* ─── Skeleton helpers ─── */
function SkeletonBlock({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div
      className="rd-skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Banner skeleton */}
      <div className="bg-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <SkeletonBlock width={80} height={80} radius={16} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <SkeletonBlock width={160} height={22} />
              <SkeletonBlock width={70} height={20} radius={999} />
              <SkeletonBlock width={60} height={20} radius={999} />
            </div>
            <SkeletonBlock width={200} height={14} />
            <SkeletonBlock width={220} height={14} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/5">
          <SkeletonBlock height={12} />
        </div>
      </div>

      {/* Emergency skeleton (mobile) */}
      <div className="sm:hidden">
        <div className="rd-skeleton rounded-2xl" style={{ height: 180 }} />
      </div>

      {/* Info tiles skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white/5 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3"
          >
            <SkeletonBlock width={36} height={36} radius={12} />
            <div className="flex-1 space-y-2">
              <SkeletonBlock width={60} height={10} />
              <SkeletonBlock width={100} height={14} />
            </div>
          </div>
        ))}
      </div>

      {/* Profile details skeleton */}
      <div className="bg-card p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBlock width={16} height={16} radius={4} />
          <SkeletonBlock width={100} height={14} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white/5 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3"
            >
              <SkeletonBlock width={36} height={36} radius={12} />
              <div className="flex-1 space-y-2">
                <SkeletonBlock width={70} height={10} />
                <SkeletonBlock width={130} height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency skeleton (desktop) */}
      <div className="hidden sm:block">
        <div className="rd-skeleton rounded-2xl" style={{ height: 200 }} />
      </div>

    </div>
  );
}

/* ─── Avatar ─── */
function Avatar({ name }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "R";
  const hue = name
    ? [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 360
    : 220;
  return (
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 shrink-0"
      style={{
        background: `hsl(${hue},45%,20%)`,
        borderColor: `hsl(${hue},50%,32%)`,
        color: `hsl(${hue},70%,72%)`,
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Info tile ─── */
function InfoTile({ icon: Icon, label, value, iconColor = "text-blue-400", iconBg = "bg-blue-500/15 border-blue-500/25" }) {
  return (
    <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${iconBg}`}>
        <Icon size={17} className={iconColor} />
      </div>
      <div>
        <p className="text-[10px] text-secondary uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

/* ─── Flat location string helper ─── */
// Works for both apartments (has floor_number) and row houses (floor_number is null)
function buildFlatLabel(flatInfo, t) {
  if (!flatInfo?.flat_number) return null;

  const block = flatInfo.block_name ? `${t("profileBlock")} ${flatInfo.block_name}` : null;
  const floor = flatInfo.floor_number != null ? `${t("profileFloor")} ${flatInfo.floor_number}` : null;
  const flat  = `${t("profileFlat")} ${flatInfo.flat_number}`;

  return [block, floor, flat].filter(Boolean).join(" › ");
}

/* ═══════════════════════════════════════════
   Main
═══════════════════════════════════════════ */
export default function ResidentProfile() {
  const { t } = useLang();

  const [profile,     setProfile]     = useState(null);
  const [flatInfo,    setFlatInfo]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [sendingSOS,  setSendingSOS]  = useState(false);
  const [sosMessage,  setSosMessage]  = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, flatRes] = await Promise.allSettled([
        API.get("/users/me"),
        API.get("/users/get-flat"),
      ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
    if (flatRes.status === "fulfilled") {
  const flats = Array.isArray(flatRes.value.data)
    ? flatRes.value.data
    : [];

  setFlatInfo(flats.length > 0 ? flats[0] : null); // ✅ take first flat
}
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    if (!sosMessage.trim()) { toast.error("Please enter emergency message"); return; }
    try {
      setSendingSOS(true);
      await API.post("/emergency", { type: "RESIDENT_SOS", message: sosMessage });
      toast.success(t("sosSentSuccess"));
      setSosMessage("");
    } catch (error) {
      toast.error(error?.response?.data?.message || t("sosFailed"));
    } finally {
      setSendingSOS(false);
    }
  };

  /* ── Show skeleton while loading ── */
  if (loading) return <ProfileSkeleton />;

  /* ── If profile failed to load entirely ── */
  if (!profile) {
    return (
      <div className="flex items-center gap-3 text-secondary p-6">
        <svg className="animate-spin h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm">{t("loadingProfile")}</p>
      </div>
    );
  }

  // ── KEY FIX: only flat_number is required — floor_number is null for row houses ──
  const hasFlat = !!(flatInfo?.flat_number);

  // Pre-build the location label once, reuse everywhere
  const flatLabel = buildFlatLabel(flatInfo, t);

  /* ── Emergency block — always shows SOS form regardless of flat assignment ── */
  const emergencyBlock = (
    <div
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6 animate-scaleIn"
      style={{
        background: "linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(127,29,29,0.25) 100%)",
        border: "1px solid rgba(239,68,68,0.35)",
        boxShadow: "0 0 40px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.18) 0%, transparent 70%)", animation: "pulse 2.5s ease-in-out infinite" }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, #ef4444, #b91c1c, transparent)" }}
      />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            <div className="w-11 h-11 rounded-xl bg-red-500/25 border border-red-500/40 flex items-center justify-center relative">
              <MdWarning size={22} className="text-red-400" />
            </div>
          </div>
          <div>
            <h2 className="font-bold text-base text-red-300 tracking-wide uppercase" style={{ letterSpacing: "0.08em" }}>
              {t("sosTitle")}
            </h2>
            <p className="text-[11px] text-red-400/60 mt-0.5">{t("sosSubtitle")}</p>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-red-400/70 mb-1.5 block uppercase tracking-wider" style={{ fontSize: "10px" }}>
            {t("sosMessageLabel")}
          </label>
          <textarea
            rows={3}
            placeholder={t("sosPlaceholder")}
            value={sosMessage}
            onChange={(e) => setSosMessage(e.target.value)}
            className="w-full resize-none text-sm rounded-xl px-4 py-3 outline-none transition-all duration-200"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(239,68,68,0.25)", color: "#F9F8FA" }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(239,68,68,0.55)")}
            onBlur={(e)  => (e.target.style.borderColor = "rgba(239,68,68,0.25)")}
          />
        </div>

        <button
          onClick={handleSOS}
          disabled={sendingSOS}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: sendingSOS ? "rgba(185,28,28,0.7)" : "linear-gradient(135deg, #dc2626, #b91c1c)",
            boxShadow: sendingSOS ? "none" : "0 8px 30px rgba(220,38,38,0.45), 0 2px 0 rgba(255,255,255,0.08) inset",
            letterSpacing: "0.04em",
          }}
        >
          {sendingSOS ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {t("sosSending")}
            </>
          ) : (
            <>🚨 {t("sosSendBtn")}</>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── PROFILE BANNER ── */}
      <div className="bg-card rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative">
          <Avatar name={profile.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{profile.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                {profile.role || t("profileRoleResident")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/25 flex items-center gap-1">
                <MdCheckCircle size={11} /> {t("active")}
              </span>
            </div>
            <p className="text-secondary text-sm mt-1">{profile.email}</p>
            <p className={`mt-1.5 flex items-center gap-1.5 text-sm ${hasFlat ? "text-secondary" : "text-yellow-400/80"}`}>
              <MdHome size={14} />
              {hasFlat ? flatLabel : t("profileFlatNotAssigned")}
            </p>
          </div>
        </div>
        <p className="text-xs text-secondary/60 mt-4 border-t border-white/5 pt-4">
          {t("profileWelcomeBack")}, <span className="text-white/60">{profile.name}</span>. {t("profileWelcomeNote")}
        </p>
      </div>

      {/* Mobile emergency */}
      <div className="sm:hidden">{emergencyBlock}</div>

      {/* Info tiles — only if flat assigned */}
      {hasFlat && (
        <div className={`grid grid-cols-1 ${profile?.resident_type === "OWNER" ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
          <InfoTile icon={MdShield}        label={t("profileTileRole")}     value={profile.role}                iconColor="text-blue-400"   iconBg="bg-blue-500/15 border-blue-500/25"   />
          <InfoTile icon={MdBusiness}      label={t("profileTileSociety")}  value={profile.Society?.name}       iconColor="text-green-400"  iconBg="bg-green-500/15 border-green-500/25" />
          {profile?.resident_type === "OWNER" && (
            <InfoTile icon={FaMoneyBillWave} label={t("profileTileBills")}    value={t("profileTileBillsVal")}    iconColor="text-yellow-400" iconBg="bg-yellow-500/15 border-yellow-500/25"/>
          )}
        </div>
      )}

      {/* Profile details — only if flat assigned */}
      {hasFlat && (
        <div className="bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <MdPerson size={16} className="text-accent" />
            <h2 className="font-semibold text-sm">{t("profileMyProfile")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoTile icon={MdPerson}   label={t("profileTileFullName")} value={profile.name}          iconColor="text-blue-400"   iconBg="bg-blue-500/15 border-blue-500/25"   />
            <InfoTile icon={MdEmail}    label={t("email")}               value={profile.email}         iconColor="text-purple-400" iconBg="bg-purple-500/15 border-purple-500/25"/>
            <InfoTile icon={MdBusiness} label={t("profileTileSociety")}  value={profile.Society?.name} iconColor="text-green-400"  iconBg="bg-green-500/15 border-green-500/25" />
            <InfoTile
              icon={MdHome}
              label={t("profileTileFlat")}
              value={flatLabel}
              iconColor="text-accent"
              iconBg="bg-blue-500/15 border-blue-500/25"
            />
          </div>
        </div>
      )}

      {/* Desktop emergency */}
      <div className="hidden sm:block">{emergencyBlock}</div>
    </div>
  );
}