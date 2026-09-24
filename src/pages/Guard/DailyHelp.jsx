import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdSearch,
  MdPhone,
  MdApartment,
  MdLogin,
  MdLogout,
  MdCheckCircle,
  MdRefresh,
  MdWork,
  MdCleaningServices,
  MdPeople,
  MdClose,
  MdClear,
  MdVerified,
  MdLock,
} from "react-icons/md";
import { FaHandshake } from "react-icons/fa";
import { toast } from "react-toastify";
import SlidingTabs from "../../components/common/SlidingTabs";


function Spinner({ size = 16 }) {
  return (
    <svg
      style={{ width: size, height: size }}
      className="animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        style={{ opacity: 0.25 }}
      />
      <path
        fill="currentColor"
        style={{ opacity: 0.75 }}
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

const normalizePassCode = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 6 ? `GP-${digits}` : null;
};

const tint = (color, alpha) => `color-mix(in srgb, var(--${color}) ${alpha}%, transparent)`;

export default function DailyHelp() {
  const { t } = useLang();

  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, INSIDE, OUTSIDE

  // Gate pass code modal state
  const [passHelper, setPassHelper] = useState(null);
  const [passCode, setPassCode] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const passInputRef = useRef(null);

  const fetchDirectory = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await API.get("/visitors/daily-help/directory");
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setHelpers(list);
    } catch (err) {
      console.error("Error loading daily help directory:", err);
      toast.error(err.response?.data?.message || "Failed to load daily help directory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Open gate pass modal for a Check-In / Check-Out action
  const handleToggleEntry = (helper) => {
    setPassHelper(helper);
    setPassCode("");
    setPassError("");
    setTimeout(() => passInputRef.current?.focus(), 80);
  };

  // Submit the gate pass code and perform the check-in / check-out
  const submitGatePass = async () => {
    const helper = passHelper;
    if (!helper || passLoading) return;

    const code = normalizePassCode(passCode);
    if (!code) {
      setPassError(t("dhPassInvalidCode", "Enter the full 6-digit pass code (GP-XXXXXX)"));
      return;
    }

    const isInside = helper.status === "INSIDE";
    setPassLoading(true);
    setPassError("");

    try {
      if (isInside) {
        // Mark Exit
        const res = await API.put("/visitors/daily-help/exit", {
          phone: helper.phone,
          gatePassCode: code,
        });
        toast.success(res.data?.message || `Checked out ${helper.name} from all flats`);
      } else {
        // Mark Entry
        const res = await API.post("/visitors/daily-help/entry", {
          name: helper.name,
          phone: helper.phone,
          flatIds: helper.flatIds || [],
          gatePassCode: code,
        });
        toast.success(res.data?.message || `Checked in ${helper.name} successfully`);
      }
      fetchDirectory();
      setPassHelper(null);
    } catch (err) {
      console.error("Error toggling helper status:", err);
      setPassError(err.response?.data?.message || "Operation failed");
    } finally {
      setPassLoading(false);
    }
  };

  // KPI Counts
  const counts = useMemo(() => {
    const total = helpers.length;
    const inside = helpers.filter((h) => h.status === "INSIDE").length;
    const outside = total - inside;
    return { total, inside, outside };
  }, [helpers]);

  // Filter & Search Logic
  const filteredHelpers = useMemo(() => {
    return helpers.filter((h) => {
      // Filter tab
      if (filter === "INSIDE" && h.status !== "INSIDE") return false;
      if (filter === "OUTSIDE" && h.status === "INSIDE") return false;

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = (h.name || "").toLowerCase().includes(q);
        const phoneMatch = (h.phone || "").toLowerCase().includes(q);
        const roleMatch = (h.roles || "").toLowerCase().includes(q);
        const flatsMatch = (h.flats || "").toLowerCase().includes(q);
        return nameMatch || phoneMatch || roleMatch || flatsMatch;
      }
      return true;
    });
  }, [helpers, filter, search]);

  const filterTabs = [
    { key: "ALL", label: t("dailyHelpFilterAll", "All Daily Help"), count: counts.total },
    { key: "INSIDE", label: t("dailyHelpFilterInside", "Inside Society"), count: counts.inside },
    { key: "OUTSIDE", label: t("dailyHelpFilterOutside", "Outside"), count: counts.outside },
  ];

  return (
    <div className="ge-root space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="ge-er">
        <div className="ge-er-left">
          <div
            className="ad-page-icon"
            style={{
              background: "rgba(20, 184, 166, 0.15)",
              color: "#14B8A6",
            }}
          >
            <FaHandshake size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("dailyHelpTitle", "Daily Help & Staff Directory")}</h2>
            <p className="page-subtitle">
              {counts.total} {t("dailyHelpSubtitle", "Registered house helps, maids, cooks & drivers")}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchDirectory(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-1.5 text-xs font-bold px-3.5 py-2"
        >
          <MdRefresh size={18} className={refreshing ? "animate-spin text-accent" : ""} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* ── KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div
          onClick={() => setFilter("ALL")}
          className={`complaint-stat-card complaint-stat-total cursor-pointer transition-all ${
            filter === "ALL" ? "ring-2 ring-teal-500 shadow-md scale-101" : ""
          }`}
        >
          <span className="complaint-stat-val text-teal-600">{counts.total}</span>
          <span className="complaint-stat-label">Total Helpers Registered</span>
        </div>
        <div
          onClick={() => setFilter("INSIDE")}
          className={`complaint-stat-card complaint-stat-inprogress cursor-pointer transition-all ${
            filter === "INSIDE" ? "ring-2 ring-emerald-500 shadow-md scale-101" : ""
          }`}
        >
          <span className="complaint-stat-val text-emerald-600">{counts.inside}</span>
          <span className="complaint-stat-label">Currently Inside Gate</span>
        </div>
        <div
          onClick={() => setFilter("OUTSIDE")}
          className={`complaint-stat-card complaint-stat-resolved cursor-pointer transition-all ${
            filter === "OUTSIDE" ? "ring-2 ring-gray-400 shadow-md scale-101" : ""
          }`}
        >
          <span className="complaint-stat-val text-gray-500">{counts.outside}</span>
          <span className="complaint-stat-label">Checked Out / Outside</span>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      <div className="ge-toolbar">
        <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
          <SlidingTabs
            className="ge-filter-tabs"
            value={filter}
            onChange={(f) => setFilter(f)}
            tabs={filterTabs.map(({ key, label, count }) => ({
              key,
              label: (
                <span className="flex items-center gap-1.5">
                  <span>{label}</span>
                  <span className="opacity-75 font-normal">({count})</span>
                </span>
              ),
            }))}
          />
        </div>

        <div className="ge-search-box">
          <MdSearch size={18} className="ge-search-box-icon" />
          <input
            type="text"
            className="ge-search-box-input"
            placeholder={t("searchDailyHelpPlaceholder", "Search helper by name, phone, maid, cook, flat...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="ge-search-box-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              title="Clear search"
            >
              <MdClose size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="ge-table-card">
        {loading ? (
          <div className="p-12 text-center text-secondary">
            <Spinner size={26} />
            <p className="mt-2 text-xs font-bold">Loading daily help directory...</p>
          </div>
        ) : filteredHelpers.length === 0 ? (
          <div className="ge-empty py-12">
            <span className="ge-empty-icon">🧹</span>
            <span>No daily help records match your search or filter</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ge-table">
              <thead>
                <tr>
                  <th>Helper / Staff</th>
                  <th>Role &amp; Service</th>
                  <th>Assigned Flats</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>1-Click Gate Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHelpers.map((h) => {
                  const isInside = h.status === "INSIDE";

                  return (
                    <tr key={h.phone || h.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              backgroundColor: isInside
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(148, 163, 184, 0.15)",
                              color: isInside ? "#10B981" : "#64748B",
                            }}
                          >
                            <MdCleaningServices size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-primary block text-sm">
                              {h.name}
                            </span>
                            <span className="text-[11px] text-secondary">
                              Society Daily Staff
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                          <MdWork size={12} />
                          {h.roles || "Household Staff"}
                        </span>
                      </td>
                      <td>
                        <span className="ge-flat-chip font-bold">
                          {h.flats || "Multiple Units"}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`tel:${h.phone}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline font-bold"
                        >
                          <MdPhone size={13} />
                          {h.phone || "—"}
                        </a>
                      </td>
                      <td>
                        {isInside ? (
                          <span className="ge-badge ge-badge--inside">
                            ● Inside Society
                          </span>
                        ) : (
                          <span className="ge-badge ge-badge--left">
                            ○ Outside
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleEntry(h)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold text-white transition flex items-center gap-1.5 shadow-sm ${
                            isInside
                              ? "bg-red-600 hover:bg-red-700 active:scale-95"
                              : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                          }`}
                        >
                          {isInside ? (
                            <MdLogout size={14} />
                          ) : (
                            <MdLogin size={14} />
                          )}
                          <span>{isInside ? "Check OUT" : "Check IN"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MOBILE CARD LIST ── */}
      <div className="ge-mobile-list">
        {loading ? (
          <div className="p-6 text-center text-secondary">
            <Spinner size={20} />
          </div>
        ) : filteredHelpers.length === 0 ? (
          <div className="ge-empty">
            <span className="ge-empty-icon">🧹</span>
            <span>No daily help records found</span>
          </div>
        ) : (
          filteredHelpers.map((h) => {
            const isInside = h.status === "INSIDE";

            return (
              <div key={h.phone || h.id} className="ge-mobile-card">
                <div className="ge-mc-top">
                  <div className="ge-mc-name-row">
                    <span
                      className={`ge-row-bar ${
                        isInside ? "ge-row-bar--inside" : "ge-row-bar--left"
                      }`}
                    />
                    <div>
                      <span className="ge-mc-name">{h.name}</span>
                      <span className="text-[10px] text-teal-600 font-bold block mt-0.5">
                        {h.roles || "Household Staff"}
                      </span>
                    </div>
                  </div>
                  {isInside ? (
                    <span className="ge-badge ge-badge--inside">● Inside</span>
                  ) : (
                    <span className="ge-badge ge-badge--left">○ Outside</span>
                  )}
                </div>

                <div className="ge-mc-rows">
                  <div className="ge-mc-row">
                    <span className="ge-mc-label">Assigned Flats</span>
                    <span className="ge-flat-chip">{h.flats || "—"}</span>
                  </div>
                  <div className="ge-mc-row">
                    <span className="ge-mc-label">Contact</span>
                    <a
                      href={`tel:${h.phone}`}
                      className="ge-mc-val text-blue-600 flex items-center gap-1 font-mono font-bold"
                    >
                      <MdPhone size={12} /> {h.phone}
                    </a>
                  </div>

                  <div className="mt-3 pt-2 border-t border-divider flex justify-end">
                    <button
                      onClick={() => handleToggleEntry(h)}
                      className={`px-4 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-md ${
                        isInside ? "bg-red-600" : "bg-emerald-600"
                      }`}
                    >
                      {isInside ? (
                        <MdLogout size={14} />
                      ) : (
                        <MdLogin size={14} />
                      )}
                      <span>{isInside ? "Check OUT" : "Check IN"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── GATE PASS CODE MODAL ── */}
      {passHelper && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "var(--overlay-bg)", backdropFilter: "blur(6px)", zIndex: 1200 }}
          onClick={() => !passLoading && setPassHelper(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 sm:p-7 border relative overflow-hidden shadow-xl"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"
              style={{ background: "linear-gradient(135deg, " + tint("accent", 20) + ", transparent)" }}
            />
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(to right, transparent, var(--accent), transparent)" }} />

            <div className="relative z-10 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: tint("accent", 14),
                      border: "1px solid " + tint("accent", 30),
                      color: "var(--accent)",
                    }}
                  >
                    {passHelper.status === "INSIDE" ? <MdLogout size={20} /> : <MdLogin size={20} />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                      {passHelper.status === "INSIDE"
                        ? t("dhPassOutTitle", "Check OUT — Gate Pass Required")
                        : t("dhPassInTitle", "Check IN — Gate Pass Required")}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {t("dhPassSubtitle", "Verify the resident-issued gate pass before {action}")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !passLoading && setPassHelper(null)}
                  className="shrink-0 rounded-xl p-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  aria-label="Close"
                >
                  <MdClose size={20} />
                </button>
              </div>

              {/* Helper summary */}
              <div
                className="flex items-center gap-3 p-3 rounded-2xl border"
                style={{ background: "var(--card-inner-bg)", borderColor: "var(--glass-border)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: tint(passHelper.status === "INSIDE" ? "red" : "green", 14),
                    color: passHelper.status === "INSIDE" ? "var(--danger)" : "var(--success)",
                  }}
                >
                  <MdCleaningServices size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                    {passHelper.name}
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>
                    {passHelper.phone} · {passHelper.flats || "Multiple Units"}
                  </p>
                </div>
              </div>

              {/* Code input */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                  {t("dhPassCodeLabel", "Gate Pass Code")}
                </p>
                <div
                  onClick={() => passInputRef.current?.focus()}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center justify-center gap-2.5 py-1.5">
                    <span className="text-lg sm:text-xl font-extrabold tracking-wider select-none tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      GP-
                    </span>
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const char = passCode[idx] || "";
                      const isCurrent = passCode.length === idx;
                      const filled = Boolean(char);
                      return (
                        <div
                          key={idx}
                          className="w-10 h-14 sm:w-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-extrabold tracking-wider transition-all duration-200"
                          style={{
                            borderColor: filled || isCurrent ? "var(--accent)" : "var(--glass-border)",
                            borderBottomColor: filled || isCurrent ? "var(--accent)" : "var(--accent)",
                            borderBottomWidth: 2,
                            background: filled || isCurrent ? tint("accent", 14) : "var(--card-inner-bg)",
                            color: "var(--text-primary)",
                            boxShadow: filled || isCurrent ? "0 4px 12px " + tint("accent", 18) : "none",
                          }}
                        >
                          {char || (isCurrent ? <span className="w-2.5 h-0.5 animate-pulse" style={{ background: "var(--accent)" }} /> : "")}
                        </div>
                      );
                    })}
                  </div>
                  <input
                    ref={passInputRef}
                    type="text"
                    autoFocus
                    maxLength={6}
                    value={passCode}
                    onChange={(e) => setPassCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && submitGatePass()}
                    autoComplete="off"
                    spellCheck={false}
                    className="opacity-0 absolute -top-10 left-0 w-1 h-1 pointer-events-none"
                  />
                </div>

                {/* Clear shortcut */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  {passCode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPassCode("");
                        passInputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                      style={{ color: "var(--text-secondary)", background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
                    >
                      <MdClear size={12} />
                      <span>{t("dhPassClear", "Clear code")}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                      <MdLock size={12} />
                      <span>{t("dhPassHint", "Type 6 digits or paste code (GP-XXXXXX)")}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Error banner */}
              {passError && (
                <div
                  className="p-3 rounded-2xl border flex items-center gap-2.5 text-sm font-semibold animate-fadeIn"
                  style={{
                    background: tint("warning", 12),
                    borderColor: tint("warning", 30),
                    color: "var(--warning)",
                  }}
                >
                  <MdLock size={16} />
                  <span>{passError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => !passLoading && setPassHelper(null)}
                  disabled={passLoading}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all border"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--glass-border)", background: "var(--card-inner-bg)" }}
                >
                  {t("dhPassCancel", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={submitGatePass}
                  disabled={passLoading || passCode.length < 6}
                  className="relative flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 text-white border-none transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                    boxShadow: "0 8px 24px " + tint("accent", 26),
                  }}
                >
                  <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                    style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.22), transparent)" }}
                  />
                  {passLoading ? (
                    <>
                      <Spinner size={16} />
                      <span>{passHelper.status === "INSIDE" ? t("dhPassCheckingOut", "Checking OUT...") : t("dhPassCheckingIn", "Checking IN...")}</span>
                    </>
                  ) : (
                    <>
                      <MdVerified size={16} />
                      <span>{passHelper.status === "INSIDE" ? t("dhPassConfirmOut", "Confirm Check OUT") : t("dhPassConfirmIn", "Confirm Check IN")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
