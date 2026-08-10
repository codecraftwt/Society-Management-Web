

import { useEffect, useState, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import {
  MdWarning, MdLocalFireDepartment, MdLocalHospital,
  MdSecurity, MdHelp, MdAdd, MdClose, MdSend,
  MdChevronLeft, MdChevronRight, MdHome,
} from "react-icons/md";
import { toast } from "react-toastify";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import Select from "../../components/common/Select";

/* ── Type meta ── */
const TYPE_META = {
  FIRE:         { icon: MdLocalFireDepartment, color: "#ef4444", bg: "rgba(239,68,68,0.12)",    border: "rgba(239,68,68,0.25)"    },
  MEDICAL:      { icon: MdLocalHospital,       color: "#f59e0b", bg: "rgba(245,158,11,0.12)",   border: "rgba(245,158,11,0.25)"   },
  SECURITY:     { icon: MdSecurity,            color: "#3b82f6", bg: "rgba(59,130,246,0.12)",   border: "rgba(59,130,246,0.25)"   },
  OTHER:        { icon: MdHelp,                color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",   border: "rgba(139,92,246,0.25)"   },
  RESIDENT_SOS: { icon: MdWarning,             color: "#ef4444", bg: "rgba(239,68,68,0.12)",    border: "rgba(239,68,68,0.25)"    },
};

const fmt = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const TABS = [
  { key: "",         label: "All"      },
  { key: "ACTIVE",   label: "Active"   },
  { key: "RESOLVED", label: "Resolved" },
];

const LIMIT = 10;

/* ── Portal ── */
function PortalModal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* ── Pagination ── */
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="pagination-wrap" style={{ marginTop: 0 }}>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={14} /> Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={14} />
      </button>
    </div>
  );
}

/* ── Spinner ── */
function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: "2px solid rgba(239,68,68,0.20)",
      borderTopColor: "#ef4444",
      animation: "spin 0.65s linear infinite",
    }} />
  );
}

