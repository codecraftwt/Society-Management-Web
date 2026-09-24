import { useEffect, useState, useContext, useRef, useMemo } from "react";
import API from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import {
  MdPersonAdd, MdPhone, MdDirectionsCar,
  MdCalendarToday, MdQrCode, MdWarning,
  MdCheckCircle, MdContentCopy, MdPerson,
  MdVisibility, MdDownload, MdPictureAsPdf,
  MdSearch, MdOutlineInbox, MdHome, MdHistory,
} from "react-icons/md";
import { QRCodeCanvas } from "qrcode.react";
import Modal from "../../components/Modal";
import Select from "../../components/common/Select";
import { jsPDF } from "jspdf";
import Pagination from "../../components/common/Pagination";
import { getTitleError, getMobileError, getVehicleNumberError } from "../../utils/validators";

/* ── IST date helpers ── */
const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const formatDateIST = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/* ── Purpose maps ── */
const PURPOSE_ICONS = {
  GUEST:       "👤",
  DELIVERY:    "📦",
  CAB:         "🚕",
  SERVICE:     "🔧",
  MAINTENANCE: "🏗️",
  OTHER:       "🔖",
};

const PURPOSE_COLORS = {
  GUEST:       { bg: "rgba(var(--acct-purple-rgb),0.12)",  border: "rgba(var(--acct-purple-rgb),0.28)",  text: "var(--accent)" },
  DELIVERY:    { bg: "rgba(160,90,255,0.12)",  border: "rgba(160,90,255,0.28)",  text: "var(--accent)" },
  CAB:         { bg: "rgba(107,70,193,0.12)",  border: "rgba(107,70,193,0.28)",  text: "#6B46C1" },
  SERVICE:     { bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.28)",   text: "#22c55e" },
  MAINTENANCE: { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.25)",   text: "#ef4444" },
  OTHER:       { bg: "rgba(114,105,136,0.12)", border: "rgba(114,105,136,0.25)", text: "#726988" },
};

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function ResidentPreApproval() {
  const { t } = useLang();
  const { user: authUser } = useContext(AuthContext);
  const isOwner = authUser?.resident_type === "OWNER";

  const [flatAssigned, setFlatAssigned] = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [myPasses,     setMyPasses]     = useState([]);
  const [search,       setSearch]       = useState("");
  const [filterPurpose, setFilterPurpose] = useState("ALL");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [copiedId,     setCopiedId]     = useState(null);
  const [myFlats,      setMyFlats]      = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [istTime,      setIstTime]      = useState("");
  const [istDate,      setIstDate]      = useState("");
  const [viewPass,     setViewPass]     = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [activeTab,    setActiveTab]    = useState("active");
  const [page,         setPage]         = useState(1);
  const [limit,        setLimit]        = useState(10);
  const viewPassQrRef  = useRef(null);

  const clearFilters = () => {
    setSearch("");
    setFilterPurpose("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(search.trim() || filterPurpose !== "ALL" || dateFrom || dateTo);

  const filteredPasses = useMemo(() => {
    return myPasses.filter((p) => {
      if (filterPurpose !== "ALL" && p.purpose !== filterPurpose) return false;

      const pDate = p.valid_date ? p.valid_date.split("T")[0] : null;
      if (dateFrom && pDate && pDate < dateFrom) return false;
      if (dateTo && pDate && pDate > dateTo) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          p.visitor_name?.toLowerCase().includes(q) ||
          p.mobile?.toLowerCase().includes(q) ||
          p.vehicle_number?.toLowerCase().includes(q) ||
          p.otp?.toLowerCase().includes(q) ||
          p.purpose?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [myPasses, filterPurpose, dateFrom, dateTo, search]);

  const pendingPasses = useMemo(
    () => filteredPasses.filter((p) => p.status !== "USED" && p.status !== "EXPIRED"),
    [filteredPasses]
  );
  const historyPasses = useMemo(
    () => filteredPasses.filter((p) => p.status === "USED" || p.status === "EXPIRED"),
    [filteredPasses]
  );

  const activeTotalPages = Math.max(1, Math.ceil(pendingPasses.length / limit));
  const historyTotalPages = Math.max(1, Math.ceil(historyPasses.length / limit));
  const totalPages = activeTab === "active" ? activeTotalPages : historyTotalPages;
  const safePage = Math.min(page, totalPages);
  const pagePasses = useMemo(() => {
    const source = activeTab === "active" ? pendingPasses : historyPasses;
    return source.slice((safePage - 1) * limit, safePage * limit);
  }, [activeTab, pendingPasses, historyPasses, safePage, limit]);

  const todayIST = getTodayIST();

  // Flat-aware helpers — passes coming from the backend now carry flat_number
  // (single source of truth shared with the App).
  const flatLabelOf = (pass) => {
    if (pass?.flat_number) return pass.flat_number;
    const flatObj = pass?.Flat || null;
    return flatObj?.flat_number || null;
  };

  const groups = useMemo(() => {
    const pending = [];
    const history = [];
    myPasses.forEach((p) => {
      if (p.status === "USED" || p.status === "EXPIRED") history.push(p);
      else pending.push(p);
    });
    return { pending, history };
  }, [myPasses]);

  const counts = useMemo(() => {
    const total = myPasses.length;
    const today = groups.pending.filter(p => p.valid_date?.startsWith(todayIST)).length;
    const active = groups.pending.length;
    return { total, today, active, used: groups.history.length };
  }, [myPasses, groups, todayIST]);

  const eligibleFlats = myFlats.filter(item => {
    const flatObj = item.Flat || item;
    if (isOwner && flatObj.occupancy_status === "RENTED") return false;
    return true;
  });
  const hasEligibleFlat = eligibleFlats.length > 0;

  const [form, setForm] = useState({
  visitor_name: "",
  mobile: "",
  vehicle_number: "",
  purpose: "",
  valid_date: "",
});

  const purposeLabels = {
    GUEST: t("preapPurposeGuest"),
    DELIVERY: t("preapPurposeDelivery"),
    CAB: t("preapPurposeCab"),
    SERVICE: t("preapPurposeService"),
    MAINTENANCE: t("preapPurposeMaintenance"),
    OTHER: t("preapPurposeOther"),
  };

  /* ── Live IST clock ── */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
        })
      );
      setIstDate(
        now.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short", day: "2-digit", month: "short", year: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── API calls ── */
  const fetchMyPasses = async () => {
    try {
      const res = await API.get("/preapproval/my");
      setMyPasses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkFlat = async () => {
    try {
      const res = await API.get("/users/get-flat");
      const data = res.data;
      const flats = Array.isArray(data)
        ? data
        : data?.flats
          ? data.flats
          : data?.flat_number
            ? [data]
            : [];

      setMyFlats(flats);
      const hasFlat = flats.length > 0;
      setFlatAssigned(hasFlat);
      if (hasFlat) {
        setSelectedFlatId(flats[0].flat_id || flats[0].id || "");
      }
    } catch (err) {
      console.error(err);
      setMyFlats([]);
      setFlatAssigned(false);
    }
  };

  useEffect(() => {
    checkFlat();
    fetchMyPasses();
  }, []);

  /* ── Form submit ── */
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!hasEligibleFlat) return;

  // ✅ simple validation
  const nameErr = getTitleError(form.visitor_name, t("preapVisitorName"));
  if (nameErr) { alert(nameErr); return; }

  const mobileErr = getMobileError(form.mobile, t("preapMobile"));
  if (mobileErr) { alert(mobileErr); return; }

  if (form.vehicle_number) {
    const vehicleErr = getVehicleNumberError(form.vehicle_number);
    if (vehicleErr) { alert(vehicleErr); return; }
  }

  if (!form.valid_date || !form.purpose) {
    alert(t("preapFillRequired"));
    return;
  }

  try {
    setSubmitting(true);

    const payload = {
      flat_id: selectedFlatId,
      visitor_name: form.visitor_name.trim(),
      mobile: form.mobile.trim(),
      vehicle_number: form.vehicle_number.trim(),
      purpose: form.purpose,
      valid_date: form.valid_date, // YYYY-MM-DD
    };

    const res = await API.post("/preapproval", payload);

    const newPass = res.data.preApproval || {
      otp: res.data.GatePass,
      visitor_name: form.visitor_name,
      mobile: form.mobile,
      vehicle_number: form.vehicle_number,
      purpose: form.purpose,
      valid_date: form.valid_date,
    };

    setShowForm(false);
    setViewPass(newPass);

    setForm({
      visitor_name: "",
      mobile: "",
      vehicle_number: "",
      purpose: "",
      valid_date: "",
    });

    fetchMyPasses();
  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err);
  } finally {
    setSubmitting(false);
  }
};

  const handleCopyPass = async (otp, id) => {
    try {
      await navigator.clipboard.writeText(otp);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = otp;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ── QR download helpers ── */
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

  const downloadViewPNG = () => downloadQRPNG(viewPassQrRef.current, `Gate_Pass_${viewPass?.otp || "QR"}`);
  const downloadViewPDF = () => downloadQRPDF(viewPassQrRef.current, `Gate_Pass_${viewPass?.otp || "QR"}`, {
    title: t("preapTitle"),
    code: viewPass?.otp || "",
    meta: [viewPass?.visitor_name || "", viewPass ? `${t("preapValidDate")}: ${formatDateIST(viewPass.valid_date)}` : ""].filter(Boolean),
  });

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdPersonAdd size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("preapTitle")}</h2>
            <p className="page-subtitle">{t("preapRecorded", { count: counts.total })}</p>
          </div>
        </div>

        {hasEligibleFlat && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary justify-center px-5 py-2.5 text-sm font-semibold"
          >
            <MdQrCode size={18} /> {t("preapGenerateBtn")}
          </button>
        )}
      </div>

      {/* ── STATS CARDS ── */}
      <div className="ge-stats">
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{counts.total}</span>
          <span className="complaint-stat-label">{t("preapStatTotal")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{counts.today}</span>
          <span className="complaint-stat-label">{t("preapStatToday")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved">
          <span className="complaint-stat-val">{counts.active}</span>
          <span className="complaint-stat-label">{t("preapStatActive")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved" style={{ borderLeftColor: "#8b5cf6" }}>
          <span className="complaint-stat-val">{counts.used}</span>
          <span className="complaint-stat-label">{t("preapStatUsed")}</span>
        </div>
      </div>

      {/* ── LIVE IST CLOCK ── */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm">
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <span className="text-secondary text-xs">{t("preapIstLabel")}</span>
        <span className="ml-auto font-mono text-xs font-medium tabular-nums text-secondary tracking-wide">
          {istDate}&nbsp;&nbsp;{istTime}
        </span>
      </div>

      {/* ── NO FLAT WARNING ── */}
      {!flatAssigned && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl p-4 animate-scaleIn">
          <MdWarning size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400/90 leading-relaxed">{t("preapNoFlat")}</p>
        </div>
      )}

      {/* ── OWNER RENTED WARNING ── */}
      {flatAssigned && !hasEligibleFlat && isOwner && (
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl p-4 animate-scaleIn">
          <MdWarning size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-400/90 leading-relaxed">{t("preapOwnerRentedWarn")}</p>
        </div>
      )}

      {/* ── GENERATE PASS MODAL ── */}
      <Modal
        isOpen={showForm}
        onClose={() => { if (!submitting) setShowForm(false); }}
        title={t("preapVisitorDetails")}
        icon={MdQrCode}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {myFlats.length > 0 && (
            <div>
              <label className="text-xs text-secondary mb-1.5 block">
                {t("preapSelectFlat") || "Select Flat"} <span className="text-red-400">*</span>
              </label>
              <Select
                className="input h-11 w-full"
                value={selectedFlatId}
                onChange={(e) => setSelectedFlatId(e.target.value)}
                required
              >
                {eligibleFlats.map((flat) => (
                  <option key={flat.flat_id || flat.id} value={flat.flat_id || flat.id}>
                    {t("rdFlat")} {flat.Flat?.flat_number || flat.flat_number || flat.flatNumber || flat.number || "—"}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Row 1: Name + Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary mb-1.5 block">
                {t("preapVisitorName")} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MdPerson size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                <input
                  className="input h-11 w-full pl-9"
                  placeholder={t("preapVisitorNamePlaceholder")}
                  required
                  value={form.visitor_name}
                  onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-secondary mb-1.5 block">
                {t("preapMobile")} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MdPhone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                <input
                  className="input h-11 w-full pl-9"
                  placeholder={t("preapMobilePlaceholder")}
                  required
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Vehicle + Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary mb-1.5 block">{t("preapVehicle")}</label>
              <div className="relative">
                <MdDirectionsCar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                <input
                  className="input h-11 w-full pl-9"
                  placeholder={t("preapVehiclePlaceholder")}
                  value={form.vehicle_number}
                  onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-secondary mb-1.5 block">
                {t("preapPurpose")} <span className="text-red-400">*</span>
              </label>
              <Select
                className="input h-11 w-full"
                required
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              >
                <option value="">{t("preapSelectPurpose")}</option>
                {Object.entries(PURPOSE_ICONS).map(([val, emoji]) => (
                  <option key={val} value={val}>
                    {emoji} {purposeLabels[val]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Row 3: Valid Date */}
          <div className="sm:w-1/2">
            <label className="text-xs text-secondary mb-1.5 block">
              {t("preapValidDate")} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                className="input h-11 w-full"
                value={form.valid_date}
                onChange={(e) => setForm({ ...form, valid_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-secondary transition flex-1 text-center"
            >
              {t("cancel") || "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting || !hasEligibleFlat}
              className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? <><Spinner /> {t("preapGenerating")}</>
                : <><MdQrCode size={17} /> {t("preapGenerateBtn")}</>
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── TOOLBAR (Purpose Tabs + Date Range Filter + Expandable Search) ── */}
      {myPasses.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="overflow-x-auto max-w-full pb-1 sm:pb-0">
            <SlidingTabs
              tabs={[
                { id: "ALL", label: t("compTabAll") || "All" },
                { id: "GUEST", label: t("preapPurposeGuest") || "Guest" },
                { id: "DELIVERY", label: t("preapPurposeDelivery") || "Delivery" },
                { id: "CAB", label: t("preapPurposeCab") || "Cab" },
                { id: "SERVICE", label: t("preapPurposeService") || "Service" },
                { id: "MAINTENANCE", label: t("preapPurposeMaintenance") || "Maintenance" },
                { id: "OTHER", label: t("preapPurposeOther") || "Other" },
              ]}
              value={filterPurpose}
              onChange={(id) => { setFilterPurpose(id); setPage(1); }}
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between sm:justify-end ml-auto sm:ml-0">
            <DateRangeFilter
              fromDate={dateFrom}
              toDate={dateTo}
              onChange={({ from, to }) => {
                setDateFrom(from);
                setDateTo(to);
                setPage(1);
              }}
              onClear={() => {
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              placeholder={t("preapValidDate")}
            />

            <ExpandableSearch
              placeholder={t("preapSearch")}
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
            />
          </div>
        </div>
      )}

      {/* ── TAB BAR (Active / History) ── */}
      {myPasses.length > 0 && (
        <SlidingTabs
          items={[
            { id: "active", label: t("preapTabActive") || "Active", badge: pendingPasses.length },
            { id: "history", label: t("preapTabHistory") || "History", badge: historyPasses.length },
          ]}
          value={activeTab}
          onChange={(id) => { setActiveTab(id); setPage(1); }}
          fullWidth
        />
      )}

      {/* ── PASSES LIST / EMPTY STATES ── */}
      {myPasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-secondary animate-fadeIn bg-card rounded-2xl p-6 border border-white/10">
          <MdOutlineInbox size={48} className="opacity-20" />
          <p className="text-sm">{t("preapEmpty")}</p>
          {hasEligibleFlat && (
            <button onClick={() => setShowForm(true)} className="btn-primary mt-1">
              <MdQrCode size={16} /> {t("preapGenerateBtn")}
            </button>
          )}
        </div>
      ) : (activeTab === "active" ? pendingPasses : historyPasses).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-secondary animate-fadeIn bg-card rounded-2xl p-6 border border-white/10">
          <MdSearch size={36} className="opacity-25" />
          <p className="text-sm">{t("preapNoMatch")}</p>
          <button
            onClick={clearFilters}
            className="text-xs text-accent hover:underline mt-1"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {t("billClearFilters") || "Clear all filters"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "active" ? (
            /* ── ACTIVE PASSES (paginated) ── */
            <>
              <div className="flex items-center gap-2 mb-2.5">
                <MdQrCode size={16} className="text-green-400" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {t("preapStatActive") || "Active Passes"} <span className="text-secondary font-normal">({pendingPasses.length})</span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pagePasses.map((pass, idx) => {
                  const pc = PURPOSE_COLORS[pass.purpose] || PURPOSE_COLORS.OTHER;
                  const isCopied = copiedId === pass.id;
                  const flatLabel = flatLabelOf(pass);

                  return (
                    <div
                      key={pass.id}
                      className="rounded-xl overflow-hidden border border-white/10 bg-white/5 animate-fadeIn"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="h-0.5" style={{ background: pc.text }} />

                      <div className="p-3.5 flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                              style={{ background: pc.bg, border: `1px solid ${pc.border}` }}
                            >
                              {PURPOSE_ICONS[pass.purpose] || "🔖"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{pass.visitor_name}</p>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                                style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}
                              >
                                {purposeLabels[pass.purpose] || pass.purpose}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded shrink-0 font-medium bg-green-500/20 text-green-400">
                            {t("preapActive") || "Active"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p className="text-2xl font-bold tracking-[0.2em] text-green-300 tabular-nums">
                            {pass.otp}
                          </p>
                          <div className="bg-white rounded-lg p-1 shrink-0">
                            <QRCodeCanvas value={pass.otp} size={40} />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {flatLabel && (
                            <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              <MdHome size={11} /> {t("rdFlat") || "Flat"} {flatLabel}
                            </span>
                          )}
                          {pass.vehicle_number && (
                            <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              <MdDirectionsCar size={11} /> {pass.vehicle_number}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                            <MdCalendarToday size={10} /> {t("preapValidTill", { date: formatDateIST(pass.valid_date) })}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewPass(pass)}
                            className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                          >
                            <MdVisibility size={13} /> {t("preapViewPass") || "View Pass"}
                          </button>
                          <button
                            onClick={() => handleCopyPass(pass.otp, pass.id)}
                            className={`flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                              isCopied
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-white/8 text-secondary border-white/10 hover:bg-white/12 hover:opacity-90"
                            }`}
                          >
                            {isCopied ? <MdCheckCircle size={13} /> : <MdContentCopy size={13} />}
                            {isCopied ? t("preapCopied") : t("preapCopyCode")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── PASS HISTORY (paginated) ── */
            <>
              <div className="flex items-center gap-2 mb-2.5">
                <MdHistory size={16} className="text-secondary" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {t("preapSectionHistory") || "Pass History"} <span className="text-secondary font-normal">({historyPasses.length})</span>
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pagePasses.map((pass, idx) => {
                  const pc = PURPOSE_COLORS[pass.purpose] || PURPOSE_COLORS.OTHER;
                  const isUsed = pass.status === "USED";
                  const flatLabel = flatLabelOf(pass);

                  return (
                    <div
                      key={pass.id}
                      className="rounded-xl overflow-hidden border border-white/10 bg-white/5 animate-fadeIn opacity-90"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="h-0.5" style={{ background: isUsed ? "#3b82f6" : "#ef4444" }} />

                      <div className="p-3.5 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 opacity-70"
                              style={{ background: pc.bg, border: `1px solid ${pc.border}` }}
                            >
                              {PURPOSE_ICONS[pass.purpose] || "🔖"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{pass.visitor_name}</p>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                                style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}
                              >
                                {purposeLabels[pass.purpose] || pass.purpose}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 font-medium ${
                            isUsed ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {isUsed ? t("preapUsed") || "Used" : t("preapExpired") || "Expired"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {flatLabel && (
                            <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              <MdHome size={11} /> {t("rdFlat") || "Flat"} {flatLabel}
                            </span>
                          )}
                          {pass.mobile && (
                            <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              <MdPhone size={10} /> {pass.mobile}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-secondary px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                            <MdCalendarToday size={10} /> {formatDateIST(pass.valid_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={(p) => { setPage(p); }}
            pageSize={limit}
            onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
            style={{ marginTop: 4 }}
          />
        </div>
      )}

      {/* ── VIEW PASS MODAL ── */}
      <Modal
        isOpen={!!viewPass}
        onClose={() => setViewPass(null)}
        title={t("preapGatePass")}
        size="sm"
      >
        {viewPass && (() => {
          const pc = PURPOSE_COLORS[viewPass.purpose] || PURPOSE_COLORS.OTHER;
          return (
            <div className="flex flex-col items-center gap-4">
              {/* visitor info */}
              <div className="text-center">
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{viewPass.visitor_name}</p>
                <span
                  className="text-xs px-2 py-0.5 rounded-md mt-1 inline-block"
                  style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}
                >
                  {PURPOSE_ICONS[viewPass.purpose] || "🔖"} {purposeLabels[viewPass.purpose] || viewPass.purpose}
                </span>
              </div>

              {/* large QR */}
              <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
                <QRCodeCanvas ref={viewPassQrRef} value={viewPass.otp} size={160} />
              </div>

              {/* pass code */}
              <p className="text-3xl font-bold tracking-[0.25em] text-green-300">{viewPass.otp}</p>

              {/* meta */}
              <div className="flex flex-wrap justify-center gap-2">
                {(() => {
                  const flatLabel = flatLabelOf(viewPass);
                  return flatLabel ? (
                    <span className="flex items-center gap-1 text-xs text-secondary px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                      <MdHome size={12} /> {t("rdFlat") || "Flat"} {flatLabel}
                    </span>
                  ) : null;
                })()}
                {viewPass.vehicle_number && (
                  <span className="flex items-center gap-1 text-xs text-secondary px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                    <MdDirectionsCar size={12} /> {viewPass.vehicle_number}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-secondary px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                  <MdCalendarToday size={11} /> {t("preapValidTill", { date: formatDateIST(viewPass.valid_date) })}
                </span>
              </div>

              {/* copy button */}
              <button
                onClick={() => handleCopyPass(viewPass.otp, viewPass.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 w-full justify-center ${
                  copiedId === viewPass.id
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-white/8 text-secondary border-white/10 hover:bg-white/12 hover:opacity-90"
                }`}
              >
                {copiedId === viewPass.id ? <MdCheckCircle size={14} /> : <MdContentCopy size={14} />}
                {copiedId === viewPass.id ? t("preapCopied") : t("preapCopyCode")}
              </button>

              {/* download buttons */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={downloadViewPNG}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 bg-white/8 text-secondary border-white/10 hover:bg-white/12 hover:opacity-90"
                >
                  <MdDownload size={14} /> {t("docDownload")} PNG
                </button>
                <button
                  onClick={downloadViewPDF}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 bg-white/8 text-secondary border-white/10 hover:bg-white/12 hover:opacity-90"
                >
                  <MdPictureAsPdf size={14} /> {t("docDownload")} PDF
                </button>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setViewPass(null)}
                className="w-full py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-secondary transition text-center"
              >
                {t("cancel") || "Close"}
              </button>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
}