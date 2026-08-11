

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../services/api";
import {
  MdApartment, MdArrowBack, MdDelete, MdCheckCircle,
  MdSearch, MdClose, MdPerson, MdLock,
  MdOutlineInbox,
} from "react-icons/md";

function Spinner({ small = false }) {
  const s = small ? 14 : 16;
  return (
    <svg className="animate-spin" style={{ width: s, height: s, color: "currentColor" }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

export default function Flats() {
  const { blockId } = useParams();
  const navigate    = useNavigate();
  const isMobile    = useIsMobile();

  const [flats,         setFlats]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [deletingId,    setDeletingId]    = useState(null);
  const [confirmId,     setConfirmId]     = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("ALL");
  const { floorId } = useParams();

  useEffect(() => { loadFlats(); }, []);

  // const loadFlats = async () => {
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const res = await API.get(`/flats/${blockId}`);
  //     setFlats(res.data || []);
  //   } catch {
  const loadFlats = async () => {
  setLoading(true);
  setError("");
  try {
    const res = await API.get(`/flats/floor/${floorId}`); // <-- UPDATED
    setFlats(res.data || []);
  } catch {
      setError("Failed to load flats. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteFlat = async (id) => {
    setDeletingId(id);
    setError("");
    try {
      await API.delete(`/flats/delete/${id}`);
      setFlats(prev => prev.filter(f => f.id !== id));
      setConfirmId(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = flats.filter(f => {
    const q  = search.toLowerCase();
    const ms = f.flat_number?.toLowerCase().includes(q);
    const mf =
      filterStatus === "ALL"      ? true :
      filterStatus === "OCCUPIED" ? !!f.resident_id :
                                    !f.resident_id;
    return ms && mf;
  });

  const counts = {
    ALL:      flats.length,
    OCCUPIED: flats.filter(f => !!f.resident_id).length,
    VACANT:   flats.filter(f => !f.resident_id).length,
  };

  const TABS = [
    { key: "ALL",      label: "All",      color: "#5A3BA2" },
    { key: "OCCUPIED", label: "Occupied", color: "#16a34a" },
    { key: "VACANT",   label: "Vacant",   color: "#d97706" },
  ];

  return (
    <>
      <style>{`
        @keyframes fl-fadeIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes fl-scaleIn { from { opacity:0; transform:scale(0.96)      } to { opacity:1; transform:none } }
        .fl-fadein  { animation: fl-fadeIn  0.35s ease both; }
        .fl-scalein { animation: fl-scaleIn 0.25s ease both; }
      `}</style>

      <div className="page-root animate-fadeIn" style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="er-icon er-icon--amenity">
              <MdApartment size={22} />
            </div>
            <div>
              <h2 className="page-title">Block Flats</h2>
              <p className="page-subtitle">{counts.ALL} unit{counts.ALL !== 1 ? "s" : ""} in this block</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 999,
              background: "var(--card-inner-bg)",
              border: "1.5px solid var(--glass-border)",
              color: "var(--text-secondary)", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              transition: "all 0.18s",
            }}
          >
            <MdArrowBack size={16} /> Back
          </button>
        </div>

        {/* ── ERROR BANNER ── */}
        {error && (
          <div className="fl-fadein" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--stat-red-bg)", border: "1px solid var(--stat-red-border)",
            borderRadius: 12, padding: "12px 16px",
            fontSize: 13, color: "var(--stat-red-color)",
          }}>
            <span>{error}</span>
            <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.7, display: "flex", alignItems: "center" }}>
              <MdClose size={16} />
            </button>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? 10 : 14 }}>
            {[
              { label: "Total Units",    val: counts.ALL,      cls: "complaint-stat-total"      },
              { label: "Occupied",       val: counts.OCCUPIED, cls: "complaint-stat-resolved"   },
              { label: "Vacant",         val: counts.VACANT,   cls: "complaint-stat-pending"    },
            ].map(s => (
              <div key={s.label} className={`complaint-stat-card ${s.cls}`}>
                <span className="complaint-stat-val">{s.val}</span>
                <span className="complaint-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── MAIN CARD ── */}
        <div className="data-table-wrap">

          {/* Toolbar */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--glass-border)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {/* Search row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <MdSearch size={15} style={{
                  position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-secondary)", pointerEvents: "none",
                }} />
                <input
                  className="input"
                  style={{ paddingLeft: 34, paddingRight: search ? 34 : 12, height: 38, fontSize: 13 }}
                  placeholder="Search flat number…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-secondary)", display: "flex", alignItems: "center",
                  }}>
                    <MdClose size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{
              display: "flex", gap: 4,
              background: "var(--card-inner-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: 10, padding: 4,
            }}>
              {TABS.map(tab => {
                const on = filterStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "6px 8px", borderRadius: 7, border: "none",
                      cursor: "pointer", fontSize: isMobile ? 11 : 12, fontWeight: on ? 700 : 500,
                      transition: "all 0.18s",
                      background: on ? tab.color : "transparent",
                      color: on ? "#fff" : "var(--text-secondary)",
                      boxShadow: on ? "0 3px 10px rgba(0,0,0,0.22)" : "none",
                    }}
                  >
                    {tab.label}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 5px",
                      borderRadius: 999, lineHeight: 1.6,
                      background: on ? "rgba(255,255,255,0.22)" : "var(--glass-border)",
                      color: on ? "#fff" : "var(--text-secondary)",
                    }}>
                      {counts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px" }}>
              <Spinner />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Loading flats…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="fl-fadein" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "70px 20px" }}>
              <MdOutlineInbox size={48} style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                {search || filterStatus !== "ALL" ? "No flats match your filter." : "No flats found in this block."}
              </p>
              {(search || filterStatus !== "ALL") && (
                <button onClick={() => { setSearch(""); setFilterStatus("ALL"); }} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : isMobile ? (
            /* ── MOBILE CARDS ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
              {filtered.map((flat, idx) => {
                const occupied = !!flat.resident_id;
                return (
                  <div key={flat.id} className="fl-fadein" style={{ animationDelay: `${idx * 35}ms` }}>
                    <div style={{
                      background: "var(--card-bg)",
                      border: "1.5px solid var(--glass-border)",
                      borderRadius: 16, overflow: "hidden",
                      boxShadow: "var(--shadow-sm)",
                    }}>
                      {/* coloured top bar */}
                      <div style={{ height: 3, background: occupied ? "#22c55e" : "#f59e0b" }} />
                      <div style={{ padding: "13px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

                        {/* row 1: flat number + status */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: occupied ? "var(--stat-green-bg)" : "var(--stat-amber-bg)",
                              border: `1px solid ${occupied ? "var(--stat-green-border)" : "var(--stat-amber-border)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <MdApartment size={18} style={{ color: occupied ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", margin: 0 }}>
                                Flat {flat.flat_number}
                              </p>
                              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0", opacity: 0.7 }}>
                                Unit #{idx + 1}
                              </p>
                            </div>
                          </div>
                          <span className={occupied ? "status-pill status-pill--resolved" : "status-pill status-pill--pending"}>
                            {occupied ? <MdCheckCircle size={11} /> : <MdLock size={11} />}
                            {occupied ? "Occupied" : "Vacant"}
                          </span>
                        </div>

                        {/* row 2: resident info */}
                        {occupied && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 7,
                            padding: "7px 10px", borderRadius: 9,
                            background: "var(--chip-bg)", border: "1px solid var(--chip-border)",
                          }}>
                            <MdPerson size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Resident assigned</span>
                          </div>
                        )}

                        {/* row 3: delete */}
                        <div style={{
                          paddingTop: 8, borderTop: "1px solid var(--glass-border)",
                          display: "flex", justifyContent: "flex-end",
                        }}>
                          {confirmId === flat.id ? (
                            <div className="fl-scalein" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Delete flat?</span>
                              <button
                                onClick={() => deleteFlat(flat.id)}
                                disabled={deletingId === flat.id}
                                style={{
                                  display: "flex", alignItems: "center", gap: 5,
                                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                                  background: "#dc2626", color: "#fff", border: "none", cursor: "pointer",
                                }}
                              >
                                {deletingId === flat.id ? <Spinner small /> : "Yes, delete"}
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                style={{
                                  padding: "5px 10px", borderRadius: 8, fontSize: 11,
                                  background: "var(--card-inner-bg)", color: "var(--text-secondary)",
                                  border: "1px solid var(--glass-border)", cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmId(flat.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "6px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                                background: "var(--stat-red-bg)", color: "var(--stat-red-color)",
                                border: "1px solid var(--stat-red-border)", cursor: "pointer",
                              }}
                            >
                              <MdDelete size={14} /> Delete
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── DESKTOP TABLE ── */
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Flat Number</th>
                    <th>Status</th>
                    <th>Resident</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((flat, idx) => {
                    const occupied = !!flat.resident_id;
                    return (
                      <tr key={flat.id}>
                        <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                              background: occupied ? "var(--stat-green-bg)" : "var(--stat-amber-bg)",
                              border: `1px solid ${occupied ? "var(--stat-green-border)" : "var(--stat-amber-border)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <MdApartment size={15} style={{ color: occupied ? "var(--stat-green-color)" : "var(--stat-amber-color)" }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                              Flat {flat.flat_number}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={occupied ? "status-pill status-pill--resolved" : "status-pill status-pill--pending"}>
                            {occupied ? <MdCheckCircle size={11} /> : <MdLock size={11} />}
                            {occupied ? "Occupied" : "Vacant"}
                          </span>
                        </td>
                        <td>
                          {occupied ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: "50%",
                                background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <MdPerson size={14} style={{ color: "var(--accent)" }} />
                              </div>
                              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Assigned</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", opacity: 0.45 }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {confirmId === flat.id ? (
                            <div className="fl-scalein" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Sure?</span>
                              <button
                                onClick={() => deleteFlat(flat.id)}
                                disabled={deletingId === flat.id}
                                style={{
                                  display: "flex", alignItems: "center", gap: 5,
                                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                                  background: "#dc2626", color: "#fff", border: "none", cursor: "pointer",
                                }}
                              >
                                {deletingId === flat.id ? <Spinner small /> : "Yes, delete"}
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                style={{
                                  padding: "5px 10px", borderRadius: 8, fontSize: 11,
                                  background: "var(--card-inner-bg)", color: "var(--text-secondary)",
                                  border: "1px solid var(--glass-border)", cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmId(flat.id)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "6px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                                background: "var(--stat-red-bg)", color: "var(--stat-red-color)",
                                border: "1px solid var(--stat-red-border)", cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              <MdDelete size={13} /> Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="table-footer">
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Showing {filtered.length} of {flats.length} flat{flats.length !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}