import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdApartment, MdAdd, MdDelete, MdSearch, MdClose,
  MdLinkOff, MdHome, MdPerson, MdCheckCircle, MdLock,
  MdChevronLeft, MdChevronRight, MdOutlineInbox,
  MdGridView, MdArrowForwardIos, MdLayers, MdHomeWork
} from "react-icons/md";
import Select from "../../components/common/Select";

/* ── helpers ── */
function Spinner({ size = 16 }) {
  return (
    <svg style={{ width: size, height: size, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function useDebounce(v, d = 450) {
  const [dv, setDv] = useState(v);
  useEffect(() => { const t = setTimeout(() => setDv(v), d); return () => clearTimeout(t); }, [v, d]);
  return dv;
}

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
      acc.push(p); return acc;
    }, []);
  return (
    <div className="pagination-wrap">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={15} /> Prev
      </button>
      {pages.map((p, i) => p === "..." ? (
        <span key={`e${i}`} className="pagination-ellipsis">…</span>
      ) : (
        <button key={p} onClick={() => onChange(p)}
          className={`pagination-page${p === page ? " pagination-page--active" : ""}`}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
}

/* ── utility: get society_id from JWT or localStorage ── */
function getSocietyId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.society_id;
  } catch { return null; }
}

/* ── utility: safe number parse — returns NaN if invalid ── */
function safeNum(val) {
  if (val == null || val === "") return NaN;
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? NaN : n;
}

/* ══════════════════════════════════════════════
  MAIN COMPONENT
══════════════════════════════════════════════ */
export default function ManageProperty() {
  const navigate  = useNavigate();
  const { t }     = useLang();
  const isMobile  = useIsMobile();
  const [tab, setTab] = useState("blocks");

  const TABS = [
    { key: "blocks",  label: t("mpTabBlocks") || "Blocks & Floors",  icon: MdGridView   },
    { key: "flats",   label: t("mpTabFlats") || "All Properties",    icon: MdApartment  },
    { key: "assign",  label: t("mpTabAssign") || "Assign Units",     icon: MdLinkOff    },
  ];

  return (
    <div className="page-root animate-fadeIn" style={{ maxWidth: 1050, margin: "0 auto" }}>
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="er-icon er-icon--amenity">
            <MdHome size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("mpTitle") || "Manage Property"}</h2>
            <p className="page-subtitle">{t("mpSubtitle") || "Manage blocks, properties, and assignments"}</p>
          </div>
        </div>
      </div>

      {/* ── Tab strip ── */}
      <div style={{
        display: "flex", gap: 4,
        background: "var(--card-inner-bg)",
        border: "1.5px solid var(--glass-border)",
        borderRadius: 16, padding: 5,
        boxShadow: "var(--shadow-sm)",
        overflowX: "auto",
      }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const on = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              style={{
                flex: 1, minWidth: isMobile ? 90 : "auto",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 7, padding: isMobile ? "9px 10px" : "9px 18px",
                borderRadius: 12, border: "none", cursor: "pointer",
                fontSize: isMobile ? 12 : 13, fontWeight: on ? 700 : 500,
                transition: "all 0.2s",
                background: on
                  ? "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
                  : "transparent",
                color: on ? "#fff" : "var(--text-secondary)",
                boxShadow: on ? "0 4px 16px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" : "none",
              }}>
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ── */}
      {tab === "blocks"  && <BlocksTab  isMobile={isMobile} t={t} />}
      {tab === "flats"   && <FlatsTab   isMobile={isMobile} t={t} />}
      {tab === "assign"  && <AssignTab  isMobile={isMobile} t={t} />}
    </div>
  );
}

/* ══════════════════════════════════════════════
  TAB 1 — BLOCKS
══════════════════════════════════════════════ */
function BlocksTab({ isMobile, t }) {
  const [blocks,        setBlocks]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [name,          setName]          = useState("");
  const [propertyType,  setPropertyType]  = useState("APARTMENT");
  const [floorCount,    setFloorCount]    = useState("");
  const [flatsPerFloor, setFlatsPerFloor] = useState("");
  const [totalHouses,   setTotalHouses]   = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [confirmId,     setConfirmId]     = useState(null);
  const [deletingId,    setDeletingId]    = useState(null);
  const [search,        setSearch]        = useState("");
  const [error,         setError]         = useState("");
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => { loadBlocks(); }, []);

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/blocks/${getSocietyId()}`);
      setBlocks(res.data || []);
    } catch { setError(t("mpFailedLoadBlocks") || "Failed to load blocks"); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    let payload = { name, society_id: getSocietyId(), property_type: propertyType };

    if (propertyType === "ROW_HOUSE") {
      if (!name || !totalHouses) return setError(t("mpFillAllFields") || "Fill all fields");
      payload.flats_per_floor = Number(totalHouses);
    } else {
      if (!name || !floorCount || !flatsPerFloor) return setError(t("mpFillAllFields") || "Fill all fields");
      payload.floor_count     = Number(floorCount);
      payload.flats_per_floor = Number(flatsPerFloor);
    }

    setSubmitting(true); setError("");
    try {
      await API.post("/blocks", payload);
      setName(""); setFloorCount(""); setFlatsPerFloor(""); setTotalHouses("");
      setPropertyType("APARTMENT");
      setShowForm(false);
      loadBlocks();
    } catch (err) { setError(err.response?.data?.message || "Failed to create block"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await API.delete(`/blocks/${id}`);
      setBlocks(p => p.filter(b => b.id !== id));
      setConfirmId(null);
      if (selectedBlock?.id === id) setSelectedBlock(null);
    } catch { setError(t("mpFailedDeleteBlock") || "Failed to delete block"); }
    finally { setDeletingId(null); }
  };

  const filtered = blocks.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* stat + add button row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div className="complaint-stat-card complaint-stat-total" style={{ padding: "10px 18px", borderRadius: 12, minWidth: 110 }}>
            <span className="complaint-stat-val" style={{ fontSize: 22 }}>{blocks.length}</span>
            <span className="complaint-stat-label">{t("mpTotalBlocks") || "Total Blocks"}</span>
          </div>
        </div>
        <button onClick={() => setShowForm(p => !p)} className="btn-primary">
          <MdAdd size={17} /> {showForm ? t("mpCloseForm") || "Close Form" : t("mpNewBlock") || "New Phase/Block"}
        </button>
      </div>

      {/* error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--stat-red-color)" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}><MdClose size={15} /></button>
        </div>
      )}

      {/* create form */}
      {showForm && (
        <div className="bg-card animate-scaleIn" style={{ padding: "20px 22px", borderRadius: 18, maxWidth: 800 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}><MdAdd size={17} /></div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t("mpCreateNewBlock") || "Create New Property Phase"}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Units will be auto-generated based on configuration.</p>
            </div>
          </div>

          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Name (e.g. Phase 1)</label>
              <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={{ height: 40 }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Type</label>
              <Select
                className="input"
                value={propertyType}
                onChange={e => {
                  setPropertyType(e.target.value);
                  setFloorCount(""); setFlatsPerFloor(""); setTotalHouses("");
                }}
                style={{ height: 40 }}
              >
                <option value="APARTMENT">Apartments / Flats</option>
                <option value="ROW_HOUSE">Row House / Villas</option>
                <option value="COMMERCIAL">Commercial</option>
              </Select>
            </div>

            {propertyType === "ROW_HOUSE" ? (
              <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Total Houses</label>
                <input className="input" type="number" min={1} placeholder="e.g. 20" value={totalHouses} onChange={e => setTotalHouses(e.target.value)} style={{ height: 40 }} />
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>No. of Floors</label>
                  <input className="input" type="number" min={1} placeholder="e.g. 5" value={floorCount} onChange={e => setFloorCount(e.target.value)} style={{ height: 40 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Units / Floor</label>
                  <input className="input" type="number" min={1} placeholder="e.g. 4" value={flatsPerFloor} onChange={e => setFlatsPerFloor(e.target.value)} style={{ height: 40 }} />
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" disabled={submitting} style={{ height: 40, opacity: submitting ? 0.65 : 1, whiteSpace: "nowrap", justifyContent: "center" }}>
              {submitting ? <Spinner size={14} /> : t("mpCreate") || "Create"}
            </button>
          </form>
        </div>
      )}

      {/* blocks list */}
      <div className="data-table-wrap">
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <MdSearch size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            <input className="input" style={{ paddingLeft: 32, height: 36, fontSize: 13 }} placeholder={t("mpSearchBlocks") || "Search blocks/phases..."} value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><MdClose size={13} /></button>}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            {filtered.length} {t("mpBlock") || "Phase"}{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdOutlineInbox size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>
              {search ? t("mpNoBlocksMatch") || "No properties match" : t("mpNoBlocksYet") || "No properties added"}
            </p>
          </div>
        ) : isMobile ? (
          /* mobile block cards */
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
            {filtered.map(b => {
              const isRowHouse = b.property_type === "ROW_HOUSE";
              const blockId = safeNum(b.id);
              return (
                <div key={b.id} className="inner-card animate-fadeIn" style={{ borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ height: 3, background: isRowHouse ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#2563eb,#7c3aed)" }} />
                  <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isRowHouse ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.12)", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(99,102,241,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: isRowHouse ? "#10b981" : "#818cf8", flexShrink: 0 }}>
                          {isRowHouse ? <MdHomeWork size={18} /> : <MdGridView size={18} />}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0 }}>{b.name}</p>
                          <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 6px", borderRadius: "4px", background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: isRowHouse ? "#10b981" : "#3b82f6", display: "inline-block", marginTop: 4 }}>
                            {b.property_type || "APARTMENT"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedBlock(selectedBlock?.id === b.id ? null : b)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.22)", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        {isRowHouse ? "Houses" : "Floors"} <MdArrowForwardIos size={10} style={{ transform: selectedBlock?.id === b.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                      </button>
                    </div>

                    {selectedBlock?.id === b.id && !isNaN(blockId) && (
                      isRowHouse
                        ? <InlineFlats blockId={blockId} isMobile={true} t={t} />
                        : <InlineFloors blockId={blockId} isMobile={true} t={t} />
                    )}

                    <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 8, display: "flex", justifyContent: "flex-end" }}>
                      {confirmId === b.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpDeleteBlock") || "Delete?"}</span>
                          <button onClick={() => handleDelete(b.id)} disabled={deletingId === b.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                            {deletingId === b.id ? <Spinner size={12} /> : t("mpYes") || "Yes"}
                          </button>
                          <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(b.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--stat-red-bg)", color: "var(--stat-red-color)", border: "1px solid var(--stat-red-border)", cursor: "pointer" }}>
                          <MdDelete size={14} /> {t("mpDelete") || "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* desktop block table */
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>{t("mpBlockName") || "Phase / Block"}</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>{t("mpActions") || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, idx) => {
                  const isRowHouse = b.property_type === "ROW_HOUSE";
                  const blockId = safeNum(b.id);
                  return (
                    <React.Fragment key={b.id}>
                      <tr>
                        <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: isRowHouse ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.12)", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(99,102,241,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: isRowHouse ? "#10b981" : "#818cf8", flexShrink: 0 }}>
                              {isRowHouse ? <MdHomeWork size={15} /> : <MdGridView size={15} />}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{b.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: "600", padding: "4px 8px", borderRadius: "6px", background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: isRowHouse ? "#10b981" : "#3b82f6" }}>
                            {b.property_type || "APARTMENT"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                            <button
                              onClick={() => setSelectedBlock(selectedBlock?.id === b.id ? null : b)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(59,130,246,0.10)", color: "var(--stat-blue-color,#93c5fd)", border: "1px solid rgba(59,130,246,0.22)", cursor: "pointer" }}
                            >
                              {isRowHouse ? <MdHomeWork size={13} /> : <MdLayers size={13} />}
                              {selectedBlock?.id === b.id ? "Hide" : (isRowHouse ? "Houses" : "Floors")}
                            </button>
                            {confirmId === b.id ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpSure") || "Sure?"}</span>
                                <button onClick={() => handleDelete(b.id)} disabled={deletingId === b.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                                  {deletingId === b.id ? <Spinner size={12} /> : t("mpYes") || "Yes"}
                                </button>
                                <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmId(b.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--stat-red-bg)", color: "var(--stat-red-color)", border: "1px solid var(--stat-red-border)", cursor: "pointer" }}>
                                <MdDelete size={13} /> {t("mpDelete") || "Delete"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {selectedBlock?.id === b.id && !isNaN(blockId) && (
                        <tr key={`expand-${b.id}`}>
                          <td colSpan={4} style={{ padding: "0 0 16px 48px", background: "rgba(255,255,255,0.015)" }}>
                            {isRowHouse
                              ? <InlineFlats blockId={blockId} isMobile={false} t={t} />
                              : <InlineFloors blockId={blockId} isMobile={false} t={t} />
                            }
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="table-footer">
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{filtered.length} {t("mpOf") || "of"} {blocks.length} Phases</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Inline Floors sub-panel (For Apartments / Commercial) ── */
function InlineFloors({ blockId, isMobile, t }) {
  const [floors,          setFloors]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState(null);

  const safeBlockId = safeNum(blockId);

  useEffect(() => {
    if (isNaN(safeBlockId) || safeBlockId <= 0) {
      setError("Missing or invalid block ID");
      setLoading(false);
      return;
    }
    API.get(`/floors/${safeBlockId}`)
      .then(r => setFloors(r.data || []))
      .catch(err => {
        console.error("InlineFloors fetch error:", err?.response?.status, err?.response?.data);
        setError(err?.response?.data?.message || "Failed to load floors");
      })
      .finally(() => setLoading(false));
  }, [safeBlockId]);

  if (loading) return <div style={{ padding: "14px 0" }}><Spinner size={15} /></div>;
  if (error)   return <p style={{ fontSize: 12, color: "var(--stat-red-color)", padding: "10px 0" }}>{error}</p>;
  if (!floors.length) return <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: "10px 0" }}>No floors found.</p>;

  return (
    <div style={{ marginTop: 10, padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Floors in this Block</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {floors.map(floor => {
          const floorId    = safeNum(floor.id);
          const isSelected = selectedFloorId === floor.id;
          return (
            <div key={floor.id ?? floor.floor_number}>
              <div
                onClick={() => setSelectedFloorId(isSelected ? null : floor.id)}
                style={{ padding: "8px 14px", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  <MdLayers size={14} style={{ display: "inline", marginRight: 6, color: "var(--accent)" }} />
                  Floor {floor.floor_number}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  {isSelected ? "Hide Units" : "View Units"}
                  <MdArrowForwardIos size={10} style={{ transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </span>
              </div>
              {/* ✅ Only render InlineFlats when BOTH blockId and floorId are valid numbers */}
              {isSelected && !isNaN(safeBlockId) && safeBlockId > 0 && !isNaN(floorId) && floorId > 0 && (
                <InlineFlats blockId={safeBlockId} floorId={floorId} isMobile={isMobile} t={t} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Inline flats sub-panel (Universal: floors + row houses) ── */
function InlineFlats({ floorId, blockId, isMobile, t }) {
  const [flats,      setFlats]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [confirmId,  setConfirmId]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error,      setError]      = useState("");

  useEffect(() => {
    const safeBlockId = safeNum(blockId);
    const safeFloorId = safeNum(floorId);

    // ✅ Hard stop — never fire the API call with an invalid blockId
    if (isNaN(safeBlockId) || safeBlockId <= 0) {
      setError("Missing or invalid block ID");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("blockId", safeBlockId);

    // Only attach floorId when it is a valid positive number
    if (!isNaN(safeFloorId) && safeFloorId > 0) {
      params.set("floorId", safeFloorId);
    }

    API.get(`/flats/list?${params.toString()}`)
      .then(r => setFlats(r.data || []))
      .catch((err) => {
        console.error("InlineFlats fetch error:", err?.response?.status, err?.response?.data);
        setError(err?.response?.data?.message || t("mpFailedLoadFlats") || "Failed to load units");
      })
      .finally(() => setLoading(false));
  }, [floorId, blockId]);

  const deleteFlat = async (id) => {
    setDeletingId(id);
    try {
      await API.delete(`/flats/delete/${id}`);
      setFlats(p => p.filter(f => f.id !== id));
      setConfirmId(null);
    } catch (err) { setError(err?.response?.data?.message || t("mpDeleteFailed") || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const isRowHouseContext = !floorId;

  if (loading) return <div style={{ padding: "14px 0", marginLeft: isRowHouseContext ? 0 : 10 }}><Spinner size={15} /></div>;
  if (error)   return <p style={{ fontSize: 12, color: "var(--stat-red-color)", padding: "10px 0", marginLeft: isRowHouseContext ? 0 : 10 }}>{error}</p>;
  if (!flats.length) return <p style={{ fontSize: 12, color: "var(--text-secondary)", padding: "10px 0", marginLeft: isRowHouseContext ? 0 : 10 }}>No units found.</p>;

  return (
    <div style={{
      marginTop: 8,
      marginLeft: (isMobile || isRowHouseContext) ? 0 : 20,
      background: isRowHouseContext ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
      border: isRowHouseContext ? "1px solid var(--glass-border)" : "1px dashed var(--glass-border)",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{ padding: "8px 14px", borderBottom: isRowHouseContext ? "1px solid var(--glass-border)" : "1px dashed var(--glass-border)", display: "flex", alignItems: "center", gap: 7 }}>
        {isRowHouseContext
          ? <MdHomeWork size={13} style={{ color: "#10b981" }} />
          : <MdApartment size={13} style={{ color: "var(--stat-blue-color,#93c5fd)" }} />
        }
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
          {flats.length} {isRowHouseContext ? "House" : "Unit"}{flats.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(160px,1fr))", gap: 8, padding: 10 }}>
        {flats.map(f => {
          const occupied = !!f.resident_id;
          return (
            <div key={f.id} style={{ background: "var(--card-bg)", border: `1px solid ${occupied ? "rgba(34,197,94,0.22)" : "var(--glass-border)"}`, borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {isRowHouseContext
                  ? <MdHomeWork size={13} style={{ color: occupied ? "var(--stat-green-color,#86efac)" : "var(--text-secondary)" }} />
                  : <MdApartment size={13} style={{ color: occupied ? "var(--stat-green-color,#86efac)" : "var(--text-secondary)" }} />
                }
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{f.flat_number}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, background: occupied ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.10)", color: occupied ? "var(--stat-green-color,#86efac)" : "var(--text-secondary)", border: `1px solid ${occupied ? "rgba(34,197,94,0.22)" : "rgba(100,116,139,0.15)"}` }}>
                  {occupied ? t("mpOcc") || "Occ" : t("mpVac") || "Vac"}
                </span>
              </div>
              {confirmId === f.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => deleteFlat(f.id)} disabled={deletingId === f.id} style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                    {deletingId === f.id ? <Spinner size={10} /> : t("mpYes") || "Yes"}
                  </button>
                  <button onClick={() => setConfirmId(null)} style={{ padding: "2px 6px", borderRadius: 5, fontSize: 10, background: "var(--card-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--stat-red-color,#fca5a5)", display: "flex", padding: 2 }}><MdDelete size={14} /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
  TAB 2 — ALL FLATS
══════════════════════════════════════════════ */
function FlatsTab({ isMobile, t }) {
  const [flats,        setFlats]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [confirmId,    setConfirmId]    = useState(null);
  const [deletingId,   setDeletingId]   = useState(null);
  const [error,        setError]        = useState("");

  useEffect(() => { loadFlats(); }, []);

  const loadFlats = async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/flats/getall");
      setFlats(res.data || []);
    } catch { setError(t("mpFailedLoadFlats") || "Failed to load flats"); }
    finally { setLoading(false); }
  };

  const deleteFlat = async (id) => {
    setDeletingId(id); setError("");
    try {
      await API.delete(`/flats/delete/${id}`);
      setFlats(p => p.filter(f => f.id !== id));
      setConfirmId(null);
    } catch (err) { setError(err?.response?.data?.message || t("mpDeleteFailed") || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const counts = {
    ALL:      flats.length,
    OCCUPIED: flats.filter(f => !!f.resident_id).length,
    VACANT:   flats.filter(f => !f.resident_id).length,
  };

  const filtered = flats.filter(f => {
    const q = search.toLowerCase();
    const blockName = f.Block?.name || f.Floor?.Block?.name || "";
    const ms = f.flat_number?.toLowerCase().includes(q) || blockName.toLowerCase().includes(q);
    const mf = filterStatus === "ALL" ? true : filterStatus === "OCCUPIED" ? !!f.resident_id : !f.resident_id;
    return ms && mf;
  });

  const FILTER_TABS = [
    { key: "ALL",      label: t("mpAll") || "All",           color: "#4f46e5" },
    { key: "OCCUPIED", label: t("mpOccupied") || "Occupied", color: "#16a34a" },
    { key: "VACANT",   label: t("mpVacant") || "Vacant",     color: "#d97706" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: isMobile ? 8 : 12 }}>
          {[
            { label: t("mpTotal") || "Total",       val: counts.ALL,      cls: "complaint-stat-total"    },
            { label: t("mpOccupied") || "Occupied",  val: counts.OCCUPIED, cls: "complaint-stat-resolved" },
            { label: t("mpVacant") || "Vacant",      val: counts.VACANT,   cls: "complaint-stat-pending"  },
          ].map(s => (
            <div key={s.label} className={`complaint-stat-card ${s.cls}`} style={{ padding: isMobile ? "10px 12px" : "12px 16px", borderRadius: 14 }}>
              <span className="complaint-stat-val" style={{ fontSize: isMobile ? 20 : 24 }}>{s.val}</span>
              <span className="complaint-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "var(--stat-red-color)" }}>
          {error}
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}><MdClose size={15} /></button>
        </div>
      )}

      <div className="data-table-wrap">
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
              <MdSearch size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
              <input className="input" style={{ paddingLeft: 32, height: 36, fontSize: 13 }} placeholder={t("mpSearchFlatBlock") || "Search property..."} value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><MdClose size={13} /></button>}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{filtered.length} Units</span>
          </div>
          <div style={{ display: "flex", gap: 4, background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: 4 }}>
            {FILTER_TABS.map(tab => {
              const on = filterStatus === tab.key;
              return (
                <button key={tab.key} onClick={() => setFilterStatus(tab.key)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 500, transition: "all 0.18s", background: on ? tab.color : "transparent", color: on ? "#fff" : "var(--text-secondary)", boxShadow: on ? "0 2px 8px rgba(0,0,0,0.22)" : "none" }}>
                  {tab.label}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 999, lineHeight: 1.6, background: on ? "rgba(255,255,255,0.22)" : "var(--glass-border)", color: on ? "#fff" : "var(--text-secondary)" }}>{counts[tab.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdOutlineInbox size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>
              {search || filterStatus !== "ALL" ? (t("mpNoFlatsMatchFilter") || "No properties match") : (t("mpNoFlatsFound") || "No properties found")}
            </p>
          </div>
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 12 }}>
            {filtered.map((f, idx) => {
              const occ = !!f.resident_id;
              const isRowHouse = !f.Floor && f.Block;
              const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : "—");
              return (
                <div key={f.id} className="inner-card animate-fadeIn" style={{ animationDelay: `${idx * 25}ms`, borderRadius: 13, overflow: "hidden" }}>
                  <div style={{ height: 3, background: occ ? "#22c55e" : "#f59e0b" }} />
                  <div style={{ padding: "11px 13px", display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: occ ? "var(--stat-green-bg)" : "var(--stat-amber-bg)", border: `1px solid ${occ ? "var(--stat-green-border)" : "var(--stat-amber-border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isRowHouse
                        ? <MdHomeWork size={17} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                        : <MdApartment size={17} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", margin: 0 }}>{f.flat_number}</p>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "1px 0 0" }}>
                        {f.Floor ? `Fl. ${f.Floor.floor_number} • Blk. ${blockName}` : `Blk. ${blockName}`} · {occ ? (t("mpOccupied") || "Occupied") : (t("mpVacant") || "Vacant")}
                      </p>
                    </div>
                    {confirmId === f.id ? (
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                        <button onClick={() => deleteFlat(f.id)} disabled={deletingId === f.id} style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                          {deletingId === f.id ? <Spinner size={11} /> : (t("mpYes") || "Yes")}
                        </button>
                        <button onClick={() => setConfirmId(null)} style={{ padding: "4px 7px", borderRadius: 6, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(f.id)} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)", color: "var(--stat-red-color)", cursor: "pointer" }}><MdDelete size={14} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Unit</th>
                  <th>Location</th>
                  <th>{t("mpStatus") || "Status"}</th>
                  <th style={{ textAlign: "right" }}>{t("mpAction") || "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, idx) => {
                  const occ = !!f.resident_id;
                  const isRowHouse = !f.Floor && f.Block;
                  const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : "—");
                  return (
                    <tr key={f.id}>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: occ ? "var(--stat-green-bg)" : "var(--stat-amber-bg)", border: `1px solid ${occ ? "var(--stat-green-border)" : "var(--stat-amber-border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isRowHouse
                              ? <MdHomeWork size={15} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                              : <MdApartment size={15} style={{ color: occ ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                            }
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{f.flat_number}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Block {blockName}</span>
                          {!isRowHouse && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Floor {f.Floor?.floor_number}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={occ ? "status-pill status-pill--resolved" : "status-pill status-pill--pending"}>
                          {occ ? <MdCheckCircle size={11} /> : <MdLock size={11} />}
                          {occ ? (t("mpOccupied") || "Occupied") : (t("mpVacant") || "Vacant")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {confirmId === f.id ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpSure") || "Sure?"}</span>
                            <button onClick={() => deleteFlat(f.id)} disabled={deletingId === f.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer" }}>
                              {deletingId === f.id ? <Spinner size={12} /> : (t("mpYes") || "Yes")}
                            </button>
                            <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmId(f.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--stat-red-bg)", color: "var(--stat-red-color)", border: "1px solid var(--stat-red-border)", cursor: "pointer" }}>
                            <MdDelete size={13} /> {t("mpDelete") || "Delete"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-footer">
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{filtered.length} {t("mpOf") || "of"} {flats.length} Units</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
  TAB 3 — ASSIGN FLATS
══════════════════════════════════════════════ */
const LIMIT = 10;

function AssignTab({ isMobile, t }) {
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flats,      setFlats]      = useState([]);
  const [residents,  setResidents]  = useState([]);
  const [flatSearch, setFlatSearch] = useState("");
  const [flatId,     setFlatId]     = useState("");
  const [residentId, setResidentId] = useState("");

  const [assigned,   setAssigned]   = useState([]);
  const [totalAll,   setTotalAll]   = useState(0);
  const [initLoad,   setInitLoad]   = useState(true);
  const [fetching,   setFetching]   = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search,     setSearch]     = useState("");
  const dSearch                     = useDebounce(search, 450);
  const [confirmId,  setConfirmId]  = useState(null);

  const loadDropdowns = async () => {
    try {
      const [uf, ur] = await Promise.all([
        API.get("/flats/unassigned"),
        API.get("/users/resident/unassigned"),
      ]);
      setFlats(uf.data || []);
      setResidents(ur.data || []);
    } catch {}
  };

  const loadAssigned = useCallback(async (pg, q, init = false) => {
    if (init) setInitLoad(true); else setFetching(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT, ...(q ? { search: q } : {}) });
      const res = await API.get(`/flats/assigned?${params}`);
      setAssigned(res.data.data || []);
      setTotalAll(res.data.totalAll ?? res.data.pagination.totalItems);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pg);
    } catch {}
    finally { setInitLoad(false); setFetching(false); }
  }, []);

  useEffect(() => { loadDropdowns(); loadAssigned(1, "", true); }, []);
  useEffect(() => { if (!initLoad) loadAssigned(1, dSearch); }, [dSearch]);

  const handleAssign = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await API.put(`/flats/assign/${flatId}`, { resident_id: residentId });
      setFlatId(""); setResidentId(""); setFlatSearch(""); setShowForm(false);
      loadDropdowns(); loadAssigned(1, dSearch);
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleUnassign = async (id) => {
    try {
      await API.put(`/flats/unassign/${id}`);
      setConfirmId(null); loadDropdowns();
      const np = assigned.length === 1 && page > 1 ? page - 1 : page;
      loadAssigned(np, dSearch);
    } catch { setConfirmId(null); }
  };

  const filteredDropdown = flats.filter(f => {
    const searchLow = flatSearch.toLowerCase();
    const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : "");
    return f.flat_number.toString().toLowerCase().includes(searchLow) || blockName.toLowerCase().includes(searchLow);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          {initLoad ? "—" : totalAll} Units {t("mpCurrentlyAssigned") || "currently assigned"}
        </p>
        <button onClick={() => setShowForm(p => !p)} className="btn-primary">
          <MdAdd size={17} /> {showForm ? (t("mpCloseForm") || "Close") : "Assign Unit"}
        </button>
      </div>

      {showForm && (
        <div className="bg-card animate-scaleIn" style={{ padding: "20px 22px", borderRadius: 18, maxWidth: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}><MdAdd size={17} /></div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t("mpAssignResident") || "Assign Resident"}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{t("mpOnlyUnassigned") || "Only unassigned units are shown"}</p>
            </div>
          </div>
          <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Search Unit</label>
              <input className="input" style={{ height: 40 }} placeholder="Search e.g. 101 or Phase A" value={flatSearch} onChange={e => setFlatSearch(e.target.value)} />
            </div>
            <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Select Unit</label>
                <Select className="input" style={{ height: 40 }} value={flatId} onChange={e => setFlatId(e.target.value)} required>
                  <option value="">Choose Unit...</option>
                  {filteredDropdown.map(f => {
                    const blockName = f.Block?.name || (f.Floor ? f.Floor.Block?.name : "Unknown");
                    return <option key={f.id} value={f.id}>{f.flat_number} (Blk {blockName})</option>;
                  })}
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{t("mpSelectResident") || "Select Resident"}</label>
                <Select className="input" style={{ height: 40 }} value={residentId} onChange={e => setResidentId(e.target.value)} required>
                  <option value="">{t("mpChooseResident") || "Choose Resident..."}</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1, justifyContent: "center", opacity: submitting ? 0.65 : 1 }}>
                {submitting ? <Spinner size={14} /> : (t("mpAssign") || "Assign")}
              </button>
              <button type="button" className="btn-muted" onClick={() => setShowForm(false)}>{t("mpCancel") || "Cancel"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="data-table-wrap">
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", flex: 1, minWidth: 120 }}>
            {initLoad ? "—" : `${totalItems} ${t("mpAssigned") || "assigned"}`}
            {search && ` matching "${search}"`}
          </p>
          <div style={{ position: "relative", width: isMobile ? "100%" : 240 }}>
            <MdSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            <input className="input" style={{ paddingLeft: 30, paddingRight: search ? 30 : 10, height: 36, fontSize: 13, width: "100%" }} placeholder={t("mpSearchResidentFlat") || "Search resident or unit..."} value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
              {fetching ? <Spinner size={13} /> : search ? (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}><MdClose size={13} /></button>
              ) : null}
            </div>
          </div>
        </div>

        {initLoad ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}><Spinner /></div>
        ) : totalAll === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdHome size={40} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>No units assigned yet</p>
          </div>
        ) : assigned.length === 0 && !fetching ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <MdSearch size={36} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>{t("mpNoMatches") || "No matches"}</p>
            <button onClick={() => setSearch("")} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>{t("mpClearSearch") || "Clear search"}</button>
          </div>
        ) : isMobile ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {assigned.map(flat => {
              const isRowHouse = !flat.Floor && flat.Block;
              const blockName  = flat.Block?.name || (flat.Floor ? flat.Floor.Block?.name : "—");
              return (
                <div key={flat.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.10)", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(59,130,246,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isRowHouse
                        ? <MdHomeWork size={18} style={{ color: "#10b981" }} />
                        : <MdHome size={18} style={{ color: "#60a5fa" }} />
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", margin: 0 }}>{flat.flat_number}</p>
                      <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: 0, opacity: 0.8 }}>
                        {flat.Floor ? `Fl. ${flat.Floor.floor_number} • Blk. ${blockName}` : `Blk. ${blockName}`}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <MdPerson size={11} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flat.User?.name || "—"}</p>
                      </div>
                    </div>
                  </div>
                  {confirmId === flat.id ? (
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                      <button onClick={() => handleUnassign(flat.id)} style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>{t("mpYes") || "Yes"}</button>
                      <button onClick={() => setConfirmId(null)} style={{ padding: "4px 7px", borderRadius: 6, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(flat.id)} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", cursor: "pointer" }}>
                      <MdLinkOff size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Unit</th>
                <th>{t("mpResident") || "Resident"}</th>
                <th style={{ textAlign: "right" }}>{t("mpAction") || "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((flat, idx) => {
                const isRowHouse = !flat.Floor && flat.Block;
                const blockName  = flat.Block?.name || (flat.Floor ? flat.Floor.Block?.name : "—");
                return (
                  <tr key={flat.id}>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{(page - 1) * LIMIT + idx + 1}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: isRowHouse ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.10)", color: isRowHouse ? "#10b981" : "#60a5fa", border: isRowHouse ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(59,130,246,0.22)" }}>
                        {isRowHouse ? <MdHomeWork size={13} /> : <MdHome size={13} />} {flat.flat_number}
                      </span>
                      <p className="text-xs text-secondary mt-1 ml-1" style={{ opacity: 0.8, fontSize: 11 }}>
                        {flat.Floor ? `Floor ${flat.Floor.floor_number} • Block ${blockName}` : `Block ${blockName}`}
                      </p>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#818cf8", flexShrink: 0 }}>
                          {flat.User?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{flat.User?.name || "—"}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {confirmId === flat.id ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("mpSure") || "Sure?"}</span>
                          <button onClick={() => handleUnassign(flat.id)} style={{ padding: "4px 11px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer" }}>{t("mpYes") || "Yes"}</button>
                          <button onClick={() => setConfirmId(null)} style={{ padding: "4px 9px", borderRadius: 7, fontSize: 11, background: "var(--card-inner-bg)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)", cursor: "pointer" }}>{t("mpCancel") || "Cancel"}</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmId(flat.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)", cursor: "pointer" }}>
                          <MdLinkOff size={13} /> {t("mpUnassign") || "Unassign"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!initLoad && assigned.length > 0 && (
          <div style={{ borderTop: "1px solid var(--glass-border)", padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{t("mpShowing") || "Showing"} {assigned.length} {t("mpOf") || "of"} {totalItems}</p>
            <Pagination page={page} totalPages={totalPages} onChange={p => loadAssigned(p, dSearch)} />
          </div>
        )}
      </div>
    </div>
  );
}