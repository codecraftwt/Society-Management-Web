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
} from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";

function Avatar({ name }) {
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return <div className="ms-avatar">{initials}</div>;
}

function ManageCard({ icon, label, onClick, tone = "accent" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mp-manage-card mp-manage-card--${tone}`}
    >
      <span className="mp-manage-icon">{icon}</span>
      <span className="mp-manage-label">{label}</span>
      <MdArrowForward size={14} className="mp-manage-arrow" />
    </button>
  );
}

export default function ResidentDashboard() {
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
      toast.warning(t("rdEmergencyNoFlat"));
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
    <div className="ge-root mp-page animate-fadeIn">
      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdPerson size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("menuMyProfile")}</h2>
            <p className="page-subtitle">{flatLabel}</p>
          </div>
        </div>
      </div>

      <div className="bg-card ms-hero">
        <div className="ms-hero-accent" />
        <div className="ms-hero-body">
          <Avatar name={profile?.name} />
          <div className="ms-hero-info">
            <h2 className="ms-hero-name">{profile?.name || t("rdResident")}</h2>
            {profile?.email && <p className="ms-hero-email">{profile.email}</p>}
            <div className="ms-hero-badges">
              <span className="ms-badge ms-badge--blue">
                <MdShield size={11} /> {t("rdRoleBadge")}
              </span>
              <span className="ms-badge ms-badge--green">
                <MdCheckCircle size={11} /> {t("active")}
              </span>
              <span className={`ms-badge ${hasFlat ? "ms-badge--muted" : "ms-badge--warn"}`}>
                <MdHome size={11} /> {flatLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ge-stats">
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{stats.members}</span>
          <span className="complaint-stat-label">{t("rdStatHousehold")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{stats.vehicles}</span>
          <span className="complaint-stat-label">{t("rdStatVehicles")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved">
          <span className="complaint-stat-val">{stats.visitors}</span>
          <span className="complaint-stat-label">{t("rdStatVisitors")}</span>
        </div>
      </div>

      {manageCards.length > 0 && (
        <div className="bg-card mp-manage">
          <p className="mp-manage-heading">{t("rdManageLabel")}</p>
          <div className="mp-manage-grid">
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