/* ── Helpers: flat label builders (same as MyCollection / ResidentComplaints) ── */
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
  const { t }              = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [alerts,      setAlerts]      = useState([]);
  const [pagination,  setPagination]  = useState(null);
  const [page,        setPage]        = useState(1);
  const [activeTab,   setActiveTab]   = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching,    setFetching]    = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [sending,     setSending]     = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);

  const [form, setForm] = useState({ type: "FIRE", message: "" });

  // ── Flat / unit state ──
  const [myFlats,        setMyFlats]        = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [checkingFlat,   setCheckingFlat]   = useState(true);

  const isOwner = authUser?.resident_type === "OWNER";

  /* ── Responsive ── */
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  /* ── Fetch flats (same dual-attempt as ResidentComplaints) ── */
  useEffect(() => {
    if (!authUser?.id) return;

    const fetchProperties = async () => {
      try {
        let flatsArr = [];

        // Attempt 1: memberships endpoint
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

        // Attempt 2: get-flat fallback
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

        // Auto-select first flat
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

  // Auto-select when single flat
  useEffect(() => {
    if (isOwner && myFlats.length === 1) {
      const first = myFlats[0];
      const fId   = first.flat_id || first.id || first.Flat?.id;
      if (fId) setSelectedFlatId(String(fId));
    }
  }, [isOwner, myFlats]);

  /* ── Load alerts ── */
  const load = useCallback(async (pg, tabStatus, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (tabStatus) params.append("status", tabStatus);
      const res = await API.get(`/emergency/mine?${params}`);
      setAlerts(Array.isArray(res.data.data) ? res.data.data : []);
      setPagination(res.data.pagination || null);
      setPage(pg);
    } catch {
      setAlerts([]);
      setPagination(null);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { load(1, "", true); }, []);

  const handleTabChange  = (key) => { setActiveTab(key); load(1, key); };
  const handlePageChange = (pg)  => load(pg, activeTab);

  /* ── Send emergency ── */
  const handleSend = async () => {
    if (sending) return;

    // Owners with multiple flats must pick one
    if (isOwner && myFlats.length > 1 && !selectedFlatId) {
      toast.error("Please select a unit for this emergency.");
      return;
    }

    try {
      setSending(true);

      const payload = { type: form.type, message: form.message };

      // Pass flat_id when owner has selected a specific unit
      if (isOwner && selectedFlatId) {
        payload.flat_id = selectedFlatId;
      }

      await API.post("/emergency", payload);
      toast.success(t("emergencySentSuccess"));
      setShowModal(false);
      setForm({ type: "FIRE", message: "" });

      // Reset selection to first flat for next time
      if (isOwner && myFlats.length > 1) setSelectedFlatId("");

      load(page, activeTab);
    } catch {
      toast.error(t("emergencySentFail"));
    } finally {
      setSending(false);
    }
  };

  const renderAlertMeta = (a) => {
    const meta = TYPE_META[a.type] || TYPE_META.OTHER;
    return { meta, Icon: meta.icon, isActive: a.status === "ACTIVE" };
  };

  const totalItems = pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  /* ── Tab style ── */
  const tabStyle = (key) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 16px", borderRadius: 10, cursor: "pointer",
    fontSize: 13, fontWeight: 600, border: "1px solid",
    transition: "all 0.18s",
    ...(activeTab === key ? {
      background: key === "ACTIVE"   ? "rgba(239,68,68,0.15)"
                : key === "RESOLVED" ? "rgba(34,197,94,0.15)"
                :                      "rgba(99,102,241,0.15)",
      borderColor: key === "ACTIVE"   ? "rgba(239,68,68,0.40)"
                 : key === "RESOLVED" ? "rgba(34,197,94,0.40)"
                 :                      "rgba(99,102,241,0.40)",
      color: key === "ACTIVE"   ? "var(--stat-red-color)"
           : key === "RESOLVED" ? "var(--stat-green-color)"
           :                      "var(--stat-purple-color)",
    } : {
      background: "rgba(255,255,255,0.03)",
      borderColor: "var(--glass-border)",
      color: "var(--text-secondary)",
    }),
  });

  const TYPES = [
    { key: "FIRE",     label: t("emergencyTypeFire")     },
    { key: "MEDICAL",  label: t("emergencyTypeMedical")  },
    { key: "SECURITY", label: t("emergencyTypeSecurity") },
    { key: "OTHER",    label: t("emergencyTypeOther")    },
  ];

  /* ── Flat selector / info section for modal ── */
  const renderFlatSection = () => {
    // Tenant or family member with single flat — show read-only chip
    if (myFlats.length === 1) {
      return (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 12,
          background: "var(--card-inner-bg)",
          border: "1px solid var(--glass-border)",
          fontSize: 13, color: "var(--text-secondary)",
        }}>
          <MdHome size={15} style={{ color: "#ef4444", flexShrink: 0 }} />
          <span>
            Unit:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {buildFlatLabel(myFlats[0])}
            </strong>
          </span>
        </div>
      );
    }

    // Owner with multiple flats — show dropdown
    if (isOwner && myFlats.length > 1) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <MdHome size={12} /> Select Unit{" "}
            <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <Select
            className="input"
            style={{ height: 44, width: "100%", cursor: "pointer", fontSize: 13 }}
            value={selectedFlatId}
            onChange={(e) => setSelectedFlatId(e.target.value)}
            required
          >
            <option value="" disabled>-- Choose the affected unit --</option>
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

    // No flats found (still loading or no association) — show nothing
    return null;
  };

  return (
    <div className="page-root" style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.28)", color: "#ef4444",
          }}>
            <MdWarning size={24} />
          </div>
          <div>
            <h2 className="page-title" style={{ margin: 0 }}>{t("emergencyTitle")}</h2>
            <p className="page-subtitle" style={{ margin: "3px 0 0" }}>{t("emergencySubtitle")}</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 12,
            background: "linear-gradient(135deg,#dc2626,#ef4444)",
            color: "#fff", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700,
            boxShadow: "0 4px 16px rgba(220,38,38,0.35)",
          }}
        >
          <MdAdd size={18} /> {t("emergencyRaiseBtn")}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => handleTabChange(key)} style={tabStyle(key)}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
              background: activeTab === key
                ? key === "ACTIVE" ? "#ef4444" : key === "RESOLVED" ? "#22c55e" : "#6366f1"
                : "var(--text-secondary)",
              opacity: activeTab === key ? 1 : 0.4,
            }} />
            {label}
            {activeTab === key && pagination && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: "rgba(255,255,255,0.08)",
                padding: "1px 6px", borderRadius: 999,
              }}>
                {totalItems}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {initialLoad ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: 10, color: "var(--text-secondary)", fontSize: 14 }}>
          <Spinner /> {t("loadingProfile")}
        </div>
      ) : alerts.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "3.5rem 1rem",
          borderRadius: 14, border: "1.5px dashed var(--glass-border)", gap: 8,
        }}>
          <MdWarning size={36} style={{ color: "var(--text-secondary)", opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-secondary)" }}>
            {t("emergencyEmpty")}
          </p>
        </div>
      ) : isMobile ? (

        /* ── Mobile cards ── */
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map((a) => {
              const { meta, Icon, isActive } = renderAlertMeta(a);
              // Build flat label from embedded Flat association if present
              const flatLabel = a.Flat ? buildFlatLabel({ Flat: a.Flat }) : null;
              return (
                <div key={a.id} style={{
                  background: "var(--card-bg)", border: "1px solid var(--glass-border)",
                  borderRadius: 16, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 10,
                  opacity: fetching ? 0.5 : 1, transition: "opacity 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: meta.bg, border: `1px solid ${meta.border}` }}>
                        <Icon size={18} style={{ color: meta.color }} />
                      </div>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{a.type}</span>
                        {/* ── Flat chip ── */}
                        {flatLabel && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "2px 8px", borderRadius: 999,
                              fontSize: 10, fontWeight: 600,
                              background: "rgba(239,68,68,0.10)",
                              color: "#ef4444",
                              border: "1px solid rgba(239,68,68,0.22)",
                            }}>
                              <MdHome size={10} /> {flatLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{
                      padding: "4px 10px", borderRadius: 999,
                      fontSize: 11, fontWeight: 700, border: "1px solid",
                      background: isActive ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                      color: isActive ? "var(--stat-red-color)" : "var(--stat-green-color)",
                      borderColor: isActive ? "rgba(239,68,68,0.28)" : "rgba(34,197,94,0.28)",
                    }}>
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
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </>

      ) : (

        /* ── Desktop table ── */
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--glass-border)",
          borderRadius: 16, overflow: "hidden",
          opacity: fetching ? 0.5 : 1, transition: "opacity 0.2s",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--glass-border)" }}>
                {[t("emergencyColType"), "Unit", t("emergencyColMessage"), t("emergencyColStatus"), t("emergencyColTime")].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const { meta, Icon, isActive } = renderAlertMeta(a);
                const flatLabel = a.Flat ? buildFlatLabel({ Flat: a.Flat }) : null;
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: meta.bg, border: `1px solid ${meta.border}` }}>
                          <Icon size={16} style={{ color: meta.color }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{a.type}</span>
                      </div>
                    </td>
                    {/* ── Unit column ── */}
                    <td style={{ padding: "13px 16px" }}>
                      {flatLabel ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 9px", borderRadius: 999,
                          fontSize: 11, fontWeight: 600,
                          background: "rgba(239,68,68,0.10)",
                          color: "#ef4444",
                          border: "1px solid rgba(239,68,68,0.22)",
                          whiteSpace: "nowrap",
                        }}>
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
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 11px", borderRadius: 999,
                        fontSize: 11, fontWeight: 700, border: "1px solid",
                        background: isActive ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                        color: isActive ? "var(--stat-red-color)" : "var(--stat-green-color)",
                        borderColor: isActive ? "rgba(239,68,68,0.28)" : "rgba(34,197,94,0.28)",
                      }}>
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

          {/* Table footer */}
          <div className="table-footer" style={{ flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Showing{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalItems)}
              </strong>{" "}
              of <strong style={{ color: "var(--text-primary)" }}>{totalItems}</strong> alerts
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      )}

      {/* ── Raise Emergency Modal ── */}
      {showModal && (
        <PortalModal>
          <div
            onClick={() => !sending && setShowModal(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1100,
              background: "var(--overlay-bg)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 460,
                background: "var(--card-bg)",
                border: "1.5px solid var(--glass-border)",
                borderRadius: 20,
                boxShadow: "var(--shadow-glass)",
                overflow: "hidden",
                animation: "scaleIn 0.22s ease",
              }}
            >
              {/* Modal header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 22px",
                borderBottom: "1px solid var(--glass-border)",
                background: "rgba(239,68,68,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                    color: "#ef4444",
                  }}>
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
                  onClick={() => !sending && setShowModal(false)}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)", cursor: "pointer",
                  }}
                >
                  <MdClose size={16} />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* ── Flat selector / info ── */}
                {!checkingFlat && renderFlatSection()}

                {/* Type selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {t("emergencyTypeLabel")}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {TYPES.map(({ key, label }) => {
                      const m = TYPE_META[key];
                      const isSelected = form.type === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setForm((f) => ({ ...f, type: key }))}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "10px 12px", borderRadius: 10,
                            border: `1.5px solid ${isSelected ? m.border : "var(--glass-border)"}`,
                            background: isSelected ? m.bg : "rgba(255,255,255,0.03)",
                            cursor: "pointer", transition: "all 0.18s",
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

                {/* Message */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {t("emergencyMsgLabel")}
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder={t("emergencyMsgPlaceholder")}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    style={{ resize: "none", fontSize: 13, padding: "10px 12px" }}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={sending || (isOwner && myFlats.length > 1 && !selectedFlatId)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", height: 46, borderRadius: 12, border: "none",
                    cursor: (sending || (isOwner && myFlats.length > 1 && !selectedFlatId)) ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 700, color: "#fff",
                    background: "linear-gradient(135deg,#dc2626,#ef4444)",
                    boxShadow: "0 4px 16px rgba(220,38,38,0.30)",
                    opacity: (sending || (isOwner && myFlats.length > 1 && !selectedFlatId)) ? 0.55 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {sending ? (
                    <><Spinner size={16} /> {t("emergencySending")}</>
                  ) : (
                    <><MdSend size={18} /> {t("emergencySendBtn")}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}