import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { MdDashboard, MdWarning, MdSend } from "react-icons/md";
import { toast } from "react-toastify";
import SOSModal from "../../components/emergency/SOSModal";

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
    <div className="ge-root rp-dash animate-fadeIn">
      <div className="ge-er">
        <div className="ge-er-left">
          <SkeletonBlock width={44} height={44} radius={14} />
          <div className="space-y-2">
            <SkeletonBlock width={180} height={18} />
            <SkeletonBlock width={240} height={12} />
          </div>
        </div>
      </div>

      <div className="ge-stats">
        {[0, 1, 2].map((i) => (
          <div key={i} className="complaint-stat-card complaint-stat-total" style={{ opacity: 0.45 }}>
            <SkeletonBlock width="60%" height={18} />
            <SkeletonBlock width="40%" height={10} style={{ marginTop: 8 }} />
          </div>
        ))}
      </div>

      <div className="rd-skeleton rounded-2xl" style={{ height: 220 }} />
    </div>
  );
}

function buildFlatLabel(flatInfo, t) {
  if (!flatInfo?.flat_number) return null;

  const block = flatInfo.block_name ? `${t("profileBlock")} ${flatInfo.block_name}` : null;
  const floor = flatInfo.floor_number != null ? `${t("profileFloor")} ${flatInfo.floor_number}` : null;
  const flat = `${t("profileFlat")} ${flatInfo.flat_number}`;

  return [block, floor, flat].filter(Boolean).join(" › ");
}

export default function ResidentProfile() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = pathname.startsWith("/family") ? "/family" : "/resident";

  const [profile, setProfile] = useState(null);
  const [flatInfo, setFlatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSOSOpen, setIsSOSOpen] = useState(false);

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
        const flats = Array.isArray(flatRes.value.data) ? flatRes.value.data : [];
        setFlatInfo(flats.length > 0 ? flats[0] : null);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

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

  const hasFlat = !!flatInfo?.flat_number;
  const flatLabel = buildFlatLabel(flatInfo, t);
  const isOwner = profile?.resident_type === "OWNER";
  const societyName = profile.Society?.name || "—";

  return (
    <div className="ge-root rp-dash animate-fadeIn space-y-6">
      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdDashboard size={22} />
          </div>
          <div>
            <h2 className="page-title">
              {t("profileWelcomeBack")}, {profile.name}
            </h2>
            <p className="page-subtitle">{t("profileWelcomeNote")}</p>
          </div>
        </div>
      </div>

      <div className={`ge-stats ${isOwner ? "rp-stats--4" : "rp-stats--3"}`}>
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{profile.role || t("profileRoleResident")}</span>
          <span className="complaint-stat-label">{t("profileTileRole")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-pending">
          <span className="complaint-stat-val">{societyName}</span>
          <span className="complaint-stat-label">{t("profileTileSociety")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">
            {hasFlat ? flatLabel : t("profileFlatNotAssigned")}
          </span>
          <span className="complaint-stat-label">{t("profileTileFlat")}</span>
        </div>
        {isOwner && (
          <button
            type="button"
            className="complaint-stat-card complaint-stat-resolved rp-stat-btn"
            onClick={() => navigate(`${base}/bills`)}
          >
            <span className="complaint-stat-val">{t("profileTileBillsVal")}</span>
            <span className="complaint-stat-label">{t("profileTileBills")}</span>
          </button>
        )}
      </div>

      {/* ── UNIFIED EMERGENCY SOS HERO BANNER ── */}
      <div className="rp-sos flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 shrink-0">
            <MdWarning size={26} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary tracking-tight">
              {t("sosTitle") || "Emergency SOS Broadcast"}
            </h2>
            <p className="text-xs text-secondary max-w-md">
              {t("sosSubtitle") || "Select emergency type, provide optional notes, and alert security and society members immediately."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSOSOpen(true)}
          className="btn bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs px-5 py-3 rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition active:scale-95 shrink-0 cursor-pointer"
        >
          <MdSend size={16} />
          <span>Raise Emergency SOS</span>
        </button>
      </div>

      {/* ── UNIFIED SOS MODAL ── */}
      {isSOSOpen && (
        <SOSModal
          key={String(isSOSOpen)}
          isOpen={isSOSOpen}
          onClose={() => setIsSOSOpen(false)}
          senderLabel="Resident"
          modalTitle="🚨 Resident Emergency SOS"
          successMessage="🚨 Emergency SOS broadcasted successfully to security and society!"
        />
      )}
    </div>
  );
}
