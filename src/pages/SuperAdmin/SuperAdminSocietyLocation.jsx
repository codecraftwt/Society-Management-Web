import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdArrowBack, MdPlace } from "react-icons/md";
import API from "../../services/api";
import GlobalButton from "../../components/common/GlobalButton";
import SocietyLocationSettings from "../../components/common/SocietyLocationSettings";
import { useLang } from "../../context/LanguageContext";

export default function SuperAdminSocietyLocation() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const societyId = searchParams.get("societyId") || "";
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(Boolean(societyId));

  useEffect(() => {
    if (!societyId) {
      setSociety(null);
      setLoading(false);
      return undefined;
    }

    localStorage.setItem("superadmin_society_filter", String(societyId));
    window.dispatchEvent(new Event("superadmin-society-scope-change"));

    let cancelled = false;
    API.get("/societies")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) {
          setSociety(list.find((item) => String(item.id) === String(societyId)) || null);
        }
      })
      .catch(() => {
        if (!cancelled) setSociety(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [societyId]);

  return (
    <div className="sa-page sa-page--location">
      <div className="sa-dash-header sa-location-header">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <GlobalButton
              variant="secondary"
              icon={MdArrowBack}
              onClick={() => navigate("/superadmin/societies")}
            >
              {t("back", "Back to Societies")}
            </GlobalButton>
          </div>
          <div className="sa-location-heading">
            <span className="sa-location-heading-icon"><MdPlace aria-hidden="true" /></span>
            <div>
              <h1 className="sa-page-title">{t("asLocationTab", "Society Location")}</h1>
              <p className="sa-location-kicker">Geofence &amp; guard punch-in settings</p>
            </div>
          </div>
        </div>
        <div className="sa-location-context" aria-label="Location settings summary">
          <span className="sa-location-context-dot" />
          <span>Live location controls</span>
        </div>
      </div>

      {!societyId ? (
        <div className="sa-empty-state">
          <MdPlace size={42} style={{ color: "var(--text-secondary)", opacity: 0.45 }} />
          <p className="sa-empty-title">{t("selectSociety", "Select a society")}</p>
          <p className="sa-empty-subtitle">{t("saLocationChooseSociety", "Open Society Location from a society's actions to configure its map pin and guard radius.")}</p>
          <GlobalButton variant="primary" onClick={() => navigate("/superadmin/societies")}>
            {t("saMenuSocieties", "Societies")}
          </GlobalButton>
        </div>
      ) : (
        <SocietyLocationSettings
          key={societyId}
          societyId={societyId}
          societyName={society?.name || `Society #${societyId}`}
        />
      )}
    </div>
  );
}
