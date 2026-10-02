import {
  MdFamilyRestroom,
  MdDirectionsCarFilled,
  MdReportProblem,
  MdSettings,
  MdHome,
  MdArrowForward,
  MdPerson,
  MdShield,
  MdCheckCircle,
  MdDocumentScanner,
  MdPeopleAlt,
  MdBolt,
} from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import UserAvatar from "../../components/common/UserAvatar";
import StatCard from "../../components/common/StatCard";

/**
 * Resident "My Overview" screen.
 *
 * Moved here from the old MyProfile page, which was a read-only overview even
 * though it was titled "My Profile". The editable profile now lives at
 * /resident/myprofile and /family/myprofile and is rendered by the shared
 * SettingsPanel, so this page is reachable at /resident/overview and
 * /family/overview instead.
 *
 * The structure and data are unchanged: flat label, resident badges, household
 * / vehicle / active-visitor counts and the Quick Management shortcuts. Family
 * members get the hero and the counts only, because the shortcuts point at
 * resident-only routes. Only the presentation was modernised, via the
 * .ov-* classes in Resident.css, which are scoped to this page so the shared
 * .ms-* / .mp-* primitives used elsewhere keep their existing look.
 */
function Avatar({ name, src }) {
  return <UserAvatar name={name} src={src} size={78} radius={21} alt={name || "Profile picture"} />;
}

function ManageCard({ icon, label, onClick, tone = "accent" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ov-manage-card ov-manage-card--${tone}`}
    >
      <span className="ov-manage-icon">{icon}</span>
      <span className="ov-manage-label">{label}</span>
      <MdArrowForward size={15} className="ov-manage-arrow" />
    </button>
  );
}

export default function ResidentOverview() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLang();
  const base = pathname.startsWith("/family") ? "/family" : "/resident";
  const isFamily = pathname.startsWith("/family");

  const [profile, setProfile] = useState(null);
  const [flatInfo, setFlatInfo] = useState(null);
  const [stats, setStats] = useState({ members: 0, vehicles: 0, visitors: 0 });

  const loadProfile = async () => {
    try {
      const res = await API.get("/users/me");
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFlat = async () => {
    try {
      const res = await API.get("/users/get-flat");
      const flats = Array.isArray(res.data) ? res.data : [];
      setFlatInfo(flats.length > 0 ? flats[0] : null);
    } catch (err) {
      setFlatInfo(null);
    }
  };

  const loadStats = async () => {
    try {
      const [householdRes, visitorRes, vehicleRes] = await Promise.all([
        API.get("/household"),
        API.get("/visitors/resident"),
        API.get("/vehicles/my").catch(() => ({ data: [] })),
      ]);

      const householdData = Array.isArray(householdRes.data)
        ? householdRes.data
        : householdRes.data?.data || [];

      const visitorData = Array.isArray(visitorRes.data)
        ? visitorRes.data
        : visitorRes.data?.data || [];

      const vehicleData = Array.isArray(vehicleRes.data)
        ? vehicleRes.data
        : vehicleRes.data?.data || [];

      setStats({
        members: householdData.length,
        vehicles: vehicleData.length,
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
    if (!hasFlat) {
      toast.warning(t("mpEmergencyNoFlat"));
      return;
    }
    navigate(`${base}/emergency`);
  };

  const manageCards = isFamily
    ? []
    : [
        { id: "household", icon: <MdFamilyRestroom />, label: t("rdCardHousehold"), tone: "accent", onClick: () => navigate(`${base}/my-household`) },
        { id: "vehicles", icon: <MdDirectionsCarFilled />, label: t("rdCardVehicles"), tone: "accent", onClick: () => navigate(`${base}/my-vehicles`) },
        { id: "emergency", icon: <MdReportProblem />, label: t("rdCardEmergency"), tone: "danger", onClick: handleEmergencyClick },
        { id: "settings", icon: <MdSettings />, label: t("rdCardSettings"), tone: "muted", onClick: () => navigate(`${base}/settings`) },
        { id: "docs", icon: <MdDocumentScanner />, label: t("rdCardMyDocs"), tone: "muted", onClick: () => navigate(`${base}/my-documents`) },
      ];

  const flatLabel = hasFlat
    ? `${t("rdBlock")} ${flatInfo?.block_name || "—"}, ${t("rdFlat")} ${flatInfo?.flat_number || "—"}`
    : t("rdFlatNotAssigned");

  return (
    <div className="ge-root ov-page animate-fadeIn">
      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdPerson size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("profileMyOverview")}</h2>
            <p className="page-subtitle">{flatLabel}</p>
          </div>
        </div>
      </div>

      <div className="ov-hero">
        <div className="ov-hero__accent" />
        <div className="ov-hero__body">
          <div className="ov-hero__frame">
            <Avatar name={profile?.name} src={profile?.profile_picture} />
          </div>
          <div className="ov-hero__info">
            <h2 className="ov-hero__name">{profile?.name || t("rdDefaultName")}</h2>
            {profile?.email && <p className="ov-hero__email">{profile.email}</p>}
            <div className="ov-hero__badges">
              <span className="ov-badge ov-badge--accent">
                <MdShield size={11} /> {profile?.resident_type || t("rdRoleBadge")}
              </span>
              <span className="ov-badge ov-badge--ok">
                <MdCheckCircle size={11} /> {t("active")}
              </span>
              <span className={`ov-badge ${hasFlat ? "ov-badge--muted" : "ov-badge--warn"}`}>
                <MdHome size={11} /> {flatLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ov-stats">
        <StatCard
          layout="inline"
          icon={<MdFamilyRestroom />}
          value={stats.members}
          label={t("rdStatHousehold")}
          tone="info"
        />
        <StatCard
          layout="inline"
          icon={<MdDirectionsCarFilled />}
          value={stats.vehicles}
          label={t("rdStatVehicles")}
          tone="success"
        />
        <StatCard
          layout="inline"
          icon={<MdPeopleAlt />}
          value={stats.visitors}
          label={t("mpStatActiveVisitors")}
          tone="warning"
        />
      </div>

      {manageCards.length > 0 && (
        <div className="ov-manage">
          <p className="ov-manage__heading">
            <MdBolt size={13} aria-hidden="true" />
            {t("mpManageHeading")}
          </p>
          <div className="ov-manage__grid">
            {manageCards.map((card) => (
              <ManageCard
                key={card.id}
                icon={card.icon}
                label={card.label}
                onClick={card.onClick}
                tone={card.tone}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
