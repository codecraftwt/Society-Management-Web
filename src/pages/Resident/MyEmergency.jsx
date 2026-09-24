import { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MdWarning, MdLocalFireDepartment, MdLocalHospital,
  MdSecurity, MdHelp, MdAdd, MdClose, MdSend,
  MdChevronLeft, MdChevronRight, MdHome, MdSearch,
} from "react-icons/md";
import { toast } from "react-toastify";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import Select from "../../components/common/Select";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";

import Pagination from "../../components/common/Pagination";

/* ── Type meta ── */
const TYPE_META = {
  FIRE:         { icon: MdLocalFireDepartment, color: "var(--reject-color)", bg: "var(--reject-bg)", border: "var(--reject-border)" },
  MEDICAL:      { icon: MdLocalHospital,       color: "var(--acct-cyan)",    bg: "rgba(var(--acct-cyan-rgb),0.16)",   border: "rgba(var(--acct-cyan-rgb),0.35)" },
  SECURITY:     { icon: MdSecurity,            color: "var(--accent)",       bg: "var(--accent-soft)",                border: "rgba(var(--acct-purple-rgb),0.28)" },
  OTHER:        { icon: MdHelp,                color: "var(--acct-violet)",  bg: "rgba(var(--acct-violet-rgb),0.12)", border: "rgba(var(--acct-violet-rgb),0.28)" },
  RESIDENT_SOS: { icon: MdWarning,             color: "var(--reject-color)", bg: "var(--reject-bg)", border: "var(--reject-border)" },
};

const fmt = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });



function PortalModal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: "2px solid var(--reject-border)",
      borderTopColor: "var(--reject-color)",
      animation: "spin 0.65s linear infinite",
    }} />
  );
}

function getFloorNumber(item) {
  const flatObj = item?.Flat || item;
  return (
    flatObj?.floor_number          ??
    flatObj?.Floor?.floor_number   ??
    item?.floor_number             ??
    null
  );
}

function buildFlatLabel(item) {
  if (!item) return "";
  const flatObj  = item.Flat || item;
  const block    = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
  const unit     = flatObj?.flat_number || item?.flat_number || "";
  const floor    = getFloorNumber(item);
  const parts    = [];
  if (block)                                  parts.push(block);
  if (unit)                                   parts.push(`Unit ${unit}`);
  if (floor !== null && floor !== undefined)  parts.push(`Floor ${floor}`);
  return parts.join(" · ");
}

