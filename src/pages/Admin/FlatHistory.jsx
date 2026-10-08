import React, { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import API from "../../services/api";
import { toast } from "react-toastify";
import { moveOutResident } from "../../services/flatService";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import {
  MdApartment,
  MdLogout,
  MdChevronLeft,
  MdChevronRight,
  MdCheckCircle,
  MdMeetingRoom,
  MdDoorFront,
  MdPerson,
  MdBlock,
  MdWarning,
  MdLocalParking,
  MdDeliveryDining,
  MdReceipt,
  MdSearch,
  MdRefresh,
} from "react-icons/md";
import SlidingTabs from "../../components/common/SlidingTabs";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import Pagination from "../../components/common/Pagination";
import RecordCard from "../../components/common/RecordCard";
import StatCard from "../../components/common/StatCard";
import "./Admin.css";

/* ─────────────────────────────────────────────────────────────
   SPINNER
────────────────────────────────────────────────────────────── */
const SpinnerComp = ({ t }) => (
  <div className="fh-loading flex flex-col items-center justify-center p-8 gap-3 text-secondary">
    <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    <span className="text-xs font-semibold">{t("fhLoading") || "Loading details..."}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   EMPTY STATE
────────────────────────────────────────────────────────────── */
const Empty = ({ icon = "📭", text = "No data", sub = "" }) => (
  <div className="fh-empty-state flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-glass-border">
    <span className="text-3xl mb-2 select-none" aria-hidden="true">{icon}</span>
    <p className="text-sm font-bold text-primary mb-1">{text}</p>
    {sub && <p className="text-xs text-secondary max-w-sm">{sub}</p>}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   STATUS PILL helper
────────────────────────────────────────────────────────────── */
const statusVariant = (s = "") => {
  const v = s.toLowerCase().replace(/[^a-z]/g, "");
  if (["paid", "resolved", "collected", "delivered", "completed", "approved"].includes(v)) return "success";
  if (["rejected", "cancelled", "failed"].includes(v)) return "danger";
  if (["pending", "pendingpayment", "atgate", "open"].includes(v)) return "warning";
  return "info";
};

const Pill = ({ status, t }) => (
  <GlobalBadge size="sm" variant={statusVariant(status)}>
    {status || t("fhUnknown")}
  </GlobalBadge>
);

const toArr = (res) => {
  const data = res?.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["data", "flats", "items", "results", "records", "bills", "parcels", "visitors", "complaints", "parking", "slots"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
};

/* ─────────────────────────────────────────────────────────────
   TAB: RESIDENTS
────────────────────────────────────────────────────────────── */
const ResidentsTab = ({ residents, t, onMoveOut }) => {
  const validResidents = (residents || []).filter((r) => {
    const name = r.User?.name || r.user?.name || r.name || r.resident_name;
    return Boolean(name && name.trim() && name.toLowerCase() !== "unknown");
  });

  if (!validResidents.length)
    return <Empty icon="👤" text={t("fhNoResidents") || "No residents recorded"} sub={t("fhNoResidentsSub") || "This flat has no current or historical resident profiles."} />;

  return (
    <div className="space-y-3">
      {validResidents.map((r, i) => {
        const name = r.User?.name || r.user?.name || r.name || r.resident_name;
        const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        const moveIn = r.move_in_date || r.move_in || r.moveIn || r.check_in || r.created_at || null;
        const moveOut = r.move_out_date || r.move_out || r.moveOut || r.check_out || null;
        const isCurrent = !moveOut;
        const role = r.type || r.role || r.resident_type || r.User?.role || t("fhResidents") || "Resident";

        return (
          <div
            className="p-4 rounded-xl bg-transparent border border-glass-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-accent/40 shadow-sm"
            key={r.id || i}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent font-bold flex items-center justify-center text-sm shrink-0 border border-accent/20">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-primary truncate">{name}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isCurrent
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {isCurrent ? t("fhCurrent") || "Active" : t("fhPast") || "Past Resident"}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-secondary flex-wrap">
                  <span className="font-semibold text-accent">{role}</span>
                  <span>•</span>
                  {moveIn && (
                    <span>
                      {t("fhIn") || "Joined"}: {String(moveIn).slice(0, 10)}
                    </span>
                  )}
                  {moveOut && (
                    <>
                      <span>→</span>
                      <span>
                        {t("fhOut") || "Left"}: {String(moveOut).slice(0, 10)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isCurrent && onMoveOut && (
              <div className="shrink-0 self-end sm:self-center">
                <GlobalButton
                  variant="danger"
                  size="sm"
                  icon={MdLogout}
                  onClick={() => onMoveOut(r)}
                  title={t("fhMoveOutTitle")}
                >
                  {t("fhMarkLeft") || "Move Out"}
                </GlobalButton>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: BILLS & PAYMENTS
────────────────────────────────────────────────────────────── */
const BillsTab = ({ bills, t }) => {
  const [filter, setFilter] = useState("all");

  if (!bills.length)
    return <Empty icon="💳" text={t("fhNoBills") || "No billing records"} sub={t("fhNoBillsSub") || "Invoices and fee records for this flat will appear here."} />;

  const totalAmount = bills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const paidBills = bills.filter((b) => (b.status || "").toLowerCase() === "paid");
  const pendingBills = bills.filter((b) => (b.status || "").toLowerCase() !== "paid");
  const paidAmount = paidBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const pendingAmount = pendingBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const displayedBills =
    filter === "paid" ? paidBills : filter === "pending" ? pendingBills : bills;

  return (
    <div className="space-y-4">
      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-transparent border border-glass-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">Total Billed</span>
          <span className="text-base sm:text-lg font-extrabold text-primary mt-0.5 block">
            ₹{totalAmount.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-transparent border border-emerald-500/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">Paid Amount</span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-500 mt-0.5 block">
            ₹{paidAmount.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-transparent border border-amber-500/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">Pending Amount</span>
          <span className="text-base sm:text-lg font-extrabold text-amber-500 mt-0.5 block">
            ₹{pendingAmount.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Filter Toggle Buttons */}
      <SlidingTabs
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "All Bills", badge: bills.length },
          { id: "paid", label: "Paid", badge: paidBills.length },
          { id: "pending", label: "Pending", badge: pendingBills.length },
        ]}
      />

      {displayedBills.length === 0 ? (
        <Empty icon="💰" text="No bills in this category" sub="Select a different filter above." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-glass-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-transparent border-b border-glass-border text-secondary uppercase font-bold text-[10px] tracking-wider">
                <th className="p-3">{t("fhDescription") || "Description"}</th>
                <th className="p-3">{t("fhAmount") || "Amount"}</th>
                <th className="p-3">{t("fhDueDate") || "Due Date"}</th>
                <th className="p-3">{t("fhStatus") || "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {displayedBills.map((b, i) => (
                <tr className="hover:bg-white/[0.02] transition-colors" key={b.id || i}>
                  <td className="p-3">
                    <div className="font-bold text-primary">
                      {b.description || b.title || b.bill_type || b.type || `${t("fhBills") || "Bill"} #${i + 1}`}
                    </div>
                    {b.billing_month && (
                      <span className="text-[11px] text-secondary opacity-75">Month: {b.billing_month}</span>
                    )}
                  </td>
                  <td className="p-3 font-bold text-primary">
                    ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-secondary">
                    {b.due_date ? String(b.due_date).slice(0, 10) : b.dueDate || b.due || "—"}
                  </td>
                  <td className="p-3">
                    <Pill status={b.status} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: PARCELS
────────────────────────────────────────────────────────────── */
const ParcelsTab = ({ parcels, t }) => {
  if (!parcels.length)
    return <Empty icon="📦" text={t("fhNoParcels") || "No parcels"} sub={t("fhNoParcelsSub") || "Courier deliveries for this flat will be logged here."} />;

  return (
    <div className="space-y-2.5">
      {parcels.map((p, i) => (
        <div
          className="p-3.5 rounded-xl bg-transparent border border-glass-border flex items-center justify-between gap-3 hover:border-accent/40 transition-colors shadow-sm"
          key={p.id || i}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
              <MdDeliveryDining size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-primary truncate">
                {p.courier_name || p.courierName || p.sender || `${t("fhParcels") || "Parcel"} #${i + 1}`}
              </p>
              {p.description && <p className="text-xs text-secondary truncate">{p.description}</p>}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-secondary flex-wrap">
                {(p.arrived_at || p.created_at || p.date) && (
                  <span>{String(p.arrived_at || p.created_at || p.date).slice(0, 16).replace("T", " ")}</span>
                )}
                {p.otp && (
                  <span className="font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold text-[10px]">
                    OTP: {p.otp}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Pill status={(p.status || "expected").replace("_", " ")} t={t} />
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: VISITORS
────────────────────────────────────────────────────────────── */
const VisitorsTab = ({ visitors, t }) => {
  if (!visitors.length)
    return <Empty icon="🚶" text={t("fhNoVisitors") || "No visitor logs"} sub={t("fhNoVisitorsSub") || "Guest check-ins and passes will appear here."} />;

  return (
    <div className="space-y-2.5">
      {visitors.map((v, i) => (
        <div
          className="p-3.5 rounded-xl bg-transparent border border-glass-border flex items-center justify-between gap-3 hover:border-accent/40 transition-colors shadow-sm"
          key={v.id || i}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
              <MdPerson size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-primary truncate">
                {v.visitor_name || v.visitorName || v.name || `${t("fhVisitors") || "Visitor"} #${i + 1}`}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary flex-wrap">
                {v.purpose && <span className="text-accent font-semibold">{v.purpose}</span>}
                {v.vehicle_number && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-slate-300">
                    🚗 {v.vehicle_number}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-secondary">
                {(v.entry_time || v.entry || v.check_in || v.created_at) && (
                  <span>In: {String(v.entry_time || v.entry || v.check_in || v.created_at).slice(0, 16).replace("T", " ")}</span>
                )}
                {v.exit_time && <span>• Out: {String(v.exit_time).slice(0, 16).replace("T", " ")}</span>}
              </div>
            </div>
          </div>
          <GlobalBadge size="sm" variant={v.exit_time ? "neutral" : "success"}>
            {v.exit_time ? "Exited" : "On Premises"}
          </GlobalBadge>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: COMPLAINTS
────────────────────────────────────────────────────────────── */
const ComplaintsTab = ({ complaints, t }) => {
  if (!complaints.length)
    return <Empty icon="📋" text={t("fhNoComplaints") || "No complaints"} sub={t("fhNoComplaintsSub") || "Tickets and issue reports for this flat will be listed here."} />;

  return (
    <div className="space-y-2.5">
      {complaints.map((c, i) => {
        const complainerName = c.User?.name || c.user?.name || null;

        return (
          <div
            className="p-3.5 rounded-xl bg-transparent border border-glass-border flex flex-col gap-2 hover:border-accent/40 transition-colors shadow-sm"
            key={c.id || i}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                  <MdWarning size={16} />
                </div>
                <h4 className="font-bold text-sm text-primary truncate">
                  {c.title || c.subject || c.category || `${t("fhComplaints") || "Ticket"} #${i + 1}`}
                </h4>
              </div>
              <Pill status={c.status || "OPEN"} t={t} />
            </div>

            {complainerName && (
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span>Reported by:</span>
                <span className="font-semibold text-primary">{complainerName}</span>
              </div>
            )}

            {c.description && (
              <p className="text-xs text-secondary bg-transparent p-2.5 rounded-lg border border-glass-border leading-relaxed">
                {c.description}
              </p>
            )}

            <div className="text-[11px] text-secondary text-right pt-1">
              {(c.created_at || c.date) && String(c.created_at || c.date).slice(0, 10)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: PARKING
────────────────────────────────────────────────────────────── */
const ParkingTab = ({ parking, t }) => {
  if (!parking.length)
    return <Empty icon="🚗" text={t("fhNoParking") || "No parking records"} sub={t("fhNoParkingSub") || "Allocated bays and vehicle passes will appear here."} />;

  return (
    <div className="space-y-2.5">
      {parking.map((p, i) => (
        <div
          className="p-3.5 rounded-xl bg-transparent border border-glass-border flex items-center justify-between gap-3 hover:border-accent/40 transition-colors shadow-sm"
          key={p.id || i}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <MdLocalParking size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-primary">
                  {p.assigned_spot ? `Bay ${p.assigned_spot}` : p.guest_name || `${t("fhParking") || "Slot"} #${i + 1}`}
                </span>
                {p.assigned_spot && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase">
                    🅿️ {p.assigned_spot}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-secondary flex-wrap">
                {p.vehicle_number && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-slate-300 font-bold">
                    {p.vehicle_number}
                  </span>
                )}
                {p.vehicle_type && <span>{p.vehicle_type}</span>}
                {p.expected_arrival && <span>• {String(p.expected_arrival).slice(0, 10)}</span>}
              </div>
            </div>
          </div>
          <Pill status={p.status || "APPROVED"} t={t} />
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────── */

const ALL_BLOCKS = "__all__";

const FlatHistory = () => {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const canMoveOut = hasPermission(user, "flat_history", "move_out") || hasPermission(user, "flat_history", "view");

  const [flats, setFlats] = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [activeTab, setActiveTab] = useState("residents");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [activeBlock, setActiveBlock] = useState(ALL_BLOCKS);
  const [confirmMoveOut, setConfirmMoveOut] = useState(null);
  const [movingOut, setMovingOut] = useState(false);

  const searchInputRef = useRef(null);

  /* ── Keyboard shortcut: Ctrl+K or Cmd+K to focus search ── */
  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const [data, setData] = useState({
    residents: [],
    bills: [],
    parcels: [],
    visitors: [],
    complaints: [],
    parking: [],
  });

  /* ── TABS CONFIGURATION ── */
  const TABS = [
    { id: "residents", label: t("fhResidents") || "Residents", icon: "👥" },
    { id: "bills", label: `${t("fhBills") || "Bills"} & Payments`, icon: "💳" },
    { id: "parcels", label: t("fhParcels") || "Parcels", icon: "📦" },
    { id: "visitors", label: t("fhVisitors") || "Visitors", icon: "🚶" },
    { id: "complaints", label: t("fhComplaints") || "Complaints", icon: "📋" },
    { id: "parking", label: t("fhParking") || "Parking", icon: "🚗" },
  ];

  /* ── Helper: Extract clean block name ── */
  const getBlockName = useCallback((flat) => {
    const raw = flat?.Block?.name || flat?.Floor?.Block?.name;
    if (raw && typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
    return flat?.block_id ? `${t("fhBlock") || "Block"} ${flat.block_id}` : "Unassigned";
  }, [t]);

  /* ── Helper: Owner / resident name assigned to the flat ── */
  const getFlatOwnerName = useCallback((flat) => {
    return (
      flat?.User?.name ||
      flat?.user?.name ||
      flat?.resident_name ||
      flat?.owner_name ||
      flat?.owner?.name ||
      ""
    );
  }, []);

  /* ── Helper: Searchable text for a flat (number, block, owner, type) ── */
  const flatSearchText = useCallback((flat) => {
    return [
      flat?.flat_number ?? "",
      getBlockName(flat),
      getFlatOwnerName(flat),
      flat?.flat_type ?? "",
    ]
      .join(" ")
      .toLowerCase();
  }, [getBlockName, getFlatOwnerName]);

  /* ── 1. Load flat list on mount ── */
  useEffect(() => {
    API.get("/flats/getall")
      .then((res) => setFlats(toArr(res)))
      .catch((err) => console.error("Flats fetch error:", err));
  }, []);

  /* ── 2. Load full flat details when a card is clicked ── */
  const fetchFlatDetails = useCallback(async (flat) => {
    try {
      setLoading(true);
      setFetchError(null);
      setActiveTab("residents");

      const [residentsRes, billsRes, parcelsRes, visitorsRes, complaintsRes, parkingRes] =
        await Promise.allSettled([
          API.get(`/flat-history/${flat.id}`),
          API.get(`/bills/society`),
          API.get(`/parcels`),
          API.get(`/visitors`),
          API.get(`/complaints`),
          API.get(`/parking?limit=100&flat_id=${flat.id}`),
        ]);

      const safeArr = (result) =>
        result.status === "fulfilled" ? toArr(result.value) : [];

      const residents = (() => {
        if (residentsRes.status !== "fulfilled") return [];
        const raw = residentsRes.value?.data;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.residents)) return raw.residents;
        if (typeof raw === "object") return [raw];
        return [];
      })();

      const byFlat = (arr) =>
        arr.filter(
          (item) =>
            String(item.flat_id ?? item.flatId ?? "") === String(flat.id) ||
            String(item.flat_number ?? "") === String(flat.flat_number)
        );

      const residentId = flat.resident_id;

      setData({
        residents,
        bills: byFlat(safeArr(billsRes)),
        parcels: byFlat(safeArr(parcelsRes)),
        visitors: byFlat(safeArr(visitorsRes)),
        complaints: residentId
          ? safeArr(complaintsRes).filter(
              (c) => String(c.resident_id ?? "") === String(residentId)
            )
          : [],
        parking: safeArr(parkingRes).filter(
          (p) => String(p.flat_id ?? "") === String(flat.id)
        ),
      });

      setSelectedFlat(flat);
    } catch (err) {
      console.error("fetchFlatDetails error:", err);
      setFetchError(t("fhFetchError") || "Failed to load flat records");
    } finally {
      setLoading(false);
    }
  }, [t]);

  /* ── 3. Reset Detail Drawer ── */
  const goBack = () => {
    setSelectedFlat(null);
    setData({ residents: [], bills: [], parcels: [], visitors: [], complaints: [], parking: [] });
    setFetchError(null);
  };

  /* ── Escape key closes detail drawer ── */
  useEffect(() => {
    if (!selectedFlat) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (confirmMoveOut) setConfirmMoveOut(null);
        else goBack();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedFlat, confirmMoveOut]);

  /* ── Group all flats by blockName ── */
  const allBlockGroups = useMemo(() => {
    return flats.reduce((acc, flat) => {
      const bName = getBlockName(flat);
      if (!acc[bName]) {
        acc[bName] = {
          name: bName,
          blockId: flat.block_id,
          flats: [],
          occupiedCount: 0,
          vacantCount: 0,
        };
      }
      acc[bName].flats.push(flat);
      if (flat.resident_id) acc[bName].occupiedCount++;
      else acc[bName].vacantCount++;
      return acc;
    }, {});
  }, [flats, getBlockName]);

  const blockNames = useMemo(() => Object.keys(allBlockGroups).sort(), [allBlockGroups]);

  const isAllBlocks = activeBlock === ALL_BLOCKS;

  const allFlats = useMemo(
    () => blockNames.flatMap((bName) => allBlockGroups[bName].flats),
    [allBlockGroups, blockNames]
  );

  const totalOccupied = useMemo(() => flats.filter((f) => !!f.resident_id).length, [flats]);
  const totalVacant = useMemo(() => flats.filter((f) => !f.resident_id).length, [flats]);

  /* ── Search handling ── */
  const searchTrim = search.trim().toLowerCase();

  const matchCountsByBlock = useMemo(() => {
    if (!searchTrim) return {};
    const res = {};
    for (const bName of blockNames) {
      const cnt = allBlockGroups[bName].flats.filter((f) =>
        flatSearchText(f).includes(searchTrim)
      ).length;
      if (cnt > 0) res[bName] = cnt;
    }
    res[ALL_BLOCKS] = blockNames.reduce((sum, b) => sum + (res[b] || 0), 0);
    return res;
  }, [allBlockGroups, blockNames, searchTrim, flatSearchText]);

  const blockTabs = useMemo(() => {
    const badgeFor = (bName) => {
      if (matchCountsByBlock[bName] !== undefined) return matchCountsByBlock[bName];
      if (bName === ALL_BLOCKS) return allFlats.length;
      return allBlockGroups[bName]?.flats?.length ?? 0;
    };

    return [
      { id: ALL_BLOCKS, label: t("allBlocks") || "All Blocks", badge: badgeFor(ALL_BLOCKS) },
      ...blockNames.map((bName) => ({ id: bName, label: bName, badge: badgeFor(bName) })),
    ];
  }, [allBlockGroups, allFlats, blockNames, matchCountsByBlock, t]);

  const toggleWrapRef = useRef(null);
  const activeBlockIdx = blockTabs.findIndex((item) => item.id === activeBlock);

  const visibleBlockTabs = useMemo(() => {
    if (searchOpen) return blockTabs.filter((item) => item.id === activeBlock);
    return blockTabs;
  }, [blockTabs, searchOpen, activeBlock]);

  const stepBlock = (dir) => {
    const next = blockTabs[activeBlockIdx + dir];
    if (next) setActiveBlock(next.id);
  };

  const canStepBack = activeBlockIdx > 0;
  const canStepFwd = activeBlockIdx > -1 && activeBlockIdx < blockTabs.length - 1;

  useEffect(() => {
    const strip = toggleWrapRef.current?.querySelector(".sliding-tabs");
    const active = strip?.querySelector('[aria-selected="true"]');
    if (!strip || !active) return;
    const fullyVisible =
      active.offsetLeft >= strip.scrollLeft &&
      active.offsetLeft + active.offsetWidth <= strip.scrollLeft + strip.clientWidth;
    if (fullyVisible) return;
    strip.scrollTo({
      left: active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [activeBlock, searchOpen, blockTabs]);

  const onToggleWheel = useCallback((e) => {
    const strip = e.currentTarget.querySelector(".sliding-tabs");
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;
    if (e.deltaY === 0) return;
    if (e.shiftKey) return;
    e.preventDefault();
    strip.scrollLeft += e.deltaY;
  }, []);

  const activeBlockFlats = useMemo(() => {
    const source = isAllBlocks
      ? allFlats
      : activeBlock && allBlockGroups[activeBlock] ? allBlockGroups[activeBlock].flats : [];
    if (!searchTrim) return source;
    return source.filter((f) => flatSearchText(f).includes(searchTrim));
  }, [allFlats, allBlockGroups, activeBlock, isAllBlocks, searchTrim, flatSearchText]);

  const [flatPage, setFlatPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const flatTotalPages = Math.max(1, Math.ceil(activeBlockFlats.length / limit));
  const pagedFlats = useMemo(() => {
    return activeBlockFlats.slice((flatPage - 1) * limit, flatPage * limit);
  }, [activeBlockFlats, flatPage, limit]);

  const viewKey = `${activeBlock}|${searchTrim}`;
  const [prevViewKey, setPrevViewKey] = useState(viewKey);
  if (viewKey !== prevViewKey) {
    setPrevViewKey(viewKey);
    setFlatPage(1);
  }

  const openMoveOutConfirm = useCallback((resident) => {
    setConfirmMoveOut({ flat: selectedFlat, resident });
  }, [selectedFlat]);

  const closeMoveOutConfirm = useCallback(() => {
    if (movingOut) return;
    setConfirmMoveOut(null);
  }, [movingOut]);

  const doMoveOut = useCallback(async () => {
    if (!confirmMoveOut || movingOut) return;
    const { flat, resident } = confirmMoveOut;
    const userId =
      resident.user_id ?? resident.userId ?? resident.User?.id ?? resident.user?.id ?? null;

    if (!flat || !userId) {
      toast.error(t("fhMoveOutFailId") || "Invalid resident ID");
      setConfirmMoveOut(null);
      return;
    }

    setMovingOut(true);
    try {
      await moveOutResident(flat.id, userId);
      toast.success(t("fhMoveOutSuccess") || "Resident moved out successfully");
      setConfirmMoveOut(null);

      const res = await API.get("/flats/getall");
      const fresh = toArr(res);
      setFlats(fresh);
      const updated = fresh.find((f) => String(f.id) === String(flat.id));
      if (updated) await fetchFlatDetails(updated);
    } catch (err) {
      console.error("Move-out error:", err);
      toast.error(err.response?.data?.message || t("fhMoveOutFail") || "Failed to process move out");
    } finally {
      setMovingOut(false);
    }
  }, [confirmMoveOut, movingOut, t, fetchFlatDetails]);

  const renderContent = () => {
    if (loading) return <SpinnerComp t={t} />;
    if (fetchError)
      return (
        <div className="p-8 text-center text-rose-500 font-semibold text-sm">
          ⚠️ {fetchError}
        </div>
      );
    switch (activeTab) {
      case "residents":
        return <ResidentsTab residents={data.residents} t={t} onMoveOut={canMoveOut ? openMoveOutConfirm : null} />;
      case "bills":
        return <BillsTab bills={data.bills} t={t} />;
      case "parcels":
        return <ParcelsTab parcels={data.parcels} t={t} />;
      case "visitors":
        return <VisitorsTab visitors={data.visitors} t={t} />;
      case "complaints":
        return <ComplaintsTab complaints={data.complaints} t={t} />;
      case "parking":
        return <ParkingTab parking={data.parking} t={t} />;
      default:
        return null;
    }
  };

  return (
    <div className="fh-root flat-history-page space-y-5 animate-fadeIn">
      {/* ── 1. Header & Navigation Controls ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-accent to-accent-light text-white flex items-center justify-center shadow-lg shadow-accent/25 shrink-0">
            <MdApartment size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight m-0">
              {t("fhTitle") || "Flat Directory & History"}
            </h1>
            <p className="text-secondary text-xs mt-0.5 m-0">
              {t("fhSubtitle") || "Complete tenancy records, invoices, visitors & parcel logs"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap xl:flex-nowrap justify-start xl:justify-end">
          {blockNames.length > 0 && (
            <div className="fh-block-toggle flex items-center gap-1 min-w-0" ref={toggleWrapRef} onWheel={onToggleWheel}>
              <button
                type="button"
                className="fh-block-nav w-8 h-8 rounded-full border border-glass-border bg-card-inner-bg flex items-center justify-center text-secondary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                onClick={() => stepBlock(-1)}
                disabled={!canStepBack}
                aria-label="Previous block"
              >
                <MdChevronLeft size={18} />
              </button>

              <SlidingTabs
                value={activeBlock}
                onChange={setActiveBlock}
                items={visibleBlockTabs}
                className="sliding-tabs--tight sliding-tabs--scroll"
              />

              <button
                type="button"
                className="fh-block-nav w-8 h-8 rounded-full border border-glass-border bg-card-inner-bg flex items-center justify-center text-secondary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                onClick={() => stepBlock(1)}
                disabled={!canStepFwd}
                aria-label="Next block"
              >
                <MdChevronRight size={18} />
              </button>
            </div>
          )}

          <ExpandableSearch
            isOpen={searchOpen}
            onOpenChange={setSearchOpen}
            maxWidth={300}
            value={search}
            onChange={(val) => {
              setSearch(val);
              setFlatPage(1);
            }}
            placeholder={t("fhSearchPlaceholder") || "Search flat, block, owner..."}
          />
        </div>
      </div>

      {/* ── 2. Summary KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={MdApartment}
          value={flats.length}
          label={t("fhTotalFlats") || "Total Flats"}
          tone="brand"
          description={`${blockNames.length} ${blockNames.length === 1 ? "Block" : "Blocks"}`}
          active={isAllBlocks}
          onClick={() => setActiveBlock(ALL_BLOCKS)}
        />
        <StatCard
          icon={MdPerson}
          value={totalOccupied}
          label={t("fhOccupiedFlats") || "Occupied"}
          tone="info"
          description={`${flats.length ? Math.round((totalOccupied / flats.length) * 100) : 0}% Occupancy`}
        />
        <StatCard
          icon={MdMeetingRoom}
          value={totalVacant}
          label={t("fhVacantFlats") || "Available"}
          tone="success"
          description="Ready to assign"
        />
        <StatCard
          icon={MdDoorFront}
          value={activeBlockFlats.length}
          label={isAllBlocks ? (t("allBlocks") || "All Blocks") : activeBlock}
          tone="warning"
          description={`${activeBlockFlats.length} flats matched`}
        />
      </div>

      {/* ── 3. Flats Card Grid Section ── */}
      <div className="border border-glass-border rounded-2xl p-4 sm:p-5 shadow-sm bg-transparent">
        {isAllBlocks || (activeBlock && allBlockGroups[activeBlock]) ? (
          <div>
            {activeBlockFlats.length === 0 ? (
              <Empty
                icon="🔍"
                text={t("fhNoFlatsFound") || "No matching flats found"}
                sub={t("fhNoFlatsSub") || "Try changing your search query or selecting a different block above."}
              />
            ) : (
              <div key={flatPage} className="animate-slide-page">
                <div className="ps-card-grid">
                  {pagedFlats.map((flat, i) => {
                    const occ = !!flat.resident_id;
                    const isSelected = selectedFlat?.id === flat.id;
                    const residentName =
                      getFlatOwnerName(flat) || (occ ? "Occupied Resident" : null);

                    return (
                      <RecordCard
                        key={flat.id}
                        interactive
                        selected={isSelected}
                        tone="neutral"
                        blob={false}
                        onClick={() => fetchFlatDetails(flat)}
                        style={{
                          animationDelay: `${i * 15}ms`,
                          background: "transparent",
                          backgroundColor: "transparent",
                        }}
                        className="cursor-pointer group hover:border-accent/50 transition-all !bg-transparent"
                        icon={occ ? MdApartment : MdMeetingRoom}
                        title={
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-extrabold text-primary tracking-tight">
                              {t("fhFlat") || "Flat"} {flat.flat_number}
                            </span>
                            {flat.flat_type && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
                                {flat.flat_type}
                              </span>
                            )}
                          </div>
                        }
                        description={
                          <div className="flex items-center gap-1.5 text-xs text-secondary mt-0.5 flex-wrap">
                            <span className="font-semibold text-primary/80">
                              {getBlockName(flat)}
                            </span>
                            {flat.Floor?.floor_number != null && (
                              <>
                                <span>•</span>
                                <span>Floor {flat.Floor.floor_number}</span>
                              </>
                            )}
                            {flat.area_sqft && (
                              <>
                                <span>•</span>
                                <span>{flat.area_sqft} sq.ft</span>
                              </>
                            )}
                          </div>
                        }
                        badge={
                          <GlobalBadge
                            size="sm"
                            variant={occ ? "info" : "success"}
                            icon={occ ? MdPerson : MdCheckCircle}
                          >
                            {occ ? t("fhOccupied") || "Occupied" : t("fhVacant") || "Available"}
                          </GlobalBadge>
                        }
                      >
                        {/* Card Middle: Formal Resident or Vacancy information */}
                        <div className="mt-2.5 pt-2.5 border-t border-glass-border">
                          {occ ? (
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-accent-soft text-accent font-bold flex items-center justify-center text-xs shrink-0 border border-accent/20">
                                  {residentName?.trim()?.charAt(0)?.toUpperCase() || "R"}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-primary truncate m-0">
                                    {residentName}
                                  </p>
                                  <p className="text-[11px] text-secondary m-0 mt-0.5 truncate">
                                    {flat.resident_type || (flat.flat_type ? `${flat.flat_type} · ` : "")}{t("fhCurrentResident") || "Primary Resident"}
                                  </p>
                                </div>
                              </div>

                              <span className="text-[11px] font-bold text-accent group-hover:translate-x-0.5 transition-transform shrink-0 flex items-center gap-0.5">
                                <span>View</span>
                                <MdChevronRight size={14} />
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 py-1">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-semibold text-emerald-500">
                                  {t("fhAvailableForAssignment") || "Vacant · Ready to Assign"}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                                <span>Details</span>
                                <MdChevronRight size={14} />
                              </span>
                            </div>
                          )}
                        </div>
                      </RecordCard>
                    );
                  })}
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row justify-between items-center px-2 pt-5 mt-4 border-t border-glass-border gap-3">
                  <span className="text-xs text-secondary font-medium">
                    Showing <strong>{pagedFlats.length}</strong> of <strong>{activeBlockFlats.length}</strong> flats{" "}
                    {isAllBlocks ? (t("allBlocks") || "All Blocks").toLowerCase() : `in ${activeBlock}`}
                  </span>
                  <Pagination
                    page={flatPage}
                    totalPages={flatTotalPages}
                    onPageChange={setFlatPage}
                    pageSize={limit}
                    onPageSizeChange={(s) => {
                      setLimit(s);
                      setFlatPage(1);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <Empty icon="🏢" text={t("fhNoFlatsFound") || "No flats found"} sub={t("fhNoFlatsSub") || "Select a valid block."} />
        )}
      </div>

      {/* ── 4. Flat History Detail Pop-up Modal ── */}
      {selectedFlat && (
        <GlobalModal
          isOpen={!!selectedFlat}
          onClose={goBack}
          size="xl"
          icon={<MdApartment size={22} className="text-accent" />}
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-extrabold text-base sm:text-lg text-primary">
                {t("fhFlat") || "Flat"} {selectedFlat.flat_number}
              </span>
              <GlobalBadge
                size="sm"
                variant={selectedFlat.resident_id ? "danger" : "success"}
                icon={selectedFlat.resident_id ? MdBlock : MdCheckCircle}
              >
                {selectedFlat.resident_id ? t("fhOccupied") || "Occupied" : t("fhVacant") || "Available"}
              </GlobalBadge>
            </div>
          }
          subtitle={
            <div className="flex items-center gap-2 flex-wrap text-xs text-secondary mt-1">
              <span className="px-2 py-0.5 rounded-md bg-transparent border border-glass-border font-semibold">
                🏢 {getBlockName(selectedFlat)}
              </span>
              {selectedFlat.Floor?.floor_number != null && (
                <span className="px-2 py-0.5 rounded-md bg-transparent border border-glass-border font-semibold">
                  Floor {selectedFlat.Floor.floor_number}
                </span>
              )}
              {selectedFlat.flat_type && (
                <span className="px-2 py-0.5 rounded-md bg-accent-soft text-accent border border-accent/20 font-bold">
                  {selectedFlat.flat_type}
                </span>
              )}
              {selectedFlat.area_sqft && (
                <span className="px-2 py-0.5 rounded-md bg-transparent border border-glass-border font-semibold">
                  {selectedFlat.area_sqft} sq.ft
                </span>
              )}
            </div>
          }
        >
          <div className="space-y-5">
            {/* Quick KPI Strip inside modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-transparent border border-glass-border">
              <div className="p-2 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Residents</span>
                <span className="text-sm font-extrabold text-primary mt-0.5">
                  {data.residents.length} {data.residents.length === 1 ? "Member" : "Members"}
                </span>
              </div>
              <div className="p-2 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Billing</span>
                <span className="text-sm font-extrabold text-primary mt-0.5">
                  {data.bills.length} Invoices
                </span>
              </div>
              <div className="p-2 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Parcels</span>
                <span className="text-sm font-extrabold text-primary mt-0.5">
                  {data.parcels.length} Logged
                </span>
              </div>
              <div className="p-2 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Visitors</span>
                <span className="text-sm font-extrabold text-primary mt-0.5">
                  {data.visitors.length} Entries
                </span>
              </div>
            </div>

            {/* Section Toggle Tabs */}
            <div className="pb-2 border-b border-glass-border">
              <SlidingTabs
                value={activeTab}
                onChange={setActiveTab}
                items={TABS.map((tab) => ({
                  id: tab.id,
                  label: tab.label,
                  icon: <span aria-hidden="true">{tab.icon}</span>,
                  badge: data[tab.id]?.length ?? 0,
                }))}
              />
            </div>

            {/* Active Section Content */}
            <div className="min-h-[220px]" key={activeTab}>
              {renderContent()}
            </div>
          </div>
        </GlobalModal>
      )}

      {/* ── 5. Move-out Confirmation Dialog ── */}
      <GlobalConfirmDialog
        isOpen={!!confirmMoveOut}
        onClose={closeMoveOutConfirm}
        onConfirm={doMoveOut}
        title={t("fhMoveOutTitle") || "Confirm Move Out"}
        message={
          confirmMoveOut
            ? `${t("fhMoveOutConfirm") || "Are you sure you want to mark this resident as moved out?"} ${
                confirmMoveOut.resident?.User?.name ||
                confirmMoveOut.resident?.user?.name ||
                confirmMoveOut.resident?.name ||
                t("fhUnknown") || "Unknown"
              }${confirmMoveOut.flat ? ` — ${t("fhFlat") || "Flat"} ${confirmMoveOut.flat.flat_number}` : ""}?`
            : ""
        }
        confirmLabel={t("fhConfirmMoveOut") || "Confirm Move Out"}
        cancelLabel={t("fhCancel") || "Cancel"}
        variant="danger"
        icon={MdLogout}
        loading={movingOut}
      />
    </div>
  );
};

export default FlatHistory;