
import { useEffect, useState, useRef, useContext, useCallback } from "react";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import {
  MdAdd,
  MdLocalShipping,
  MdOutlineInbox,
  MdOutlineInventory2,
  MdOutlineDoorFront,
  MdClose,
  MdVerified,
  MdQrCode,
  MdHome,
  MdDownload,
  MdPictureAsPdf,
  MdZoomOutMap,
  MdSearch,
  MdSchedule,
  MdPerson,
  MdApartment,
  MdCheckCircle,
  MdHourglassTop,
  MdDoneAll,
} from "react-icons/md";
import Modal from "../../components/Modal";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { toast } from "react-toastify";
import Select from "../../components/common/Select";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";

function Spinner({ size = 16 }) {
  return (
    <svg
      style={{ width: size, height: size }}
      className="animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function getFloorNumber(item) {
  const flatObj = item?.Flat || item;
  return (
    flatObj?.floor_number ??
    flatObj?.Floor?.floor_number ??
    item?.floor_number ??
    null
  );
}

function buildFlatLabel(item) {
  if (!item) return "";
  const flatObj = item.Flat || item;
  const block = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
  const unit = flatObj?.flat_number || item?.flat_number || "";
  const floor = getFloorNumber(item);
  const parts = [];
  if (block) parts.push(block);
  if (unit) parts.push(`Unit ${unit}`);
  if (floor !== null && floor !== undefined) parts.push(`Floor ${floor}`);
  return parts.join(" · ");
}

export default function MyCollection() {
  const { t } = useLang();
  const { user: authUser } = useContext(AuthContext);

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ courier_name: "" });
  const [trackParcel, setTrackParcel] = useState(null);
  const [qrParcel, setQrParcel] = useState(null);
  const qrRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const submitTimeoutRef = useRef(null);

  const [myFlats, setMyFlats] = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [checkingFlat, setCheckingFlat] = useState(true);

  const isOwner = authUser?.resident_type === "OWNER";
  const eligibleFlats = myFlats.filter((item) => {
    const flatObj = item.Flat || item;
    if (isOwner && flatObj.occupancy_status === "RENTED") return false;
    return true;
  });
  const hasEligibleFlat = eligibleFlats.length > 0;

  const [parcelFlatMap, setParcelFlatMap] = useState({});
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (!authUser?.id) return;

    const fetchProperties = async () => {
      try {
        let flatsArr = [];

        try {
          const res = await API.get(`/users/${authUser.id}/memberships`);
          const payload = res.data?.data || res.data;
          if (Array.isArray(payload) && payload.length > 0) {
            flatsArr = payload;
          } else if (payload?.all && Array.isArray(payload.all)) {
            flatsArr = payload.all;
          }
        } catch (err) {
          console.warn("[MyCollection] Attempt 1 FAILED:", err.message);
        }

        if (flatsArr.length === 0) {
          try {
            const res = await API.get("/users/get-flat");
            const payload = res.data?.data || res.data;
            if (Array.isArray(payload)) {
              flatsArr = payload;
            } else if (payload && typeof payload === "object") {
              if (payload.units && Array.isArray(payload.units)) flatsArr = payload.units;
              else if (payload.flats && Array.isArray(payload.flats)) flatsArr = payload.flats;
              else if (payload.flat_number || payload.Flat) flatsArr = [payload];
            }
          } catch (err2) {
            console.warn("[MyCollection] Attempt 2 FAILED:", err2.message);
          }
        }

        setMyFlats(flatsArr);

        if (flatsArr.length > 0 && !selectedFlatId) {
          const first = flatsArr[0];
          const fId = first.flat_id || first.id || first.Flat?.id;
          setSelectedFlatId(fId ? String(fId) : "");
        }
      } catch (error) {
        console.error("[MyCollection] Critical error fetching properties:", error);
      } finally {
        setCheckingFlat(false);
      }
    };

    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const fetchParcels = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      const res = await API.get(`/parcels${params.toString() ? `?${params.toString()}` : ""}`);
      const list = res.data?.data;
      const arr = Array.isArray(list) ? list : [];
      setParcels(arr);

      const map = {};
      arr.forEach((p) => {
        if (p.flat_id && p.Flat) {
          map[p.id] = buildFlatLabel({ Flat: p.Flat, flat_id: p.flat_id });
        } else if (p.flat_label) {
          map[p.id] = p.flat_label;
        }
      });
      setParcelFlatMap((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error(err);
      toast.error(t("parcelToastLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  useEffect(() => {
    const onCreated = (parcel) => {
      setParcels((prev) => {
        if (prev.find((p) => p.id === parcel.id)) return prev;
        const hasTempEntry = prev.some((p) => String(p.id).startsWith("temp_"));
        if (hasTempEntry) {
          return prev.map((p) =>
            String(p.id).startsWith("temp_") && p.courier_name === parcel.courier_name
              ? parcel
              : p
          );
        }
        return [parcel, ...prev];
      });
    };

    const onUpdated = (updated) => {
      setParcels((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    };

    const onOtp = ({ parcelId, otp }) => {
      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcelId ? { ...p, pickup_code: otp, status: "AT_GATE" } : p
        )
      );
    };

    socket.on("parcel_created", onCreated);
    socket.on("parcel_updated", onUpdated);
    socket.on("parcel_collected", onUpdated);
    socket.on("parcel_otp", onOtp);

    return () => {
      socket.off("parcel_created", onCreated);
      socket.off("parcel_updated", onUpdated);
      socket.off("parcel_collected", onUpdated);
      socket.off("parcel_otp", onOtp);
    };
  }, []);

  const expectParcel = async (e) => {
    e.preventDefault();

    if (submitting || submitTimeoutRef.current) {
      return;
    }

    if (isOwner && myFlats.length > 1 && !selectedFlatId) {
      toast.error(t("parcelToastSelectUnit"));
      return;
    }

    try {
      setSubmitting(true);

      submitTimeoutRef.current = setTimeout(() => {
        submitTimeoutRef.current = null;
      }, 2000);

      const chosenFlat =
        myFlats.find((item) => {
          const fId = item.flat_id || item.id || item.Flat?.id;
          return String(fId) === String(selectedFlatId);
        }) || myFlats[0];
      const chosenFlatLabel = buildFlatLabel(chosenFlat);

      const tempId = `temp_${Date.now()}`;
      const optimisticParcel = {
        id: tempId,
        courier_name: form.courier_name,
        status: "EXPECTED",
        entry_time: new Date().toISOString(),
        pickup_code: null,
        Flat: null,
        resident: null,
        _flatLabel: chosenFlatLabel,
      };

      setParcels((prev) => [optimisticParcel, ...prev]);
      if (chosenFlatLabel) {
        setParcelFlatMap((prev) => ({ ...prev, [tempId]: chosenFlatLabel }));
      }

      const courierName = form.courier_name;
      setForm({ courier_name: "" });
      setShowModal(false);

      const payload = { courier_name: courierName };
      if (isOwner && selectedFlatId) {
        payload.flat_id = selectedFlatId;
      }

      const res = await API.post("/parcels", payload);
      const realParcel = res.data;

      setParcels((prev) => prev.map((p) => (p.id === tempId ? realParcel : p)));

      setParcelFlatMap((prev) => {
        const next = { ...prev, [realParcel.id]: chosenFlatLabel };
        delete next[tempId];
        return next;
      });

      toast.success(t("parcelToastCreated"));
    } catch (err) {
      console.error("❌ Parcel creation failed:", err);
      setParcels((prev) => prev.filter((p) => !String(p.id).startsWith("temp_")));
      setShowModal(true);
      toast.error(err.response?.data?.message || t("parcelToastCreateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelParcel = async (id) => {
    if (cancellingId) return;
    try {
      setCancellingId(id);
      setParcels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "CANCELLED" } : p))
      );
      await API.put(`/parcels/${id}/status`, { status: "CANCELLED" });
      toast.success(t("parcelToastCancelled"));
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      toast.error(err.response?.data?.message || t("parcelToastCancelFailed"));
      fetchParcels();
    } finally {
      setCancellingId(null);
    }
  };

  /* ── QR export helpers ── */
  const expandQRCanvas = (canvas, px = 1024) => {
    const out = document.createElement("canvas");
    out.width = px; out.height = px;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, px, px);
    ctx.drawImage(canvas, (px - canvas.width) / 2, (px - canvas.height) / 2, canvas.width, canvas.height);
    return out;
  };

  const downloadQRPNG = (canvas, name) => {
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = expandQRCanvas(canvas).toDataURL("image/png");
    a.download = `${name}.png`;
    a.click();
  };

  const downloadQRPDF = (canvas, name, { title = "", code = "", meta = [] } = {}) => {
    if (!canvas) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 595, 842, "F");
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 297.5, 72, { align: "center" });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 297.5 - 128, 96, 256, 256);
    doc.setFontSize(26);
    doc.setTextColor(16, 185, 129);
    doc.text(code, 297.5, 410, { align: "center" });
    meta.forEach((line, i) => {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(line, 297.5, 440 + i * 16, { align: "center" });
    });
    doc.save(`${name}.pdf`);
  };

  const downloadQrPNG = () =>
    downloadQRPNG(qrRef.current, `Pickup_QR_${qrParcel?.pickup_code || "parcel"}`);
  const downloadQrPDF = () =>
    downloadQRPDF(qrRef.current, `Pickup_QR_${qrParcel?.pickup_code || "parcel"}`, {
      title: t("parcelTitle"),
      code: qrParcel?.pickup_code || "",
      meta: [
        qrParcel?.courier_name || "",
        flatLabelForParcel(qrParcel),
        t("parcelOtpSubtitle") || "Show this QR at the gate to collect your parcel",
      ].filter(Boolean),
    });

  const flatLabelForParcel = (p) => {
    if (!p) return "";
    return (p.Flat ? buildFlatLabel({ Flat: p.Flat }) : null) ||
      parcelFlatMap[p.id] || p._flatLabel || "";
  };

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, []);

  const counts = {
    total: parcels.length,
    expected: parcels.filter((p) => p.status === "EXPECTED").length,
    atGate: parcels.filter((p) => p.status === "AT_GATE").length,
    collected: parcels.filter((p) => p.status === "COLLECTED").length,
    cancelled: parcels.filter((p) => p.status === "CANCELLED").length,
  };

  const q = search.trim().toLowerCase();
  const visibleParcels = parcels.filter((p) => {
    if (tab !== "ALL" && p.status !== tab) return false;
    if (fromDate || toDate) {
      const pDate = p.createdAt || p.entry_time;
      if (!pDate) return false;
      const dt = new Date(pDate);
      if (isNaN(dt.getTime())) return false;
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      const d = `${y}-${m}-${day}`;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
    }
    if (!q) return true;
    const flat =
      (p.Flat ? buildFlatLabel({ Flat: p.Flat }) : "") ||
      parcelFlatMap[p.id] ||
      p._flatLabel ||
      "";
    return (
      (p.courier_name || "").toLowerCase().includes(q) ||
      (p.pickup_code || "").toLowerCase().includes(q) ||
      String(flat).toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOwner && myFlats.length === 1) {
      const first = myFlats[0];
      const fId = first.flat_id || first.id || first.Flat?.id;
      if (fId) setSelectedFlatId(String(fId));
    }
  }, [isOwner, myFlats]);

  const getStep = (status) => {
    if (status === "EXPECTED") return 1;
    if (status === "AT_GATE") return 2;
    if (status === "COLLECTED") return 3;
    if (status === "CANCELLED") return 3;
    return 1;
  };

  const pillClass = (status) =>
    status === "EXPECTED"
      ? "gc-pill--expected"
      : status === "AT_GATE"
      ? "gc-pill--atgate"
      : status === "COLLECTED"
      ? "gc-pill--collected"
      : "gc-pill--cancelled";

  const accentClass = (status) =>
    status === "EXPECTED"
      ? "gc-accent--expect"
      : status === "AT_GATE"
      ? "gc-accent--gate"
      : status === "COLLECTED"
      ? "gc-accent--done"
      : "gc-accent--cancel";

  const statusLabel = (status) => {
    if (status === "EXPECTED") return t("parcelExpected") || "Expected";
    if (status === "AT_GATE") return t("parcelAtGate") || "At Gate";
    if (status === "COLLECTED") return t("parcelCollected") || "Collected";
    if (status === "CANCELLED") return t("parcelCancelled") || "Cancelled";
    return status;
  };

  return (
    <div className="gc-page animate-fadeIn space-y-5">
      {/* ── HEADER ── */}
      <div className="gc-er flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="gc-er-left flex items-center gap-3.5">
          <div className="ad-page-icon">
            <MdOutlineInventory2 size={22} />
          </div>
          <div>
            <h2 className="gc-er-title page-title">{t("parcelTitle") || "My Deliveries & Parcels"}</h2>
            <p className="gc-er-sub page-subtitle">{counts.total} {t("parcelStatTotal") || "Total parcels"}</p>
          </div>
        </div>
        <div className="gc-er-actions flex items-center gap-2.5">
          <button
            onClick={() => hasEligibleFlat && setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
            disabled={submitting || checkingFlat || !hasEligibleFlat}
          >
            <MdAdd size={18} /> {t("parcelExpectBtn") || "Expect Parcel"}
          </button>
        </div>
      </div>

      {/* ── STATS CARDS (Admin Dashboard Aesthetic) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { key: "ALL", mod: "total", label: t("gcTotalParcels") || t("parcelStatTotal") || "Total parcels", count: counts.total },
          { key: "EXPECTED", mod: "expected", label: t("parcelExpected") || "Expected", count: counts.expected },
          { key: "AT_GATE", mod: "gate", label: t("parcelAtGate") || "At gate", count: counts.atGate },
          { key: "COLLECTED", mod: "collected", label: t("parcelCollected") || "Collected", count: counts.collected },
          { key: "CANCELLED", mod: "cancelled", label: t("parcelCancelled") || "Cancelled", count: counts.cancelled },
        ].map((s) => {
          const isSelected = tab === s.key;
          return (
            <div
              key={s.key}
              onClick={() => setTab(s.key)}
              className={`ad-kpi ad-kpi--${s.mod} ${isSelected ? "ring-2 ring-white/40 shadow-md scale-[1.02]" : "hover:opacity-95"}`}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              <span className="ad-kpi-val">{s.count}</span>
              <span className="ad-kpi-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {!checkingFlat && !hasEligibleFlat && (
        <div className="gc-warn rounded-2xl p-4 border border-amber-500/20 bg-amber-500/10 text-amber-400 text-sm">
          ⚠️{" "}
          {isOwner && myFlats.length > 0
            ? t("parcelOwnerRentedBlock")
            : t("compNoFlat") || "No unit associated with your account. Please contact admin."}
        </div>
      )}

      {/* ── TOOLBAR: Tabs on left, DateRange + Search on right ── */}
      {!loading && (
        <div className="ge-toolbar">
          <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
            <SlidingTabs
              className="gp-filter-tabs"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "ALL", label: t("geFilterAll") || "All", badge: counts.total },
                { id: "EXPECTED", label: t("parcelExpected") || "Expected", badge: counts.expected },
                { id: "AT_GATE", label: t("parcelAtGate") || "At Gate", badge: counts.atGate, alert: counts.atGate },
                { id: "COLLECTED", label: t("parcelCollected") || "Collected", badge: counts.collected },
                { id: "CANCELLED", label: t("parcelCancelled") || "Cancelled", badge: counts.cancelled },
              ]}
            />
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onChange={({ from, to }) => {
                setFromDate(from);
                setToDate(to);
              }}
              onClear={() => {
                setFromDate("");
                setToDate("");
              }}
            />
            <ExpandableSearch
              placeholder={t("gcSearch") || "Search courier, unit, code..."}
              value={search}
              onChange={setSearch}
            />
          </div>
        </div>
      )}

      {/* ── CARDS GRID / EMPTY STATES ── */}
      {loading ? (
        <div className="gc-loading py-16 flex flex-col items-center justify-center gap-3">
          <Spinner size={28} />
          <p className="text-sm text-secondary">{t("parcelLoading") || "Loading parcels..."}</p>
        </div>
      ) : visibleParcels.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-secondary animate-fadeIn bg-card rounded-2xl p-6 border border-glass-border">
          <MdOutlineInbox size={44} className="opacity-25" />
          <p className="text-sm font-medium">
            {search || tab !== "ALL" || fromDate || toDate
              ? (t("gcEmptyFilter") || "No parcels match your filters")
              : (t("parcelEmpty") || "No parcels found")}
          </p>
          {(search || tab !== "ALL" || fromDate || toDate) ? (
            <button
              onClick={() => { setSearch(""); setTab("ALL"); setFromDate(""); setToDate(""); }}
              className="text-xs text-accent hover:underline mt-1 font-semibold"
            >
              {t("parcelResetFilters")}
            </button>
          ) : (
            <button
              onClick={() => hasEligibleFlat && setShowModal(true)}
              disabled={!hasEligibleFlat}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold mt-2"
            >
              <MdAdd size={16} /> {t("parcelExpectBtn") || "Expect Parcel"}
            </button>
          )}
        </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleParcels.map((p, idx) => {
            const isTempParcel = String(p.id).startsWith("temp_");
            const flatLabel = flatLabelForParcel(p);

            const isExpected = p.status === "EXPECTED";
            const isAtGate = p.status === "AT_GATE";
            const isCollected = p.status === "COLLECTED";
            const isCancelled = p.status === "CANCELLED";

            // 3-Stage visual styles
            let cardTheme = "border-glass-border bg-card hover:border-white/20";
            let badgeBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
            let badgeIcon = <MdHourglassTop size={13} className="shrink-0 text-amber-400" />;
            let badgeText = t("parcelBadgePending");
            let iconContainer = "bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10";
            let progressStep = 1;

            if (isAtGate) {
              cardTheme = "border-cyan-500/35 bg-card hover:border-cyan-500/60 ring-1 ring-cyan-500/20";
              badgeBg = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-sm shadow-cyan-500/10";
              badgeIcon = <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />;
              badgeText = t("parcelBadgeAtGate");
              iconContainer = "bg-cyan-500/15 text-cyan-400 shadow-sm shadow-cyan-500/10";
              progressStep = 2;
            } else if (isCollected) {
              cardTheme = "border-emerald-500/25 bg-card hover:border-emerald-500/45";
              badgeBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
              badgeIcon = <MdDoneAll size={13} className="shrink-0 text-emerald-400" />;
              badgeText = t("parcelCollected");
              iconContainer = "bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10";
              progressStep = 3;
            } else if (isCancelled) {
              cardTheme = "border-rose-500/25 bg-card opacity-85";
              badgeBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
              badgeIcon = <MdClose size={13} className="shrink-0" />;
              badgeText = t("parcelCancelled");
              iconContainer = "bg-rose-500/15 text-rose-400";
              progressStep = 0;
            }

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
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-lg shadow-sm group relative overflow-hidden ${cardTheme} ${
                  isTempParcel ? "opacity-75" : ""
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Top Section: Hierarchy (Courier/Parcel -> Flat -> Resident -> Status) */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Integrated Icon Container */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconContainer} transition-transform duration-200 group-hover:scale-105`}>
                        {isTempParcel ? <Spinner size={18} /> : <MdLocalShipping size={22} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base font-bold text-primary truncate leading-snug capitalize">
                            {p.courier_name}
                          </h3>
                          {isTempParcel && (
                            <span className="text-[10px] font-medium text-secondary">
                              {t("parcelTempCreating")}
                            </span>
                          )}
                        </div>
                        {flatLabel && (
                          <div className="flex items-center gap-1.5 text-xs text-secondary mt-0.5 font-medium truncate">
                            <MdApartment size={13.5} className="shrink-0 text-accent" />
                            <span className="truncate text-primary/85">{flatLabel}</span>
                          </div>
                        )}
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
                    <div className="flex items-center gap-1.5 min-w-0 truncate text-secondary" title={t("parcelResidentTitle", { name: ownerName })}>
                      <MdPerson size={14} className="shrink-0 text-accent/80" />
                      <span className="truncate font-medium text-primary/90">
                        {ownerName || t("parcelResidentFallback")}
                      </span>
                    </div>

                    {(p.entry_time || p.createdAt) && (
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
                        <div className="absolute left-6 right-6 top-2.75 h-0.75 bg-glass-border rounded-full z-0 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              progressStep === 1
                                ? "w-0 bg-linear-to-r from-amber-400 to-amber-500"
                                : progressStep === 2
                                ? "w-1/2 bg-linear-to-r from-amber-400 via-cyan-400 to-blue-500 shadow-sm shadow-cyan-400/50"
                                : "w-full bg-linear-to-r from-amber-400 via-cyan-400 to-emerald-500 shadow-sm shadow-emerald-400/50"
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
                            {t("parcelExpected")}
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
                            {t("parcelAtGate")}
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
                            {t("parcelCollected")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Section based on status */}
                <div className="pt-1">
                  {isExpected && (
                    <div className="text-xs font-medium text-secondary bg-card-inner-bg border border-glass-border rounded-xl px-3.5 py-2.5 text-center flex items-center justify-center gap-2">
                      <MdHourglassTop size={14} className="text-amber-400 shrink-0" />
                      <span>{t("parcelWaiting") || "Waiting for courier to arrive at the gate."}</span>
                    </div>
                  )}

                  {isAtGate && (
                    <div className="space-y-2.5">
                      {p.pickup_code && (
                        <div className="flex items-center justify-between gap-3 bg-linear-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/25 rounded-2xl p-3.5 shadow-sm">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-0.5">
                              {t("parcelOtpLabel") || "Pickup OTP"}
                            </span>
                            <span className="text-2xl font-extrabold text-primary tracking-[0.25em] tabular-nums">
                              {p.pickup_code}
                            </span>
                          </div>

                          <button
                            onClick={() => setQrParcel(p)}
                            className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl shrink-0 shadow-sm"
                            title={t("parcelQrViewTitle")}
                          >
                            <MdQrCode size={16} className="text-accent" />
                            <span>{t("parcelQrButton")}</span>
                          </button>
                        </div>
                      )}

                      {!isTempParcel && (
                        <button
                          onClick={() => cancelParcel(p.id)}
                          disabled={cancellingId === p.id}
                          className="w-full btn-danger flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl shadow-sm"
                        >
                          {cancellingId === p.id ? (
                            <>
                              <Spinner size={14} />
                              <span>{t("parcelCancelling")}</span>
                            </>
                          ) : (
                            <>
                              <MdClose size={15} />
                              <span>{t("parcelCancelBtn") || "Cancel Delivery"}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {isCollected && (
                    <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <MdCheckCircle size={17} className="text-emerald-400 shrink-0" />
                        <span>{t("parcelDelivered") || "Successfully Handed Over"}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25">
                        {t("parcelVerified")}
                      </span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
                      <MdClose size={16} className="text-rose-400 shrink-0" />
                      <span className="tracking-wide">{t("parcelCancelledBanner") || "Delivery Cancelled"}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => !submitting && setShowModal(false)}
        title={t("parcelModalTitle")}
      >
        <form onSubmit={expectParcel} className="space-y-4">
          {isOwner && eligibleFlats.length > 1 && (
            <div>
              <label className="text-xs text-secondary block mb-1.5">
                {t("selectUnit")} <span style={{ color: "var(--stat-red-color)" }}>*</span>
              </label>
              <Select
                className="input h-11 w-full"
                style={{ cursor: "pointer" }}
                value={selectedFlatId}
                onChange={(e) => setSelectedFlatId(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="" disabled>
                  {t("parcelChooseDeliveryUnit")}
                </option>
                {eligibleFlats.map((item, index) => {
                  const flatObj = item.Flat || item;
                  const fId = item.flat_id || flatObj.id || `fallback-${index}`;
                  const bName = flatObj?.Block?.name || item?.block_name || flatObj?.block_name || "";
                  const fNum = flatObj?.flat_number || item?.flat_number || "";
                  const floorNum = getFloorNumber(item);
                  const floor = floorNum !== null && floorNum !== undefined ? `(Floor ${floorNum})` : "";
                  return (
                    <option key={fId} value={String(fId)}>
                      {bName ? `${bName} - ` : ""}Unit {fNum} {floor}
                    </option>
                  );
                })}
              </Select>
            </div>
          )}

          {eligibleFlats.length === 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 12,
                background: "var(--card-inner-bg)",
                border: "1px solid var(--glass-border)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <MdHome size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span>
                {t("parcelForLabel")}{" "}
                <strong style={{ color: "var(--text-primary)" }}>{buildFlatLabel(eligibleFlats[0])}</strong>
              </span>
            </div>
          )}

          <div>
            <label className="text-xs text-secondary block mb-1.5">{t("parcelCourierLabel")}</label>
            <input
              className="input h-11 w-full"
              placeholder={t("parcelCourierPlaceholder")}
              required
              disabled={submitting}
              value={form.courier_name}
              onChange={(e) => setForm({ ...form, courier_name: e.target.value })}
              autoFocus={!(isOwner && eligibleFlats.length > 1)}
            />
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !form.courier_name.trim() ||
              (isOwner && eligibleFlats.length > 1 && !selectedFlatId)
            }
            className="gc-btn gc-btn--accent"
          >
            {submitting ? (
              <>
                <Spinner size={16} />
                <span>{t("parcelCreating")}</span>
              </>
            ) : (
              <>
                <MdLocalShipping />
                <span>{t("parcelSubmitBtn")}</span>
              </>
            )}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={!!trackParcel}
        onClose={() => setTrackParcel(null)}
        title={t("parcelTrackTitle") || "Parcel Tracking"}
      >
        {trackParcel &&
          (() => {
            const tp = trackParcel;
            const tpCancelled = tp.status === "CANCELLED";
            const tpStep = getStep(tp.status);
            const steps = [
              {
                label: t("parcelExpected"),
                icon: <MdOutlineInventory2 size={18} />,
                state:
                  tpCancelled || tp.status === "COLLECTED" || tpStep >= 1
                    ? tp.status === "EXPECTED" ? "active" : "done"
                    : "todo",
              },
              {
                label: t("parcelAtGate"),
                icon: <MdOutlineDoorFront size={18} />,
                state:
                  tpCancelled || tp.status === "COLLECTED" || tpStep >= 2
                    ? tp.status === "AT_GATE" ? "active" : "done"
                    : "todo",
              },
              {
                label: tpCancelled ? t("parcelCancelled") : t("parcelCollected"),
                icon: tpCancelled ? <MdClose size={18} /> : <MdVerified size={18} />,
                state:
                  tp.status === "COLLECTED" || tpCancelled
                    ? "done"
                    : tpStep >= 3
                    ? "active"
                    : "todo",
              },
            ];
            return (
              <div className="gc-track">
                <div className="gc-track-head">
                  <div className="gc-head-icon" style={{ width: 40, height: 40, fontSize: 20 }}>
                    <MdLocalShipping />
                  </div>
                  <div className="gc-head-text">
                    <h3 className="gc-head-title" style={{ fontSize: 15 }}>{tp.courier_name}</h3>
                    <p className="gc-otp-show-hint" style={{ marginTop: 3 }}>
                      {flatLabelForParcel(tp)}
                    </p>
                  </div>
                  <span className={`gc-pill ${pillClass(tp.status)}`}>
                    <span className="gc-pill-dot" />
                    {statusLabel(tp.status)}
                  </span>
                </div>

                <div className="gc-track-timeline">
                  {steps.map((s, i) => (
                    <div key={i} className={`gc-track-step gc-track-step--${s.state}`}>
                      <div className="gc-track-dot">{s.icon}</div>
                      <div className="gc-track-line" />
                      <div className="gc-track-content">
                        <p className="gc-track-label">{s.label}</p>
                        {tp.entry_time && i === 0 && (
                          <p className="gc-track-time">
                            {new Date(tp.entry_time).toLocaleString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        )}
                        {i === 1 && tp.pickup_code && (
                          <p className="gc-track-time">
                            {t("parcelOtpLabel")}: {tp.pickup_code}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="gc-track-note">
                  {tpCancelled
                    ? (t("parcelCancelledBanner") || "This parcel was cancelled.")
                    : tp.status === "COLLECTED"
                    ? (t("parcelDelivered") || "This parcel was collected from the gate.")
                    : tp.status === "AT_GATE"
                    ? (t("parcelOtpSubtitle") || "Show this QR at the gate to collect your parcel")
                    : (t("parcelWaiting") || "Waiting for the parcel to arrive at the gate")}
                </div>
              </div>
            );
          })()}
      </Modal>

      <Modal
        isOpen={!!qrParcel}
        onClose={() => setQrParcel(null)}
        title={t("parcelQrView") || "Pickup QR"}
      >
        {qrParcel && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div className="gc-otp-qr gc-otp-qr--large">
              <QRCodeCanvas ref={qrRef} value={String(qrParcel.pickup_code)} size={200} />
            </div>
            <p className="gc-otp-code" style={{ fontSize: 40 }}>
              {qrParcel.pickup_code}
            </p>
            <p className="gc-otp-show-hint" style={{ textAlign: "center", margin: 0 }}>
              {t("parcelOtpSubtitle") || "Show this QR at the gate to collect your parcel"}
            </p>
            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 6 }}>
              <button onClick={downloadQrPNG} className="gc-btn gc-btn--compact gc-btn--accent">
                <MdDownload size={16} />
                <span>PNG</span>
              </button>
              <button onClick={downloadQrPDF} className="gc-btn gc-btn--compact gc-btn--success">
                <MdPictureAsPdf size={16} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
