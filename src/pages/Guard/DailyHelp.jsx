import { useEffect, useState, useCallback, useMemo } from "react";
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
} from "react-icons/md";
import { FaHandshake } from "react-icons/fa";
import { toast } from "react-toastify";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";

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

export default function DailyHelp() {
  const { t } = useLang();

  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingPhone, setActionLoadingPhone] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, INSIDE, OUTSIDE

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

  // Handle Check-In / Check-Out Action
  const handleToggleEntry = async (helper) => {
    const isInside = helper.status === "INSIDE";
    setActionLoadingPhone(helper.phone);

    try {
      if (isInside) {
        // Mark Exit
        const res = await API.put("/visitors/daily-help/exit", {
          phone: helper.phone,
        });
        toast.success(res.data?.message || `Checked out ${helper.name} from all flats`);
      } else {
        // Mark Entry
        const res = await API.post("/visitors/daily-help/entry", {
          name: helper.name,
          phone: helper.phone,
          flatIds: helper.flatIds || [],
        });
        toast.success(res.data?.message || `Checked in ${helper.name} successfully`);
      }
      fetchDirectory();
    } catch (err) {
      console.error("Error toggling helper status:", err);
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setActionLoadingPhone(null);
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

        <div className="ge-search-wrap">
          <ExpandableSearch
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchDailyHelpPlaceholder", "Search helper by name, phone, maid, cook, flat...")}
          />
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
                  const isActionLoading = actionLoadingPhone === h.phone;

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
                          disabled={isActionLoading}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                            isInside
                              ? "bg-red-600 hover:bg-red-700 active:scale-95"
                              : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                          }`}
                        >
                          {isActionLoading ? (
                            <Spinner size={13} />
                          ) : isInside ? (
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
            const isActionLoading = actionLoadingPhone === h.phone;

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
                      disabled={isActionLoading}
                      className={`px-4 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-md ${
                        isInside ? "bg-red-600" : "bg-emerald-600"
                      }`}
                    >
                      {isActionLoading ? (
                        <Spinner size={13} />
                      ) : isInside ? (
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
    </div>
  );
}
