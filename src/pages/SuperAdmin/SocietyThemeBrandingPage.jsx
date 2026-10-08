import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import { toast } from "react-toastify";
import API from "../../services/api";
import {
  MdPalette,
  MdArrowBack,
  MdSave,
  MdRefresh,
  MdApartment,
  MdCheckCircle,
  MdOutlineAutoAwesome,
} from "react-icons/md";
import ThemeBrandingEditor from "../../components/common/ThemeBrandingEditor";
import GlobalButton from "../../components/common/GlobalButton";
import Select from "../../components/common/Select";
import { isValidHexColor, applyDynamicTheme, clearDynamicTheme, deriveThemeTokens } from "../../utils/themeUtils";

export default function SocietyThemeBrandingPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const societyIdParam = searchParams.get("societyId") || searchParams.get("society_id") || "";
  const initialSocietyName = searchParams.get("societyName") || searchParams.get("society_name") || "";

  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(societyIdParam);
  const [selectedSocietyName, setSelectedSocietyName] = useState(initialSocietyName);

  const [primaryColor, setPrimaryColor] = useState("#a05aff");
  const [accentColor, setAccentColor] = useState("#9e58ff");
  const [cardStyle, setCardStyle] = useState("default");
  const [quickLinkStyle, setQuickLinkStyle] = useState("default");

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch list of all societies for the dropdown selector
  useEffect(() => {
    let isMounted = true;
    API.get("/societies")
      .then((res) => {
        if (!isMounted) return;
        const list = res.data || [];
        setSocieties(list);

        if (!selectedSocietyId && list.length > 0) {
          setSelectedSocietyId(String(list[0].id));
          setSelectedSocietyName(list[0].name);
        } else if (selectedSocietyId) {
          const match = list.find((s) => String(s.id) === String(selectedSocietyId));
          if (match && match.name) {
            setSelectedSocietyName(match.name);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load societies list:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch theme details whenever selectedSocietyId changes
  const fetchSocietyTheme = useCallback(async (socId) => {
    if (!socId) return;
    setLoading(true);
    try {
      const res = await API.get(`/societies/${socId}/theme`);
      if (res.data?.success && res.data.configured) {
        setPrimaryColor(res.data.theme.primary || "#a05aff");
        setAccentColor(res.data.theme.accent || "#9e58ff");
        setCardStyle(res.data.theme.cardStyle || res.data.theme.card_style || "default");
        setQuickLinkStyle(res.data.theme.quickLinkStyle || res.data.theme.quick_link_style || "default");
      } else {
        // Defaults
        setPrimaryColor("#a05aff");
        setAccentColor("#9e58ff");
        setCardStyle("default");
        setQuickLinkStyle("default");
      }
    } catch (err) {
      console.error("Failed to fetch society theme:", err);
      setPrimaryColor("#a05aff");
      setAccentColor("#9e58ff");
      setCardStyle("default");
      setQuickLinkStyle("default");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSocietyId) {
      fetchSocietyTheme(selectedSocietyId);
    }
  }, [selectedSocietyId, fetchSocietyTheme]);

  const handleSelectSociety = (e) => {
    const id = e.target.value;
    setSelectedSocietyId(id);
    const soc = societies.find((s) => String(s.id) === String(id));
    const name = soc ? soc.name : "";
    setSelectedSocietyName(name);
    setSearchParams({ societyId: id, societyName: name });
  };

  const handleSave = async () => {
    if (!selectedSocietyId) {
      toast.error(t("saPickSocietyFirst", "Please select a society first"));
      return;
    }
    if (!isValidHexColor(primaryColor)) {
      toast.error(t("saInvalidPrimaryHex", "Please enter a valid primary HEX color (e.g. #7c3aed)"));
      return;
    }
    if (accentColor && !isValidHexColor(accentColor)) {
      toast.error(t("saInvalidAccentHex", "Please enter a valid accent HEX color (e.g. #8b5cf6)"));
      return;
    }

    try {
      setSaveLoading(true);
      await API.put(`/societies/${selectedSocietyId}/theme`, {
        primary: primaryColor,
        accent: accentColor || primaryColor,
        cardStyle: cardStyle,
        quickLinkStyle: quickLinkStyle,
      });

      toast.success(t("saToastThemeSaved", "Society branding saved successfully!"));

      // Temporarily apply theme preview
      const tokens = deriveThemeTokens(primaryColor, accentColor);
      if (tokens) {
        applyDynamicTheme(tokens);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t("saErrSaveTheme", "Failed to save society theme"));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReset = async () => {
    if (!selectedSocietyId) return;
    try {
      setResetLoading(true);
      await API.post(`/societies/${selectedSocietyId}/theme/reset`);
      setPrimaryColor("#a05aff");
      setAccentColor("#9e58ff");
      setCardStyle("default");
      setQuickLinkStyle("default");
      clearDynamicTheme();
      toast.success(t("saToastThemeReset", "Theme reset to system default"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("saErrResetTheme", "Failed to reset theme"));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* ── HEADER & BAR ── */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-lg backdrop-blur-xl flex flex-col gap-4">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/superadmin/societies");
                }
              }}
              className="w-10 h-10 rounded-xl bg-[var(--card-inner-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm shrink-0"
              title="Back"
            >
              <MdArrowBack size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[rgba(160,90,255,0.15)] text-[var(--accent)] border border-[rgba(160,90,255,0.3)] shrink-0">
                  <MdPalette size={20} />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {t("saThemeStudioTitle", "Theme & Branding Studio")}
                </h1>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Society Selector Dropdown */}
            {societies.length > 0 && (
              <div className="flex items-center gap-2">
                <MdApartment size={18} className="text-[var(--text-secondary)] hidden sm:block shrink-0" />
                <Select
                  value={selectedSocietyId}
                  onChange={handleSelectSociety}
                  className="input text-xs sm:text-sm h-10 rounded-xl border border-[var(--glass-border)] bg-[var(--card-inner-bg)] font-semibold"
                  style={{ minWidth: 200 }}
                >
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <GlobalButton
              variant="secondary"
              icon={MdRefresh}
              onClick={handleReset}
              loading={resetLoading}
              disabled={loading || saveLoading}
              title={t("saResetThemeBtn", "Reset to System Default")}
            >
              {t("reset", "Reset")}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              icon={MdSave}
              onClick={handleSave}
              loading={saveLoading}
              disabled={loading || resetLoading}
              borderDraw
            >
              {t("saSaveBranding", "Save Branding")}
            </GlobalButton>
          </div>
        </div>

        {/* Subtitle & Active Society Context Banner */}
        <div className="flex items-center gap-2 pt-3 border-t border-[var(--glass-border)] text-xs sm:text-sm text-[var(--text-secondary)] font-medium flex-wrap">
          <span>{t("saThemeStudioSub", "Customizing brand identity, color scheme & component styles for:")}</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(160,90,255,0.12)] text-[var(--accent)] border border-[rgba(160,90,255,0.25)] font-bold">
            <MdApartment size={14} />
            {selectedSocietyName || "Selected Society"}
          </span>
        </div>
      </div>

      {/* ── EDITOR BODY ── */}
      {loading ? (
        <div className="p-12 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
          <div className="w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">{t("saLoadingTheme", "Loading society theme preferences...")}</span>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-2xl p-5 sm:p-7 shadow-lg backdrop-blur-md">
          <div className="mb-6 pb-4 border-b border-[var(--glass-border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MdOutlineAutoAwesome size={20} className="text-[var(--accent)]" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {t("saBrandingStudioSubtitle", "Live Visual Style Editor")}
              </h2>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[rgba(16,185,129,0.12)] text-[#10b981] border border-[rgba(16,185,129,0.25)] flex items-center gap-1.5">
              <MdCheckCircle size={14} />
              {t("saRealtimeSync", "Realtime Preview Active")}
            </span>
          </div>

          <ThemeBrandingEditor
            primaryColor={primaryColor}
            accentColor={accentColor}
            cardStyle={cardStyle}
            quickLinkStyle={quickLinkStyle}
            onChangePrimary={setPrimaryColor}
            onChangeAccent={setAccentColor}
            onChangeCardStyle={setCardStyle}
            onChangeQuickLinkStyle={setQuickLinkStyle}
            onApplyPreset={(p) => {
              setPrimaryColor(p.primary);
              setAccentColor(p.accent);
            }}
            societyName={selectedSocietyName || "Society Portal"}
          />
        </div>
      )}
    </div>
  );
}
