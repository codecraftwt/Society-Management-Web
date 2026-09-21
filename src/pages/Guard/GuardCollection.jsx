import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import {
  MdChevronLeft,
  MdChevronRight,
  MdOutlineInventory2,
  MdOutlineDoorFront,
  MdVerified,
  MdClose,
  MdCheckCircle,
  MdApartment,
  MdSearch,
  MdLocalShipping,
  MdPerson,
  MdSchedule,
  MdHourglassTop,
  MdDoneAll,
  MdSecurity,
  MdClear,
  MdVpnKey,
} from "react-icons/md";
import { toast } from "react-toastify";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Modal from "../../components/Modal";

import Pagination from "../../components/common/Pagination";

function useDebounce(value, delay = 400) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const EMPTY_COUNTS = { EXPECTED: 0, AT_GATE: 0, COLLECTED: 0, CANCELLED: 0, ALL: 0 };

export default function GuardCollection() {
  const { t } = useLang();

  const [parcels, setParcels] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  // OTP Modal state
  const [collectModalParcel, setCollectModalParcel] = useState(null);
  const [modalOtp, setModalOtp] = useState("");
  const otpInputRef = useRef(null);

  useEffect(() => {
    if (collectModalParcel) {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [collectModalParcel]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const limitRef = useRef(limit);
  limitRef.current = limit;
const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const debSearch = useDebounce(search, 400);

  const [processingId, setProcessingId] = useState(null);
  const [collectingId, setCollectingId] = useState(null);

  const actionTimeoutRef = useRef({});

  const shiftCount = (prev, from, to) => {
    const next = { ...prev };
    if (from && next[from] !== undefined) next[from] = Math.max(0, (next[from] || 0) - 1);
    if (to && next[to] !== undefined) next[to] = (next[to] || 0) + 1;
    return next;
  };

  const loadData = useCallback(async (pg = 1, isInit = false, f = tab, q = debSearch) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(limit) });
      if (f && f !== "ALL") params.set("status", f);
      if (q) params.set("search", q);
      const res = await API.get(`/parcels?${params}`);
      const data = res.data;
      setParcels(Array.isArray(data) ? data : data?.data || []);
      setTotalPages(data?.pagination?.totalPages ?? 1);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      const c = data?.counts || {};
      setCounts({
        EXPECTED: c.EXPECTED ?? 0,
        AT_GATE: c.AT_GATE ?? 0,
        COLLECTED: c.COLLECTED ?? 0,
        CANCELLED: c.CANCELLED ?? 0,
        ALL: c.ALL ?? data?.pagination?.totalItems ?? 0,
      });
      setPage(pg);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load parcels");
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, [tab, debSearch]);

  useEffect(() => {
    loadData(1, true, "ALL", "");
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    loadData(1, false, tab, debSearch);
  }, [tab, debSearch]);

  /* ── Real-time socket listeners ── */
  useEffect(() => {
    const matchesView = (parcel) => {
      const matchesTab = tab === "ALL" || parcel.status === tab;
      const q = debSearch.trim().toLowerCase();
      const matchesSearch = !q || (parcel.courier_name || "").toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    };

    const onCreated = (parcel) => {
      setCounts((prev) => ({
        ...prev,
        ALL: (prev.ALL || 0) + 1,
        [parcel.status]: (prev[parcel.status] || 0) + 1,
      }));
      if (!matchesView(parcel)) return;
      setParcels((prev) => {
        if (prev.find((p) => p.id === parcel.id)) return prev;
        setTotalItems((c) => c + 1);
        if (page === 1) {
          const updated = [parcel, ...prev];
          return updated.slice(0, limit);
        }
        return prev;
      });
    };

    const onUpdated = (updated) => {
      setParcels((prev) => {
        const existing = prev.find((x) => x.id === updated.id);
        if (existing && existing.status !== updated.status) {
          setCounts((c) => shiftCount(c, existing.status, updated.status));
        }
        if (!matchesView(updated)) return prev.filter((x) => x.id !== updated.id);
        if (!existing && page === 1) return [updated, ...prev].slice(0, limit);
        return prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x));
      });
    };

    const onCollected = (updated) => {
      setParcels((prev) => {
        const existing = prev.find((x) => x.id === updated.id);
        if (existing && existing.status !== "COLLECTED") {
          setCounts((c) => shiftCount(c, existing.status, "COLLECTED"));
        }
        const next = { ...updated, status: "COLLECTED" };
        if (!matchesView(next)) return prev.filter((x) => x.id !== updated.id);
        return prev.map((x) => (x.id === updated.id ? { ...x, ...next } : x));
      });
    };

    socket.on("parcel_created", onCreated);
    socket.on("parcel_updated", onUpdated);
    socket.on("parcel_collected", onCollected);

    return () => {
      socket.off("parcel_created", onCreated);
      socket.off("parcel_updated", onUpdated);
      socket.off("parcel_collected", onCollected);
    };
  }, [page, tab, debSearch]);

  const handlePageChange = (pg) => loadData(pg);

  // Mark arrived at gate
  const markArrived = async (id) => {
    if (processingId || actionTimeoutRef.current[id]) {
      return;
    }

    try {
      setProcessingId(id);

      actionTimeoutRef.current[id] = setTimeout(() => {
        delete actionTimeoutRef.current[id];
      }, 2000);

      setParcels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "AT_GATE" } : p))
      );
      setCounts((c) => shiftCount(c, "EXPECTED", "AT_GATE"));

      await API.put(`/parcels/${id}/status`, { status: "AT_GATE" });
      toast.success("Parcel marked as arrived at gate");

    } catch (err) {
      console.error("❌ Mark arrived failed:", err);

      if (err.response?.status === 403 && err.response?.data?.message?.includes("shift")) {
        toast.warning(t("gcNotOnShift") || "You are not on shift. Please check your active shift.");
      } else {
        toast.error(t("gcError") || "An error occurred. Please try again.");
      }

      loadData(page);
    } finally {
      setProcessingId(null);
    }
  };

  // Verify OTP and complete collection
  const verifyAndCollect = async (id, otpValue) => {
    if (collectingId) return;

    const cleanOtp = String(otpValue ?? "").replace(/\D/g, "").slice(0, 4);

    if (cleanOtp.length !== 4) {
      toast.warning(t("gcOtpRequired") || "Please enter a valid 4-digit OTP");
      return;
    }

    setCollectingId(id);

    try {
      await API.put(`/parcels/${id}/status`, {
        status: "COLLECTED",
        pickup_code: cleanOtp,
      });

      setParcels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "COLLECTED" } : p))
      );
      setCounts((c) => shiftCount(c, "AT_GATE", "COLLECTED"));
      setCollectModalParcel(null);
      setModalOtp("");
      toast.success("✅ Parcel collected successfully!");
    } catch (err) {
      console.error("❌ Collect failed:", err);

      if (err.response?.status === 403 && err.response?.data?.message?.includes("shift")) {
        toast.warning(t("gcNotOnShift") || "You are not on shift. Please check your active shift.");
      } else if (err.response?.status === 400) {
        toast.error("❌ " + (t("gcInvalidOtp") || "Invalid OTP. Please check with resident and try again."));
      } else {
        toast.error(t("gcError") || "An error occurred. Please try again.");
      }
    } finally {
      setCollectingId(null);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(actionTimeoutRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const getStep = (status) => {
    if (status === "EXPECTED") return 1;
    if (status === "AT_GATE") return 2;
    if (status === "COLLECTED") return 3;
    if (status === "CANCELLED") return 3;
    return 1;
  };

  return (
    <div className="gc-page animate-fadeIn space-y-5">

      {/* ── HEADER ── */}
      <div className="gc-er">
        <div className="gc-er-left">
          <div className="ad-page-icon">
            <MdOutlineInventory2 size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("gcTitle")}</h2>
            <p className="page-subtitle">{counts.ALL} {t("gcTotalParcels") || "Total parcels"}</p>
          </div>
        </div>
      </div>

      {/* ── STATS CARDS (Admin Dashboard ad-kpi Style) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { key: "ALL", mod: "total", label: t("gcTotalParcels") || "Total parcels", count: counts.ALL },
          { key: "EXPECTED", mod: "expected", label: t("gcCountExpected") || "Expected", count: counts.EXPECTED },
          { key: "AT_GATE", mod: "gate", label: t("gcCountAtGate") || "At gate", count: counts.AT_GATE },
          { key: "COLLECTED", mod: "collected", label: t("gcCountCollected") || "Collected", count: counts.COLLECTED },
          { key: "CANCELLED", mod: "cancelled", label: t("gcCountCancelled") || "Cancelled", count: counts.CANCELLED },
        ].map((s) => {
          const isSelected = tab === s.key;
          return (
            <div
              key={s.key}
              onClick={() => { setTab(s.key); setPage(1); }}
              className={`ad-kpi ad-kpi--${s.mod} ${isSelected ? "ring-2 ring-white/40 shadow-md scale-[1.02]" : "hover:opacity-95"}`}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              <span className="ad-kpi-val">{s.count}</span>
              <span className="ad-kpi-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── TOOLBAR: Tabs on left, Search on right ── */}
      {!initialLoad && (
        <div className="ge-toolbar">
          <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
            <SlidingTabs
              className="gp-filter-tabs"
              value={tab}
              onChange={(next) => { setTab(next); setPage(1); }}
              tabs={[
                { id: "ALL", label: t("geFilterAll") || "All", badge: counts.ALL },
                { id: "EXPECTED", label: t("gcCountExpected") || "Expected", badge: counts.EXPECTED },
                { id: "AT_GATE", label: t("gcCountAtGate") || "At gate", badge: counts.AT_GATE, alert: counts.AT_GATE },
                { id: "COLLECTED", label: t("gcCountCollected") || "Collected", badge: counts.COLLECTED },
                { id: "CANCELLED", label: t("gcCountCancelled") || "Cancelled", badge: counts.CANCELLED },
              ]}
            />
          </div>

          <div className="ml-auto">
            <ExpandableSearch
              placeholder={t("gcSearch") || "Search courier, recipient..."}
              value={search}
              onChange={(val) => { setSearch(val); setPage(1); }}
            />
          </div>
        </div>
      )}

      {/* ── CARDS GRID / EMPTY STATES ── */}
      {initialLoad ? (
        <div className="gc-loading py-16 flex flex-col items-center justify-center gap-3">
          <Spinner size={28} />
          <p className="text-sm text-secondary">{t("gcLoading")}</p>
        </div>

      ) : parcels.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-secondary animate-fadeIn bg-card rounded-2xl p-6 border border-white/10">
          <MdOutlineInventory2 size={44} className="opacity-25" />
          <p className="text-sm">{search || tab !== "ALL" ? (t("gcEmptyFilter") || "No parcels match your filters") : t("gcEmpty")}</p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-accent hover:underline mt-1"
            >
              Clear search
            </button>
          )}
        </div>

      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {parcels.map((p, idx) => {
              const isExpected = p.status === "EXPECTED";
              const isAtGate = p.status === "AT_GATE";
              const isCollected = p.status === "COLLECTED";
              const isCancelled = p.status === "CANCELLED";

              // 3-Stage visual styles
              let cardTheme = "border-glass-border bg-card hover:border-white/20";
              let badgeBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
              let badgeIcon = <MdHourglassTop size={13} className="shrink-0 text-amber-400" />;
              let badgeText = "Pending Arrival";
              let iconContainer = "bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10";
              let progressStep = 1;

              if (isAtGate) {
                cardTheme = "border-cyan-500/35 bg-card hover:border-cyan-500/60 ring-1 ring-cyan-500/20";
                badgeBg = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-sm shadow-cyan-500/10";
                badgeIcon = <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />;
                badgeText = "At Security Gate";
                iconContainer = "bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10";
                progressStep = 2;
              } else if (isCollected) {
                cardTheme = "border-emerald-500/25 bg-card hover:border-emerald-500/45";
                badgeBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                badgeIcon = <MdDoneAll size={13} className="shrink-0 text-emerald-400" />;
                badgeText = "Collected";
                iconContainer = "bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10";
                progressStep = 3;
              } else if (isCancelled) {
                cardTheme = "border-rose-500/25 bg-card opacity-85";
                badgeBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                badgeIcon = <MdClose size={13} className="shrink-0" />;
                badgeText = "Cancelled";
                iconContainer = "bg-rose-500/15 text-rose-400";
                progressStep = 0;
              }

              const flatDisplay = p.Flat
                ? `${p.Flat?.Floor?.Block?.name ? `${p.Flat.Floor.Block.name} • ` : ""}Flat ${p.Flat?.flat_number || ""}`
                : "Unit —";

              const ownerName =
                p.resident?.name ||
                p.Flat?.User?.name ||
                p.Flat?.resident?.name ||
                p.Flat?.resident_name ||
                p.resident_name ||
                "";

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-lg shadow-sm group relative overflow-hidden ${cardTheme}`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Top Section: Hierarchy (Courier/Parcel -> Flat -> Resident -> Status) */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Integrated Icon Area */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconContainer} transition-transform duration-200 group-hover:scale-105`}>
                          <MdLocalShipping size={22} />
                        </div>

                        {/* Title & Flat Hierarchy */}
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-primary truncate leading-snug capitalize">
                            {p.courier_name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-secondary mt-0.5 font-medium truncate">
                            <MdApartment size={13.5} className="shrink-0 text-accent" />
                            <span className="truncate text-primary/85">{flatDisplay}</span>
                          </div>
                        </div>
                      </div>

                      {/* Prominent Elegant Status Indicator */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border shrink-0 ${badgeBg}`}>
                        {badgeIcon}
                        <span>{badgeText}</span>
                      </span>
                    </div>

                    {/* Glassmorphic Metadata Container */}
                    <div className="p-2.5 rounded-xl bg-card-inner-bg/80 border border-glass-border flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 truncate text-secondary" title={`Resident: ${ownerName}`}>
                        <MdPerson size={14} className="shrink-0 text-accent/80" />
                        <span className="truncate font-medium text-primary/90">
                          {ownerName || "Resident / Owner"}
                        </span>
                      </div>

                      {(p.createdAt || p.entry_time) && (
                        <div className="flex items-center gap-1 shrink-0 text-[11px] text-secondary font-medium tabular-nums">
                          <MdSchedule size={12} className="shrink-0 opacity-70" />
                          <span>
                            {new Date(p.entry_time || p.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Glowing Animated 3-Stage Delivery Journey Stepper */}
                    {!isCancelled && (
                      <div className="pt-2 pb-1">
                        <div className="flex items-center justify-between relative px-2">
                          {/* Background Connector Line */}
                          <div className="absolute left-6 right-6 top-[11px] h-[3px] bg-glass-border rounded-full z-0 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                progressStep === 1
                                  ? "w-0 bg-gradient-to-r from-amber-400 to-amber-500"
                                  : progressStep === 2
                                  ? "w-1/2 bg-gradient-to-r from-amber-400 via-cyan-400 to-blue-500 shadow-sm shadow-cyan-400/50"
                                  : "w-full bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-500 shadow-sm shadow-emerald-400/50"
                              }`}
                            />
                          </div>

                          {/* Step 1: Expected */}
                          <div className="flex flex-col items-center gap-1 z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                                progressStep >= 1
                                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105 ring-4 ring-amber-500/15"
                                  : "bg-card-inner-bg text-secondary border border-glass-border"
                              }`}
                            >
                              {progressStep > 1 ? "✓" : "1"}
                            </div>
                            <span className={`text-[10px] font-semibold tracking-tight ${progressStep >= 1 ? "text-amber-400" : "text-secondary/60"}`}>
                              Expected
                            </span>
                          </div>

                          {/* Step 2: At Gate */}
                          <div className="flex flex-col items-center gap-1 z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                                progressStep === 2
                                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/40 scale-110 ring-4 ring-cyan-500/20 animate-pulse"
                                  : progressStep > 2
                                  ? "bg-cyan-500 text-white shadow-sm"
                                  : "bg-card-inner-bg text-secondary border border-glass-border"
                              }`}
                            >
                              {progressStep > 2 ? "✓" : "2"}
                            </div>
                            <span className={`text-[10px] font-semibold tracking-tight ${progressStep >= 2 ? "text-cyan-400" : "text-secondary/60"}`}>
                              At Gate
                            </span>
                          </div>

                          {/* Step 3: Collected */}
                          <div className="flex flex-col items-center gap-1 z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                                progressStep >= 3
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40 scale-105 ring-4 ring-emerald-500/20"
                                  : "bg-card-inner-bg text-secondary border border-glass-border"
                              }`}
                            >
                              {progressStep >= 3 ? "✓" : "3"}
                            </div>
                            <span className={`text-[10px] font-semibold tracking-tight ${progressStep >= 3 ? "text-emerald-400" : "text-secondary/60"}`}>
                              Collected
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage-Based Action / Result Section */}
                  <div className="pt-1">
                    {isExpected && (
                      <button
                        onClick={() => markArrived(p.id)}
                        disabled={processingId === p.id || actionTimeoutRef.current[p.id]}
                        className="w-full justify-center py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-none transition-all shadow-amber-500/10 active:scale-[0.99]"
                      >
                        {processingId === p.id ? (
                          <><Spinner size={14} /> <span>Marking Arrived...</span></>
                        ) : (
                          <><MdOutlineDoorFront size={16} /> <span>{t("gcMarkArrived") || "Mark as Arrived at Gate"}</span></>
                        )}
                      </button>
                    )}

                    {isAtGate && (
                      <button
                        onClick={() => {
                          setCollectModalParcel(p);
                          setModalOtp("");
                        }}
                        className="w-full justify-center py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-none transition-all shadow-cyan-500/20 active:scale-[0.99]"
                      >
                        <MdVerified size={16} />
                        <span>{t("gcVerifyCollect") || "Verify Resident OTP & Collect"}</span>
                      </button>
                    )}

                    {isCollected && (
                      <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <MdCheckCircle size={17} className="text-emerald-400 shrink-0" />
                          <span>{t("gcCollectedMsg") || "Successfully Handed Over"}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25">
                          Verified
                        </span>
                      </div>
                    )}

                    {isCancelled && (
                      <div className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
                        <MdClose size={16} className="text-rose-400 shrink-0" />
                        <span className="tracking-wide">{t("gcCancelledMsg") || "Delivery Cancelled"}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination footer ── */}
          <div className="gc-footer flex items-center justify-between gap-3 flex-wrap pt-2">
            <span className="text-xs text-secondary">
              Showing{" "}
              <strong className="text-primary">
                {(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)}
              </strong>{" "}
              of <strong className="text-primary">{totalItems}</strong> parcels
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
          </div>
        </>
      )}

      {/* ── ULTRA-MODERN SECURITY RESIDENT OTP VERIFICATION TERMINAL ── */}
      <Modal
        isOpen={Boolean(collectModalParcel)}
        onClose={() => {
          if (!collectingId) {
            setCollectModalParcel(null);
            setModalOtp("");
          }
        }}
        title="Parcel Handover Terminal"
        subtitle="Verify resident 4-digit security code to authorize parcel release"
        icon={MdSecurity}
        size="md"
      >
        {collectModalParcel && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (modalOtp.length === 4) {
                verifyAndCollect(collectModalParcel.id, modalOtp);
              }
            }}
            className="space-y-4 pt-1"
          >
            {/* ── Holographic Handover Ticket / Pass ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card-inner-bg via-card-inner-bg/90 to-card-inner-bg/60 border border-glass-border p-4 shadow-lg backdrop-blur-md">
              {/* Subtle top ambient glow */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-cyan-500/20 blur-xl pointer-events-none rounded-full" />

              <div className="flex items-center justify-between gap-3 pb-3 border-b border-glass-border/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
                    <MdLocalShipping size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold tracking-wider text-secondary uppercase">
                      Courier Package
                    </div>
                    <div className="font-extrabold text-sm text-primary capitalize truncate">
                      {collectModalParcel.courier_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shrink-0">
                  <MdApartment size={14} />
                  <span className="font-bold text-xs">
                    {collectModalParcel.Flat
                      ? `${collectModalParcel.Flat?.Floor?.Block?.name ? `${collectModalParcel.Flat.Floor.Block.name}-` : ""}${collectModalParcel.Flat?.flat_number || ""}`
                      : "Flat"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider block">
                    Authorized Recipient
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {(collectModalParcel.resident?.name || collectModalParcel.Flat?.User?.name || "R").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-primary truncate">
                      {collectModalParcel.resident?.name || collectModalParcel.Flat?.User?.name || "Resident"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider block">
                    Handover Status
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Security Clearance
                  </span>
                </div>
              </div>
            </div>

            {/* ── 4-Digit Segmented PIN Interface ── */}
            <div className="space-y-3.5 py-1">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                  <MdVpnKey className="text-cyan-400" size={14} />
                  Enter 4-Digit Resident Passcode
                </div>
                <p className="text-[11px] text-secondary mt-0.5">
                  Type or paste the 4-digit pickup code shown in the resident's app
                </p>
              </div>

              {/* 4 Segmented Display Pods Container with Click-to-Focus */}
              <div
                className="relative max-w-[300px] mx-auto py-1 cursor-text select-none"
                onClick={() => otpInputRef.current?.focus()}
              >
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 pointer-events-none">
                  {[0, 1, 2, 3].map((digitIdx) => {
                    const char = modalOtp[digitIdx] || "";
                    const isCurrent = modalOtp.length === digitIdx;
                    return (
                      <div
                        key={digitIdx}
                        className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-2 flex items-center justify-center text-2xl sm:text-3xl font-black transition-all duration-200 ${
                          char
                            ? "border-cyan-400 bg-cyan-500/15 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] scale-105"
                            : isCurrent
                            ? "border-cyan-500/80 bg-card-inner-bg text-primary ring-4 ring-cyan-500/20 scale-105"
                            : "border-glass-border/60 bg-card-inner-bg/60 text-secondary"
                        }`}
                      >
                        {char ? (
                          <span className="animate-in zoom-in-50 duration-150">{char}</span>
                        ) : isCurrent ? (
                          <span className="w-3.5 h-0.5 bg-cyan-400 animate-pulse rounded-full" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-secondary/30" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Fully interactive hidden native input with complete keyboard, paste, and auto-focus */}
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={modalOtp}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setModalOtp(clean);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData?.getData("text") || "";
                    const clean = text.replace(/\D/g, "").slice(0, 4);
                    if (clean) {
                      setModalOtp(clean);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
                  style={{ caretColor: "transparent" }}
                />
              </div>

              {/* Quick Reset / Clear Badge */}
              {modalOtp.length > 0 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOtp("");
                      otpInputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold text-secondary hover:text-rose-400 bg-card-inner-bg/80 border border-glass-border/60 hover:border-rose-500/30 transition shadow-xs cursor-pointer"
                  >
                    <MdClear size={13} /> Clear Code
                  </button>
                </div>
              )}
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCollectModalParcel(null);
                  setModalOtp("");
                }}
                disabled={Boolean(collectingId)}
                className="px-4 py-3 rounded-xl text-xs font-semibold border border-glass-border bg-card-inner-bg hover:bg-white/10 text-secondary transition flex-1 text-center"
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={Boolean(collectingId) || modalOtp.length !== 4}
                className="flex-2 justify-center py-3 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white border-none shadow-lg shadow-cyan-600/25 flex items-center gap-2 rounded-xl transition-all active:scale-[0.99] cursor-pointer"
              >
                {collectingId ? (
                  <>
                    <Spinner size={16} />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <MdVerified size={17} />
                    <span>Authorize & Release Parcel</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}