export default function MyEmergency() {
  const [limit, setLimit] = useState(10);
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [alerts,      setAlerts]      = useState([]);
  const [page,        setPage]        = useState(1);
  const [activeTab,   setActiveTab]   = useState("ALL");
  const [search,      setSearch]      = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [sending,     setSending]     = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);

  const [form, setForm] = useState({ type: "FIRE", message: "", other_reason: "" });
  const [modalStage, setModalStage] = useState("FORM"); // 'FORM' | 'CONFIRM'

  const [myFlats,        setMyFlats]        = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [checkingFlat,   setCheckingFlat]   = useState(true);

  /* unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showModal);
  const requestCloseModal = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else setShowModal(false);
  };

  const isOwner = authUser?.resident_type === "OWNER";
  const hasFlat = myFlats.length > 0;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!authUser?.id) return;

    const fetchProperties = async () => {
      try {
        let flatsArr = [];

        try {
          const res     = await API.get(`/users/${authUser.id}/memberships`);
          const payload = res.data?.data || res.data;
          if (Array.isArray(payload) && payload.length > 0) {
            flatsArr = payload;
          } else if (payload?.all && Array.isArray(payload.all)) {
            flatsArr = payload.all;
          }
        } catch (err) {
          console.warn("[MyEmergency] Attempt 1 FAILED:", err.message);
        }

        if (flatsArr.length === 0) {
          try {
            const res     = await API.get("/users/get-flat");
            const payload = res.data?.data || res.data;
            if (Array.isArray(payload)) {
              flatsArr = payload;
            } else if (payload && typeof payload === "object") {
              if (payload.units && Array.isArray(payload.units))      flatsArr = payload.units;
              else if (payload.flats && Array.isArray(payload.flats)) flatsArr = payload.flats;
              else if (payload.flat_number || payload.Flat)           flatsArr = [payload];
            }
          } catch (err2) {
            console.warn("[MyEmergency] Attempt 2 FAILED:", err2.message);
          }
        }

        setMyFlats(flatsArr);

        if (flatsArr.length > 0) {
          const first = flatsArr[0];
          const fId   = first.flat_id || first.id || first.Flat?.id;
          setSelectedFlatId(fId ? String(fId) : "");
        }
      } catch (error) {
        console.error("[MyEmergency] Critical error fetching properties:", error);
      } finally {
        setCheckingFlat(false);
      }
    };

    fetchProperties();
  }, [authUser?.id]);

  useEffect(() => {
    if (isOwner && myFlats.length === 1) {
      const first = myFlats[0];
      const fId   = first.flat_id || first.id || first.Flat?.id;
      if (fId) setSelectedFlatId(String(fId));
    }
  }, [isOwner, myFlats]);

  const load = useCallback(async (isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const res = await API.get("/emergency/mine?page=1&limit=200");
      setAlerts(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setAlerts([]);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const handleProceedConfirm = () => {
    if (isOwner && myFlats.length > 1 && !selectedFlatId) {
      toast.error("Please select a unit for this emergency.");
      return;
    }

    if (form.type === "OTHER" && !form.other_reason?.trim()) {
      toast.error("Please provide a reason for selecting Other.");
      return;
    }

    setModalStage("CONFIRM");
  };

  const handleSend = async () => {
    if (sending) return;

    try {
      setSending(true);

      const finalMsg = form.message?.trim()
        ? form.message.trim()
        : form.type === "OTHER"
        ? `Other Emergency: ${form.other_reason?.trim()}`
        : `${form.type} Emergency reported`;

      const payload = {
        type: form.type,
        message: finalMsg,
      };

      if (form.type === "OTHER") {
        payload.other_reason = form.other_reason?.trim();
      }

      if (isOwner && selectedFlatId) {
        payload.flat_id = selectedFlatId;
      }

      await API.post("/emergency", payload);
      toast.success(t("emergencySentSuccess"));
      setShowModal(false);
      setModalStage("FORM");
      setForm({ type: "FIRE", message: "", other_reason: "" });

      if (isOwner && myFlats.length > 1) setSelectedFlatId("");

      load(false);
    } catch (err) {
      console.error("Emergency send fail:", err);
      toast.error(t("emergencySentFail"));
    } finally {
      setSending(false);
    }
  };

  const renderAlertMeta = (a) => {
    const meta = TYPE_META[a.type] || TYPE_META.OTHER;
    return { meta, Icon: meta.icon, isActive: a.status === "ACTIVE" };
  };

  const counts = useMemo(() => ({
    ALL: alerts.length,
    ACTIVE: alerts.filter((a) => a.status === "ACTIVE").length,
    RESOLVED: alerts.filter((a) => a.status === "RESOLVED").length,
  }), [alerts]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (activeTab !== "ALL" && a.status !== activeTab) return false;
      if (!q) return true;
      const flat = a.Flat ? buildFlatLabel({ Flat: a.Flat }) : "";
      return [a.type, a.message, a.status, flat].join(" ").toLowerCase().includes(q);
    });
  }, [alerts, activeTab, q]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * limit, safePage * limit);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const TYPES = [
    { key: "FIRE",     label: t("emergencyTypeFire")     },
    { key: "MEDICAL",  label: t("emergencyTypeMedical")  },
    { key: "SECURITY", label: t("emergencyTypeSecurity") },
    { key: "OTHER",    label: t("emergencyTypeOther")    },
  ];

  const renderFlatSection = () => {
    if (myFlats.length === 1) {
      return (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 12,
          background: "var(--card-inner-bg)",
          border: "1px solid var(--glass-border)",
          fontSize: 13, color: "var(--text-secondary)",
        }}>
          <MdHome size={15} style={{ color: "var(--reject-color)", flexShrink: 0 }} />
          <span>
            {t("emergencyUnitLabel")}{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {buildFlatLabel(myFlats[0])}
            </strong>
          </span>
        </div>
      );
    }

    if (isOwner && myFlats.length > 1) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <MdHome size={12} /> {t("selectUnit")}{" "}
            <span style={{ color: "var(--reject-color)" }}>*</span>
          </label>
          <Select
            className="input"
            style={{ height: 44, width: "100%", cursor: "pointer", fontSize: 13 }}
            value={selectedFlatId}
            onChange={(e) => setSelectedFlatId(e.target.value)}
            required
          >
            <option value="" disabled>{t("emergencyChooseUnit")}</option>
            {myFlats.map((item, index) => {
              const flatObj  = item.Flat || item;
              const fId      = item.flat_id || flatObj.id || `fallback-${index}`;
              const bName    = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
              const fNum     = flatObj?.flat_number || item?.flat_number || "";
              const floorNum = getFloorNumber(item);
              const floor    = floorNum !== null && floorNum !== undefined ? `(Floor ${floorNum})` : "";
              return (
                <option key={fId} value={String(fId)}>
                  {bName ? `${bName} - ` : ""}Unit {fNum} {floor}
                </option>
              );
            })}
          </Select>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="ge-root me-page animate-fadeIn">

      <div className="ge-er">
        <div className="ge-er-left">
          <div className="ad-page-icon">
            <MdWarning size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("emergencyTitle")}</h2>
            <p className="page-subtitle">{t("emergencySubtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-danger flex items-center gap-2"
          onClick={() => setShowModal(true)}
          disabled={checkingFlat || !hasFlat}
        >
          <MdAdd size={18} /> {t("emergencyRaiseBtn")}
        </button>
      </div>

      {!checkingFlat && !hasFlat && (
        <div className="gc-warn">
          <MdWarning size={15} /> {t("emergencyNoFlat")}
        </div>
      )}

      <div className="ge-stats">
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{counts.ALL}</span>
          <span className="complaint-stat-label">{t("emergencyStatTotal")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{counts.ACTIVE}</span>
          <span className="complaint-stat-label">{t("emergencyStatActive")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved">
          <span className="complaint-stat-val">{counts.RESOLVED}</span>
          <span className="complaint-stat-label">{t("emergencyStatResolved")}</span>
        </div>
      </div>

      <div className="ge-toolbar">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={activeTab}
            onChange={handleTabChange}
            tabs={[
              { id: "ALL", label: t("emergencyAll"), badge: counts.ALL },
              { id: "ACTIVE", label: t("emergencyActive"), badge: counts.ACTIVE, alert: counts.ACTIVE },
              { id: "RESOLVED", label: t("emergencyResolved"), badge: counts.RESOLVED },
            ]}
          />
        </div>

        <div className="ml-auto">
          <ExpandableSearch
            placeholder="Search type, message or unit…"
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
          />
        </div>
      </div>

      {initialLoad ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: 10, color: "var(--text-secondary)", fontSize: 14 }}>
          <Spinner /> {t("loadingProfile")}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-card rounded-xl">
          <div className="me-empty">
            <MdWarning size={36} style={{ opacity: 0.35 }} />
            <p style={{ fontSize: 15, fontWeight: 600 }}>{t("emergencyEmpty")}</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl">
          <div className="me-empty">
            <MdSearch size={36} style={{ opacity: 0.28 }} />
            <p style={{ fontSize: 15, fontWeight: 600 }}>
              {q ? `No alerts match “${search.trim()}”` : t("emergencyEmpty")}
            </p>
          </div>
        </div>
      ) : isMobile ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: fetching ? 0.5 : 1 }}>
            {pageItems.map((a) => {
              const { meta, Icon, isActive } = renderAlertMeta(a);
              const flatLabel = a.Flat ? buildFlatLabel({ Flat: a.Flat }) : null;
              return (
                <div key={a.id} className="me-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: meta.bg, border: `1px solid ${meta.border}` }}>
                        <Icon size={18} style={{ color: meta.color }} />
                      </div>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{a.type}</span>
                        {flatLabel && (
                          <div style={{ marginTop: 3 }}>
                            <span className="me-unit">
                              <MdHome size={10} /> {flatLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`me-status ${isActive ? "me-status--active" : "me-status--resolved"}`}>
                      {isActive ? t("emergencyActive") : t("emergencyResolved")}
                    </span>
                  </div>
                  {a.message && (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{a.message}</p>
                  )}
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", opacity: 0.7 }}>
                    🕐 {fmt(a.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} pageSize={limit} onPageSizeChange={(s) => { setLimit(s); setPage(1); }} />
          </div>
        </>
      ) : (
        <div className="me-table-wrap" style={{ opacity: fetching ? 0.5 : 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[t("emergencyColType"), "Unit", t("emergencyColMessage"), t("emergencyColStatus"), t("emergencyColTime")].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a) => {
                const { meta, Icon, isActive } = renderAlertMeta(a);
                const flatLabel = a.Flat ? buildFlatLabel({ Flat: a.Flat }) : null;
                return (
                  <tr key={a.id} className="me-row" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: meta.bg, border: `1px solid ${meta.border}` }}>
                          <Icon size={16} style={{ color: meta.color }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{a.type}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {flatLabel ? (
                        <span className="me-unit" style={{ fontSize: 11, padding: "3px 9px", gap: 5 }}>
                          <MdHome size={11} /> {flatLabel}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--text-secondary)", maxWidth: 260 }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {a.message || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span className={`me-status ${isActive ? "me-status--active" : "me-status--resolved"}`}>
                        {isActive ? t("emergencyActive") : t("emergencyResolved")}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {fmt(a.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("emergencyShowing", {
                range: `${(safePage - 1) * limit + 1}–${Math.min(safePage * limit, totalItems)}`,
                total: totalItems,
              })}
            </span>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} pageSize={limit} onPageSizeChange={(s) => { setLimit(s); setPage(1); }} />
          </div>
        </div>
      )}

      {showModal && (
        <PortalModal>
          <div
            onClick={() => !sending && requestCloseModal()}
            className="hh-overlay"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-card animate-scaleIn me-modal"
            >
              <div className="me-modal-head">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="me-modal-icon">
                    <MdWarning size={18} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      {t("emergencyModalTitle")}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                      {t("emergencySubtitle")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !sending && requestCloseModal()}
                  className="hh-close-btn"
                >
                  <MdClose size={16} />
                </button>
              </div>

              <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                {modalStage === "FORM" ? (
                  <>
                    {!checkingFlat && renderFlatSection()}

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {t("emergencyTypeLabel")} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {TYPES.map(({ key, label }) => {
                          const m = TYPE_META[key];
                          const isSelected = form.type === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              className="me-type-btn"
                              onClick={() => setForm((f) => ({ ...f, type: key }))}
                              style={{
                                borderColor: isSelected ? m.border : "var(--glass-border)",
                                background: isSelected ? m.bg : "var(--card-inner-bg)",
                              }}
                            >
                              <m.icon size={16} style={{ color: m.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? m.color : "var(--text-secondary)" }}>
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {form.type === "OTHER" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#ec4899", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {t("emergencyReasonOtherLabel")} <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <textarea
                          rows={3}
                          className="input"
                          placeholder={t("emergencyReasonOtherPlaceholder")}
                          value={form.other_reason}
                          onChange={(e) => setForm((f) => ({ ...f, other_reason: e.target.value }))}
                          style={{ minHeight: 85, fontSize: 13, padding: "10px 12px", borderRadius: 10, borderColor: "rgba(236,72,153,0.4)", resize: "vertical", lineHeight: 1.5 }}
                        />
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {t("emergencyMsgLabel")} ({t("emergencyOptional")})
                      </label>
                      <textarea
                        className="input"
                        rows={5}
                        placeholder={t("emergencyMsgPlaceholder") || "Provide additional details (e.g. Exact location, flat number, injured persons, immediate assistance needed)..."}
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        style={{ minHeight: 130, resize: "vertical", fontSize: 13.5, padding: "12px 14px", borderRadius: 10, lineHeight: 1.6 }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleProceedConfirm}
                      disabled={sending || (isOwner && myFlats.length > 1 && !selectedFlatId)}
                      className="btn-danger flex items-center justify-center gap-2"
                      style={{ width: "100%", height: 46 }}
                    >
                      <MdSend size={18} /> {t("emergencyReviewContinue")}
                    </button>
                  </>
                ) : (
                  /* ── CONFIRMATION STAGE ── */
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#ef4444" }}>
                        {t("emergencyConfirmTitle")}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                        {t("emergencyConfirmMsg")}
                      </p>
                    </div>

                    <div style={{ background: "var(--card-inner-bg)", padding: 12, borderRadius: 10, border: "1px solid var(--glass-border)", fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>{t("emergencyTypeLabel")}:</span>
                        <strong style={{ color: "var(--text-primary)" }}>{form.type}</strong>
                      </div>

                      {form.type === "OTHER" && form.other_reason && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-secondary)" }}>{t("emergencyReasonWord")}</span>
                          <strong style={{ color: "#ec4899" }}>{form.other_reason}</strong>
                        </div>
                      )}

                      {form.message && (
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>{t("emergencyNotesWord")}</span>
                          <p style={{ margin: 0, color: "var(--text-primary)", fontStyle: "italic" }}>"{form.message}"</p>
                        </div>
                      )}
                    </div>

                    <p style={{ margin: 0, fontSize: 11, color: "#f87171", textAlign: "center", fontWeight: 600 }}>
                      ⚠️ {t("emergencyAlertEveryone")}
                    </p>

                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setModalStage("FORM")}
                        disabled={sending}
                        className="btn-secondary"
                        style={{ flex: 1, height: 44, borderRadius: 10, fontWeight: 600 }}
                      >
                        {t("socBack")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending}
                        className="btn-danger flex items-center justify-center gap-2"
                        style={{ flex: 1, height: 44, borderRadius: 10, fontWeight: 800 }}
                      >
                        {sending ? (
                          <><Spinner size={16} /> {t("emergencySending")}</>
                        ) : (
                          <><MdSend size={18} /> {t("emergencyConfirmSend")}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </PortalModal>
      )}

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); setShowModal(false); }}
      />
    </div>
  );
}
