import { useEffect, useState, useCallback, useMemo } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import {
  MdHistoryEdu,
  MdFlag,
  MdToday,
  MdDeleteOutline,
  MdSend,
  MdAccessTime,
  MdPerson,
  MdRefresh,
  MdShield,
  MdWarning,
} from "react-icons/md";
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

export default function ShiftLogbook() {
  const { t } = useLang();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, IMPORTANT, TODAY

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch (e) {
      return {};
    }
  }, []);

  const fetchLogs = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await API.get("/guard-logs");
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setLogs(list);
    } catch (err) {
      console.error("Error loading guard logs:", err);
      toast.error(err.response?.data?.message || "Failed to load logbook");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleAddLog = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) {
      toast.warn("Please write a log note before submitting.");
      return;
    }

    setPosting(true);
    try {
      const res = await API.post("/guard-logs", {
        text: inputText.trim(),
        is_important: isImportant,
      });

      const newLog = res.data?.data || res.data;
      setLogs((prev) => [newLog, ...prev]);
      setInputText("");
      setIsImportant(false);
      toast.success("Shift log note added successfully");
    } catch (err) {
      console.error("Error adding log:", err);
      toast.error(err.response?.data?.message || "Failed to add log note");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Are you sure you want to remove this log entry?")) return;
    setDeletingId(id);
    try {
      await API.delete(`/guard-logs/${id}`);
      setLogs((prev) => prev.filter((item) => item.id !== id));
      toast.success("Log note deleted");
    } catch (err) {
      console.error("Error deleting log:", err);
      toast.error(err.response?.data?.message || "Failed to delete log");
    } finally {
      setDeletingId(null);
    }
  };

  // KPI Counts
  const counts = useMemo(() => {
    const total = logs.length;
    const important = logs.filter((l) => l.is_important).length;
    const today = logs.filter((l) => {
      const todayStr = new Date().toDateString();
      return new Date(l.createdAt || l.created_at).toDateString() === todayStr;
    }).length;

    return { total, important, today };
  }, [logs]);

  // Filter & Search Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filter === "IMPORTANT" && !l.is_important) return false;
      if (filter === "TODAY") {
        const todayStr = new Date().toDateString();
        const logDate = new Date(l.createdAt || l.created_at).toDateString();
        if (logDate !== todayStr) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const textMatch = (l.text || l.note || "").toLowerCase().includes(q);
        const authorMatch = (l.Guard?.name || l.guard_name || l.author || "").toLowerCase().includes(q);
        return textMatch || authorMatch;
      }
      return true;
    });
  }, [logs, filter, search]);

  const filterTabs = [
    { key: "ALL", label: t("logFilterAll", "All Logs"), count: counts.total },
    { key: "IMPORTANT", label: t("logFilterImportant", "Important Flags"), count: counts.important },
    { key: "TODAY", label: t("logFilterToday", "Today's Logs"), count: counts.today },
  ];

  return (
    <div className="ge-root space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="ge-er">
        <div className="ge-er-left">
          <div
            className="ad-page-icon"
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              color: "#6366F1",
            }}
          >
            <MdHistoryEdu size={24} />
          </div>
          <div>
            <h2 className="page-title">{t("logbookTitle", "Guard Shift Log Book")}</h2>
            <p className="page-subtitle">
              {counts.total} {t("logbookSubtitle", "Shift handover notes, gate observations & incident flags")}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLogs(true)}
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
            filter === "ALL" ? "ring-2 ring-indigo-500 shadow-md scale-101" : ""
          }`}
        >
          <span className="complaint-stat-val text-indigo-600">{counts.total}</span>
          <span className="complaint-stat-label">Total Logbook Records</span>
        </div>
        <div
          onClick={() => setFilter("IMPORTANT")}
          className={`complaint-stat-card complaint-stat-inprogress cursor-pointer transition-all ${
            filter === "IMPORTANT" ? "ring-2 ring-rose-500 shadow-md scale-101" : ""
          }`}
        >
          <span className="complaint-stat-val text-rose-600">{counts.important}</span>
          <span className="complaint-stat-label">Important Action Flags</span>
        </div>
        <div
          onClick={() => setFilter("TODAY")}
          className={`complaint-stat-card complaint-stat-resolved cursor-pointer transition-all ${
            filter === "TODAY" ? "ring-2 ring-emerald-500 shadow-md scale-101" : ""
          }`}
        >
          <span className="complaint-stat-val text-emerald-600">{counts.today}</span>
          <span className="complaint-stat-label">Added Today</span>
        </div>
      </div>

      {/* ── CREATE NEW LOG NOTE COMPOSER ── */}
      <div className="gd-glass-card p-5 rounded-2xl border border-glass-border shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="text-sm font-extrabold text-primary">
              Write New Shift / Handover Log Entry
            </h3>
          </div>
          <span className="text-xs text-secondary font-medium">
            Logged as <strong>{currentUser.name || "Security Officer"}</strong>
          </span>
        </div>

        <form onSubmit={handleAddLog} className="space-y-3">
          <textarea
            rows={3}
            placeholder="Record gate events, shift handover notes, suspicious visitors, or society instructions..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full p-3.5 text-sm rounded-2xl bg-card-inner-bg border border-glass-border focus:border-accent text-primary outline-none resize-none shadow-inner"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <MdFlag size={15} /> Flag as Important Handover Note
              </span>
            </label>

            <button
              type="submit"
              disabled={posting || !inputText.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-40 hover:scale-102 active:scale-98"
            >
              {posting ? (
                <Spinner size={14} />
              ) : (
                <>
                  <MdSend size={15} /> Post Log Entry
                </>
              )}
            </button>
          </div>
        </form>
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
            placeholder={t("searchLogbookPlaceholder", "Search logs by message text or guard name...")}
          />
        </div>
      </div>

      {/* ── LOG FEED TIMELINE ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-secondary">
            <Spinner size={26} />
            <p className="mt-2 text-xs font-bold">Loading shift logbook entries...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="ge-empty py-12">
            <span className="ge-empty-icon">📝</span>
            <span>No logbook notes match your search or filter</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const authorName = log.Guard?.name || log.guard_name || log.author || "Guard Officer";
            const isMine = log.guard_id === currentUser.id || log.user_id === currentUser.id;
            const createdAt = new Date(log.createdAt || log.created_at);

            return (
              <div
                key={log.id}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  log.is_important
                    ? "bg-rose-500/5 border-rose-500/30 shadow-md"
                    : "bg-card border-glass-border shadow-sm hover:border-gray-400"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                      style={{
                        backgroundColor: log.is_important
                          ? "rgba(244, 63, 94, 0.15)"
                          : "rgba(99, 102, 241, 0.15)",
                        color: log.is_important ? "#F43F5E" : "#6366F1",
                      }}
                    >
                      {log.is_important ? <MdFlag size={20} /> : <MdShield size={20} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-primary">
                          {authorName}
                        </span>
                        {log.is_important && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-xs">
                            Important
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-secondary mt-0.5 font-medium">
                        <MdAccessTime size={13} />
                        <span>
                          {createdAt.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {" • "}
                          {createdAt.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(isMine || currentUser.role === "SUPER_ADMIN" || currentUser.role === "GUARD") && (
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      disabled={deletingId === log.id}
                      className="p-1.5 rounded-lg text-secondary hover:text-red-500 hover:bg-red-500/10 transition"
                      title="Delete log entry"
                    >
                      {deletingId === log.id ? <Spinner size={14} /> : <MdDeleteOutline size={18} />}
                    </button>
                  )}
                </div>

                <p className="mt-3.5 text-sm text-primary leading-relaxed font-normal whitespace-pre-wrap pl-13">
                  {log.text || log.note}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
