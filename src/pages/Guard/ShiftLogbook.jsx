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
  MdAdd,
  MdEditNote,
  MdBookmark,
  MdCheckCircle,
} from "react-icons/md";
import { toast } from "react-toastify";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalModal from "../../components/common/GlobalModal";

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

  // New Log Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Filter & Search
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
      toast.error(err.response?.data?.message || t("lgFetchFail", "Failed to load logbook"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleAddLog = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) {
      toast.warn(t("lgEmptyNote", "Please write a log note before submitting."));
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
      setIsAddModalOpen(false);
      toast.success(t("lgAddSuccess", "Shift log note added successfully"));
    } catch (err) {
      console.error("Error adding log:", err);
      toast.error(err.response?.data?.message || t("lgAddFail", "Failed to add log note"));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm(t("lgDeleteConfirm", "Are you sure you want to remove this log entry?"))) return;
    setDeletingId(id);
    try {
      await API.delete(`/guard-logs/${id}`);
      setLogs((prev) => prev.filter((item) => item.id !== id));
      toast.success(t("lgDeleteSuccess", "Log note deleted"));
    } catch (err) {
      console.error("Error deleting log:", err);
      toast.error(err.response?.data?.message || t("lgDeleteFail", "Failed to delete log"));
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
        const authorName =
          l.Guard?.name ||
          l.guard_name ||
          (typeof l.author === "string" ? l.author : l.author?.name) ||
          "";
        const authorMatch = authorName.toLowerCase().includes(q);
        return textMatch || authorMatch;
      }
      return true;
    });
  }, [logs, filter, search]);

  const filterTabs = [
    { key: "ALL", label: t("lgFilterAll", "All Logs"), count: counts.total },
    { key: "IMPORTANT", label: t("lgFilterImportant", "Important Flags"), count: counts.important },
    { key: "TODAY", label: t("lgFilterToday", "Today's Logs"), count: counts.today },
  ];

  return (
    <div className="ge-root space-y-6 animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="ge-er flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="ge-er-left flex items-center gap-3">
          <div
            className="ad-page-icon shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.08))",
              color: "#6366F1",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
            }}
          >
            <MdHistoryEdu size={24} />
          </div>
          <div>
            <h2 className="page-title text-xl font-black text-primary">
              {t("lgTitle", "Guard Shift Logbook")}
            </h2>
            <p className="page-subtitle text-xs text-secondary font-medium">
              {counts.total} {t("lgSubtitle", "Shift handover notes, gate observations & incident flags")}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all hover:scale-102 active:scale-98 flex-1 sm:flex-none"
          >
            <MdRefresh size={18} className={refreshing ? "animate-spin text-accent" : ""} />
            <span>{refreshing ? t("lgRefreshing", "Refreshing...") : t("lgRefresh", "Refresh")}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/25 hover:scale-102 active:scale-98 flex-1 sm:flex-none"
          >
            <MdAdd size={19} />
            <span>{t("lgAddBtn", "Add Log Entry")}</span>
          </button>
        </div>
      </div>

      {/* ── KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div
          onClick={() => setFilter("ALL")}
          className={`complaint-stat-card complaint-stat-total cursor-pointer transition-all ${
            filter === "ALL" ? "ring-2 ring-indigo-500 shadow-md scale-101" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="complaint-stat-val text-indigo-600">{counts.total}</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <MdBookmark size={18} />
            </div>
          </div>
          <span className="complaint-stat-label">{t("lgStatTotal", "Total Logbook Records")}</span>
        </div>

        <div
          onClick={() => setFilter("IMPORTANT")}
          className={`complaint-stat-card complaint-stat-inprogress cursor-pointer transition-all ${
            filter === "IMPORTANT" ? "ring-2 ring-rose-500 shadow-md scale-101" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="complaint-stat-val text-rose-600">{counts.important}</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <MdFlag size={18} />
            </div>
          </div>
          <span className="complaint-stat-label">{t("lgStatImportant", "Important Action Flags")}</span>
        </div>

        <div
          onClick={() => setFilter("TODAY")}
          className={`complaint-stat-card complaint-stat-resolved cursor-pointer transition-all ${
            filter === "TODAY" ? "ring-2 ring-emerald-500 shadow-md scale-101" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="complaint-stat-val text-emerald-600">{counts.today}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <MdToday size={18} />
            </div>
          </div>
          <span className="complaint-stat-label">{t("lgStatToday", "Added Today")}</span>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR WITH TOGGLE SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-2 rounded-2xl border border-glass-border shadow-xs">
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

        <ExpandableSearch
          value={search}
          onChange={setSearch}
          placeholder={t("lgSearchPlaceholder", "Search by message or guard...")}
        />
      </div>

      {/* ── LOG FEED TIMELINE ── */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="p-12 text-center text-secondary">
            <Spinner size={26} />
            <p className="mt-2 text-xs font-bold">{t("lgLoading", "Loading shift logbook entries...")}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="ge-empty py-12 bg-card rounded-2xl border border-glass-border text-center space-y-2">
            <span className="text-3xl">📝</span>
            <p className="text-sm font-extrabold text-primary">{t("lgEmptyTitle", "No Logbook Notes Found")}</p>
            <p className="text-xs text-secondary">
              {t("lgEmptySub", "No shift entries match your selected search or filter tag.")}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const authorName =
              log.Guard?.name ||
              log.guard_name ||
              (typeof log.author === "string" ? log.author : log.author?.name) ||
              t("lgAuthorFallback", "Guard Officer");
            const isMine = log.guard_id === currentUser.id || log.user_id === currentUser.id;
            const createdAt = new Date(log.createdAt || log.created_at);

            return (
              <div
                key={log.id}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  log.is_important
                    ? "bg-rose-500/5 border-rose-500/30 shadow-md hover:border-rose-500/50"
                    : "bg-card border-glass-border shadow-sm hover:border-indigo-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs"
                      style={{
                        backgroundColor: log.is_important
                          ? "rgba(244, 63, 94, 0.15)"
                          : "rgba(99, 102, 241, 0.15)",
                        color: log.is_important ? "#F43F5E" : "#6366F1",
                        border: log.is_important
                          ? "1px solid rgba(244, 63, 94, 0.3)"
                          : "1px solid rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      {log.is_important ? <MdFlag size={20} /> : <MdShield size={20} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-primary">
                          {authorName}
                        </span>
                        {log.is_important && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-xs flex items-center gap-1">
                            <MdFlag size={11} /> {t("lgBadgeImportant", "Important")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-secondary mt-0.5 font-medium min-w-0">
                        <MdAccessTime size={13} className="opacity-70 shrink-0" />
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
                      className="p-2 rounded-xl text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                      title={t("lgDeleteTitle", "Delete log entry")}
                    >
                      {deletingId === log.id ? <Spinner size={14} /> : <MdDeleteOutline size={18} />}
                    </button>
                  )}
                </div>

                <p className="mt-3.5 text-sm text-primary leading-relaxed font-normal whitespace-pre-wrap pl-4 sm:pl-13 border-l-2 border-indigo-500/20 min-w-0">
                  {log.text || log.note}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL POPUP FOR CREATING LOG ENTRY ── */}
      <GlobalModal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!posting) {
            setIsAddModalOpen(false);
            setInputText("");
            setIsImportant(false);
          }
        }}
        title={t("lgModalTitle", "New Shift Log Entry")}
        subtitle={t(
          "lgModalSubtitle",
          { name: currentUser.name || t("lgSecurityOfficer", "Security Officer") },
          "Logged as {name}"
        )}
        icon={MdEditNote}
        size="md"
        showFooter={true}
        onCancel={() => {
          setIsAddModalOpen(false);
          setInputText("");
          setIsImportant(false);
        }}
        onSubmit={handleAddLog}
        submitLabel={t("lgSubmitLabel", "Post Log Entry")}
        submitLoading={posting}
        submitDisabled={posting || !inputText.trim()}
        submitIcon={MdSend}
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-extrabold text-primary mb-1.5">
              {t("lgFieldLabel", "Log Note / Handover Observation")} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              autoFocus
              placeholder={t(
                "lgFieldPlaceholder",
                "Record gate observations, shift handover notes, suspicious visitors, or key instructions..."
              )}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3.5 text-sm rounded-xl bg-card-inner-bg border border-glass-border focus:border-accent text-primary outline-none resize-none shadow-inner transition-all"
            />
            <div className="flex justify-between items-center mt-1.5 text-[11px] text-secondary">
              <span>{t("lgFieldHint", "Be precise for oncoming shift guards & administration")}</span>
              <span className="font-bold">{t("lgFieldChars", { count: inputText.length }, "{count} chars")}</span>
            </div>
          </div>

          <div
            onClick={() => setIsImportant(!isImportant)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              isImportant
                ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-xs"
                : "bg-card-inner-bg border-glass-border hover:border-gray-400 text-secondary"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  isImportant
                    ? "bg-rose-500 text-white shadow-xs"
                    : "bg-gray-200 dark:bg-gray-800 text-secondary"
                }`}
              >
                <MdFlag size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-primary">
                  {t("lgImportantLabel", "Flag as Important Handover Note")}
                </p>
                <p className="text-[11px] text-secondary">
                  {t("lgImportantSub", "Highlights this log entry with red warning priority")}
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </GlobalModal>
    </div>
  );
}
