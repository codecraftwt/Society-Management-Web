import React, { useEffect, useState, useCallback, useMemo, useRef, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../services/api";
import { toast } from "react-toastify";
import { moveOutResident } from "../../services/flatService";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalButton from "../../components/common/GlobalButton";
import GlobalBadge from "../../components/common/GlobalBadge";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import Select from "../../components/common/Select";
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
  MdHomeWork,
  MdVisibility,
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

const BHK_STYLES = {
  "1BHK": { bg: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" },
  "2BHK": { bg: "rgba(167, 139, 250, 0.14)", color: "#c084fc", border: "rgba(167, 139, 250, 0.3)" },
  "3BHK": { bg: "rgba(244, 114, 182, 0.14)", color: "#f472b6", border: "rgba(244, 114, 182, 0.3)" },
};

function BhkBadge({ type }) {
  if (!type) return null;
  const s = BHK_STYLES[type] || { bg: "rgba(160,90,255,0.12)", color: "var(--accent)", border: "rgba(160,90,255,0.25)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: 6,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        letterSpacing: "0.02em",
      }}
    >
      {type}
    </span>
  );
}

function formatFlatTitle(num) {
  if (!num) return "—";
  let str = String(num).trim();
  str = str.replace(/^(flat\s+)?block[\s_-]*/i, "");
  return str.trim() || String(num).trim();
}

/* ─────────────────────────────────────────────────────────────
   RESIDENT RESOLUTION HELPER
   Attributes any flat activity (bill, complaint, parcel, parking, visitor)
   to the resident who lived in the flat at that time, or directly by user_id/resident_id.
────────────────────────────────────────────────────────────── */
const resolveResidentForRecord = (record, residentsList = [], dateField = "created_at") => {
  if (!record) return null;

  // 1. Direct match by user_id / resident_id / recipient_id
  const uid =
    record.user_id ??
    record.resident_id ??
    record.recipient_id ??
    record.User?.id ??
    record.user?.id ??
    null;

  if (uid && residentsList?.length) {
    const directMatch = residentsList.find(
      (r) => Number(r.user_id ?? r.User?.id ?? r.id) === Number(uid)
    );
    if (directMatch) {
      const name = directMatch.User?.name || directMatch.name || "Resident";
      const isCurrent = directMatch.is_current !== false && !directMatch.move_out_date;
      const role = directMatch.role || directMatch.resident_type || directMatch.User?.resident_type || "Resident";
      return { name, isCurrent, role };
    }
  }

  // 2. Timeline match by record date vs [move_in_date, move_out_date]
  const recDateStr =
    record[dateField] ||
    record.created_at ||
    record.issue_date ||
    record.entry_time ||
    record.expected_arrival ||
    record.date;

  if (recDateStr && residentsList?.length) {
    const recTime = new Date(recDateStr).getTime();
    if (!isNaN(recTime)) {
      for (const r of residentsList) {
        const moveInStr = r.move_in_date || r.move_in || r.created_at;
        const moveOutStr = r.move_out_date || r.move_out;
        const moveInTime = moveInStr ? new Date(moveInStr).getTime() : 0;
        const moveOutTime = moveOutStr ? new Date(moveOutStr).getTime() : Infinity;

        if (recTime >= moveInTime && recTime <= moveOutTime) {
          const name = r.User?.name || r.name || "Resident";
          const isCurrent = r.is_current !== false && !r.move_out_date;
          const role = r.role || r.resident_type || r.User?.resident_type || "Resident";
          return { name, isCurrent, role };
        }
      }
    }
  }

  // 3. Fallback: if record has resident_name, visitor_name, etc.
  const explicitName =
    record.resident_name ||
    record.resident?.name ||
    record.User?.name ||
    record.user?.name ||
    null;

  if (explicitName) {
    return { name: explicitName, isCurrent: false, role: "Resident" };
  }

  // 4. Fallback: If only 1 resident ever or current occupant
  const currentResident = residentsList?.find((r) => r.is_current !== false && !r.move_out_date);
  if (currentResident) {
    return {
      name: currentResident.User?.name || currentResident.name || "Current Resident",
      isCurrent: true,
      role: currentResident.role || currentResident.resident_type || currentResident.User?.resident_type || "Resident",
    };
  }

  return null;
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

  const tenantIsCurrent = validResidents.some((item) =>
    item.is_current !== false &&
    !item.move_out_date &&
    String(item.resident_type || item.role || item.User?.resident_type || "").toUpperCase() === "TENANT"
  );

  // Sort: Active residents first (Owner then Tenant), followed by past residents (most recent move out first)
  const sortedResidents = [...validResidents].sort((a, b) => {
    const aCurrent = a.is_current !== false && !a.move_out_date;
    const bCurrent = b.is_current !== false && !b.move_out_date;
    if (aCurrent && !bCurrent) return -1;
    if (!aCurrent && bCurrent) return 1;

    if (aCurrent && bCurrent) {
      const aIsOwner = String(a.resident_type || a.role || a.User?.resident_type || "").toUpperCase() === "OWNER";
      const bIsOwner = String(b.resident_type || b.role || b.User?.resident_type || "").toUpperCase() === "OWNER";
      if (aIsOwner && !bIsOwner) return -1;
      if (!aIsOwner && bIsOwner) return 1;
    }

    const aDate = new Date(a.move_out_date || a.move_in_date || a.created_at || 0).getTime();
    const bDate = new Date(b.move_out_date || b.move_in_date || b.created_at || 0).getTime();
    return bDate - aDate;
  });

  return (
    <div className="space-y-3">
      {sortedResidents.map((r, i) => {
        const name = r.User?.name || r.user?.name || r.name || r.resident_name;
        const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
        const moveIn = r.move_in_date || r.move_in || r.moveIn || r.check_in || r.created_at || null;
        const moveOut = r.move_out_date || r.move_out || r.moveOut || r.check_out || null;

        const isOwner = String(r.resident_type || r.role || r.User?.resident_type || "").toUpperCase() === "OWNER";
        const isTenant = String(r.resident_type || r.role || r.User?.resident_type || "").toUpperCase() === "TENANT";

        // A resident or owner is current if they have no move_out_date recorded in DB
        const isCurrent = r.is_current !== false && !moveOut;

        const role = r.type || r.role || r.resident_type || r.User?.resident_type || r.User?.role || t("fhResidents") || "Resident";
        const roleLabel = isOwner ? "Owner" : isTenant ? "Tenant" : role;

        // Occupancy subtitle & badge label
        let occupancySubtitle = "";
        let badgeLabel = "";
        let badgeClass = "";

        if (isCurrent) {
          if (isOwner && tenantIsCurrent) {
            badgeLabel = "Primary Owner";
            badgeClass = "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20";
            occupancySubtitle = "Owner • Flat Rented Out";
          } else if (isOwner) {
            badgeLabel = "Current Owner";
            badgeClass = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
            occupancySubtitle = "Owner • Living in Flat";
          } else if (isTenant) {
            badgeLabel = "Current Tenant";
            badgeClass = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
            occupancySubtitle = "Tenant • Living in Flat";
          } else {
            badgeLabel = t("fhCurrent") || "Currently Staying";
            badgeClass = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
            occupancySubtitle = `${roleLabel} • Currently Staying`;
          }
        } else {
          badgeLabel = isOwner ? "Past Owner" : isTenant ? "Past Tenant" : (t("fhPast") || "Past Resident");
          badgeClass = "bg-slate-500/10 text-slate-400 border border-slate-500/20";
          occupancySubtitle = `${roleLabel} • Past Resident`;
        }

        // Move Out Button Logic:
        // - If a tenant is currently staying, show [Move Out] in front of the tenant.
        // - When the tenant leaves (no current tenant), the primary owner is the active occupant, so show [Move Out] in front of the owner!
        const canShowMoveOutBtn = isCurrent && onMoveOut && (tenantIsCurrent ? isTenant : true);

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
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}
                  >
                    {badgeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-secondary flex-wrap">
                  <span className="font-semibold text-accent">{occupancySubtitle}</span>
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

            {canShowMoveOutBtn && (
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
const BillsTab = ({ bills, residents, t }) => {
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
                <th className="p-3">Resident / Billed To</th>
                <th className="p-3">{t("fhAmount") || "Amount"}</th>
                <th className="p-3">{t("fhDueDate") || "Due Date"}</th>
                <th className="p-3">{t("fhStatus") || "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {displayedBills.map((b, i) => {
                const resInfo = resolveResidentForRecord(b, residents, "issue_date");
                return (
                  <tr className="hover:bg-white/[0.02] transition-colors" key={b.id || i}>
                    <td className="p-3">
                      <div className="font-bold text-primary">
                        {b.description || b.title || b.bill_type || b.type || `${t("fhBills") || "Bill"} #${i + 1}`}
                      </div>
                      {b.billing_month && (
                        <span className="text-[11px] text-secondary opacity-75">Month: {b.billing_month}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {resInfo ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-primary">{resInfo.name}</span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                              resInfo.isCurrent
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }`}
                          >
                            {resInfo.isCurrent ? "Current" : "Past"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-secondary">—</span>
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
                );
              })}
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
const ParcelsTab = ({ parcels, residents, t }) => {
  if (!parcels.length)
    return <Empty icon="📦" text={t("fhNoParcels") || "No parcels"} sub={t("fhNoParcelsSub") || "Courier deliveries for this flat will be logged here."} />;

  return (
    <div className="space-y-2.5">
      {parcels.map((p, i) => {
        const resInfo = resolveResidentForRecord(p, residents, "entry_time");
        return (
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

                {resInfo && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-secondary flex-wrap">
                    <span>Recipient:</span>
                    <span className="font-semibold text-primary">{resInfo.name}</span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        resInfo.isCurrent
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {resInfo.isCurrent ? "Current" : "Past"}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1 text-[11px] text-secondary flex-wrap">
                  {(p.arrived_at || p.created_at || p.date || p.entry_time) && (
                    <span>{String(p.arrived_at || p.created_at || p.date || p.entry_time).slice(0, 16).replace("T", " ")}</span>
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
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: VISITORS
────────────────────────────────────────────────────────────── */
const VisitorsTab = ({ visitors, residents, t }) => {
  if (!visitors.length)
    return <Empty icon="🚶" text={t("fhNoVisitors") || "No visitor logs"} sub={t("fhNoVisitorsSub") || "Guest check-ins and passes will appear here."} />;

  return (
    <div className="space-y-2.5">
      {visitors.map((v, i) => {
        const resInfo = resolveResidentForRecord(v, residents, "entry_time");
        return (
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

                {resInfo && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-secondary flex-wrap">
                    <span>Host Resident:</span>
                    <span className="font-semibold text-primary">{resInfo.name}</span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        resInfo.isCurrent
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {resInfo.isCurrent ? "Current" : "Past"}
                    </span>
                  </div>
                )}

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
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TAB: COMPLAINTS
────────────────────────────────────────────────────────────── */
const ComplaintsTab = ({ complaints, residents, t }) => {
  if (!complaints.length)
    return <Empty icon="📋" text={t("fhNoComplaints") || "No complaints"} sub={t("fhNoComplaintsSub") || "Tickets and issue reports for this flat will be listed here."} />;

  return (
    <div className="space-y-2.5">
      {complaints.map((c, i) => {
        const resInfo = resolveResidentForRecord(c, residents, "created_at");
        const complainerName = resInfo?.name || c.User?.name || c.user?.name || null;

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
              <div className="flex items-center gap-1.5 text-xs text-secondary flex-wrap">
                <span>Resident / Reported by:</span>
                <span className="font-semibold text-primary">{complainerName}</span>
                {resInfo && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      resInfo.isCurrent
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {resInfo.isCurrent ? "Current" : "Past"}
                  </span>
                )}
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
const ParkingTab = ({ parking, residents, t }) => {
  if (!parking.length)
    return <Empty icon="🚗" text={t("fhNoParking") || "No parking records"} sub={t("fhNoParkingSub") || "Allocated bays and vehicle passes will appear here."} />;

  return (
    <div className="space-y-2.5">
      {parking.map((p, i) => {
        const isAllocated = p.is_allocated_slot || p.slot_number;
        const displayName = p.slot_number || (p.assigned_spot ? `Bay ${p.assigned_spot}` : p.guest_name || `${t("fhParking") || "Slot"} #${i + 1}`);
        const resInfo = resolveResidentForRecord(p, residents, "expected_arrival");
        const residentName = p.resident_name || p.resident?.name || resInfo?.name || null;

        return (
          <div
            className="p-3.5 rounded-xl bg-transparent border border-glass-border flex items-center justify-between gap-3 hover:border-accent/40 transition-colors shadow-sm"
            key={p.id || i}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <MdLocalParking size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-primary">
                    {displayName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase">
                    🅿️ {p.slot_number || p.assigned_spot || "Slot"}
                  </span>
                  {p.parking_floor && (
                    <span className="px-2 py-0.5 rounded-md bg-transparent border border-glass-border text-secondary text-[11px] font-medium">
                      {p.parking_floor}
                    </span>
                  )}
                  {p.wing && (
                    <span className="px-2 py-0.5 rounded-md bg-transparent border border-glass-border text-secondary text-[11px] font-medium">
                      {p.wing}
                    </span>
                  )}
                  {isAllocated && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase">
                      {p.parking_type || "Standard"}
                    </span>
                  )}
                </div>

                {residentName && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-secondary flex-wrap">
                    <span>Resident:</span>
                    <span className="font-semibold text-primary">{residentName}</span>
                    {resInfo && (
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          resInfo.isCurrent
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {resInfo.isCurrent ? "Current" : "Past"}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-1 text-xs text-secondary flex-wrap">
                  {p.vehicle_number && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/20 text-slate-200 font-bold tracking-wide">
                      {p.vehicle_number}
                    </span>
                  )}
                  {p.vehicle_name && (
                    <span className="text-secondary font-medium">• {p.vehicle_name}</span>
                  )}
                  {p.vehicle_type && (
                    <span className="text-secondary">({p.vehicle_type})</span>
                  )}
                  {p.expected_arrival && (
                    <span>• {String(p.expected_arrival).slice(0, 10)}</span>
                  )}
                </div>
              </div>
            </div>
            <Pill status={p.status || (isAllocated ? "OCCUPIED" : "APPROVED")} t={t} />
          </div>
        );
      })}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuperAdmin = user?.activeRole === "SUPER_ADMIN" || user?.role === "SUPER_ADMIN";
  const canMoveOut = isSuperAdmin || hasPermission(user, "flat_history", "move_out") || hasPermission(user, "flat_history", "view");
  const canViewComplaints = isSuperAdmin || hasPermission(user, "complaints", "view");

  // ── SuperAdmin Society Selection ──
  const [societies, setSocieties] = useState([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);

  const querySocId = searchParams.get("societyId");
  const storedSocFilter = localStorage.getItem("superadmin_society_filter");
  const initialSocId = querySocId || (storedSocFilter && storedSocFilter !== "ALL" ? storedSocFilter : "") || "";
  const [selectedSocietyId, setSelectedSocietyId] = useState(initialSocId);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingSocieties(true);
      API.get("/societies")
        .then((res) => {
          const list = res.data || [];
          setSocieties(list);
        })
        .catch((err) => console.error("Failed to load societies", err))
        .finally(() => setLoadingSocieties(false));
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (querySocId && querySocId !== selectedSocietyId) {
      setSelectedSocietyId(querySocId);
      localStorage.setItem("superadmin_society_filter", querySocId);
    }
  }, [querySocId]);

  const handleSocietyChange = (newSocId) => {
    setSelectedSocietyId(newSocId);
    setSelectedFlat(null);
    setActiveBlock(ALL_BLOCKS);
    setSearch("");
    setFlatPage(1);
    if (newSocId) {
      localStorage.setItem("superadmin_society_filter", newSocId);
      setSearchParams({ societyId: newSocId });
    } else {
      localStorage.removeItem("superadmin_society_filter");
      setSearchParams({});
    }
  };

  const activeSocId = isSuperAdmin ? selectedSocietyId : (user?.society_id || null);

  const [flats, setFlats] = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [activeTab, setActiveTab] = useState("residents");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [activeBlock, setActiveBlock] = useState(ALL_BLOCKS);
  const [confirmMoveOut, setConfirmMoveOut] = useState(null);
  const [clearanceBlock, setClearanceBlock] = useState(null);
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

  /* ── 1. Load flat list on mount & when society changes ── */
  const loadFlats = useCallback(async () => {
    if (isSuperAdmin && !activeSocId) {
      setFlats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = activeSocId ? { "x-society-id": activeSocId } : {};
      const params = activeSocId ? { society_id: activeSocId } : {};
      const res = await API.get("/flats/getall", { headers, params });
      setFlats(toArr(res));
    } catch (err) {
      console.error("Flats fetch error:", err);
      toast.error(t("fhFetchError") || "Failed to load flats");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, activeSocId, t]);

  useEffect(() => {
    loadFlats();
  }, [loadFlats]);

  /* ── 2. Load full flat details when a card is clicked ── */
  const fetchFlatDetails = useCallback(async (flat) => {
    try {
      setLoading(true);
      setFetchError(null);
      setActiveTab("residents");

      const reqHeaders = activeSocId ? { "x-society-id": activeSocId } : {};

      const [
        residentsRes,
        billsRes,
        parcelsRes,
        visitorsRes,
        complaintsRes,
        parkingRes,
        parkingSlotsRes,
      ] = await Promise.allSettled([
        API.get(`/flat-history/${flat.id}`, { headers: reqHeaders }),
        API.get(`/bills/society`, { headers: reqHeaders }),
        API.get(`/parcels`, { headers: reqHeaders }),
        API.get(`/visitors`, { headers: reqHeaders }),
        canViewComplaints
          ? API.get(`/complaints?limit=200`, { headers: reqHeaders })
          : Promise.resolve(null),
        API.get(`/parking?limit=100&flat_id=${flat.id}`, { headers: reqHeaders }),
        API.get(`/parking-slots?limit=500`, { headers: reqHeaders }),
      ]);

      const safeArr = (result) =>
        result.status === "fulfilled" ? toArr(result.value) : [];

      let residents = (() => {
        if (residentsRes.status !== "fulfilled") return [];
        const raw = residentsRes.value?.data;
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.residents)) return raw.residents;
        if (typeof raw === "object") return [raw];
        return [];
      })();

      // Fallback: If API returns no residents but flat has resident_id or FlatMemberships
      if (residents.length === 0) {
        const fallbackList = [];
        if (Array.isArray(flat.FlatMemberships) && flat.FlatMemberships.length > 0) {
          flat.FlatMemberships.forEach((m) => {
            if (m.User && m.is_current !== false) {
              fallbackList.push({
                id: m.id,
                user_id: m.user_id,
                flat_id: flat.id,
                move_in_date: m.move_in_date || m.created_at,
                is_current: true,
                role: m.role || m.User.resident_type || "OWNER",
                User: m.User,
              });
            }
          });
        }
        if (fallbackList.length === 0 && (flat.User || flat.resident)) {
          const u = flat.User || flat.resident;
          fallbackList.push({
            id: u.id,
            user_id: u.id,
            flat_id: flat.id,
            move_in_date: flat.created_at,
            is_current: true,
            role: u.resident_type || "OWNER",
            User: u,
          });
        }
        if (fallbackList.length > 0) {
          residents = fallbackList;
        }
      }

      const byFlat = (arr) =>
        arr.filter(
          (item) =>
            String(item.flat_id ?? item.flatId ?? "") === String(flat.id) ||
            String(item.flat_number ?? "") === String(flat.flat_number)
        );

      const allResidentIds = new Set(
        [
          flat.resident_id,
          flat.resident?.id,
          flat.User?.id,
          ...residents.map((r) => r.id || r.user_id || r.User?.id),
        ]
          .filter(Boolean)
          .map(String)
      );

      const filteredComplaints = safeArr(complaintsRes).filter((c) => {
        if (c.flat_id != null && String(c.flat_id) === String(flat.id)) return true;
        if (c.Flat?.id != null && String(c.Flat.id) === String(flat.id)) return true;
        if (flat.flat_number && (String(c.flat_number ?? "") === String(flat.flat_number) || String(c.Flat?.flat_number ?? "") === String(flat.flat_number))) return true;
        if (c.resident_id != null && allResidentIds.has(String(c.resident_id))) return true;
        if (c.user_id != null && allResidentIds.has(String(c.user_id))) return true;
        return false;
      });

      const allSlots = safeArr(parkingSlotsRes);
      const allocatedSlots = allSlots
        .filter((s) => {
          if (s.flat_id != null && String(s.flat_id) === String(flat.id)) return true;
          if (s.Vehicle?.flat_id != null && String(s.Vehicle.flat_id) === String(flat.id)) return true;
          if (flat.flat_number && (String(s.flat_number ?? "") === String(flat.flat_number) || String(s.Flat?.flat_number ?? "") === String(flat.flat_number))) return true;
          return false;
        })
        .map((s) => ({
          ...s,
          is_allocated_slot: true,
          assigned_spot: s.slot_number,
          vehicle_number: s.Vehicle?.vehicle_number || s.vehicle_number,
          vehicle_name: s.Vehicle?.vehicle_name || s.vehicle_name,
          vehicle_type: s.Vehicle?.vehicle_type || s.vehicle_type,
          resident_name: s.resident?.name || s.resident_name,
          status: s.status || "OCCUPIED",
        }));

      const visitorParking = safeArr(parkingRes).filter(
        (p) => String(p.flat_id ?? "") === String(flat.id)
      );

      setData({
        residents,
        bills: byFlat(safeArr(billsRes)),
        parcels: byFlat(safeArr(parcelsRes)),
        visitors: byFlat(safeArr(visitorsRes)),
        complaints: filteredComplaints,
        parking: [...allocatedSlots, ...visitorParking],
      });

      setSelectedFlat(flat);
    } catch (err) {
      console.error("fetchFlatDetails error:", err);
      setFetchError(t("fhFetchError") || "Failed to load flat records");
    } finally {
      setLoading(false);
    }
  }, [activeSocId, canViewComplaints, t]);

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
    () => blockNames.flatMap((bName) => allBlockGroups[bName]?.flats || []),
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
      const bFlats = allBlockGroups[bName]?.flats || [];
      const cnt = bFlats.filter((f) =>
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
      : (activeBlock && allBlockGroups[activeBlock] ? (allBlockGroups[activeBlock]?.flats || []) : []);
    if (!searchTrim) return source;
    return source.filter((f) => flatSearchText(f).includes(searchTrim));
  }, [allFlats, allBlockGroups, activeBlock, isAllBlocks, searchTrim, flatSearchText]);

  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "occupied" | "vacant"

  const statusFilteredFlats = useMemo(() => {
    if (statusFilter === "occupied") {
      return activeBlockFlats.filter((f) => !!f.resident_id);
    }
    if (statusFilter === "vacant") {
      return activeBlockFlats.filter((f) => !f.resident_id);
    }
    return activeBlockFlats;
  }, [activeBlockFlats, statusFilter]);

  const [flatPage, setFlatPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const flatTotalPages = Math.max(1, Math.ceil(statusFilteredFlats.length / limit));
  const pagedFlats = useMemo(() => {
    return statusFilteredFlats.slice((flatPage - 1) * limit, flatPage * limit);
  }, [statusFilteredFlats, flatPage, limit]);

  const viewKey = `${activeBlock}|${statusFilter}|${searchTrim}`;
  const [prevViewKey, setPrevViewKey] = useState(viewKey);
  if (viewKey !== prevViewKey) {
    setPrevViewKey(viewKey);
    setFlatPage(1);
  }

  const openMoveOutConfirm = useCallback(async (resident) => {
    const userId =
      resident.user_id ?? resident.userId ?? resident.User?.id ?? resident.user?.id ?? null;
    const flatId = selectedFlat?.id;

    // 1. Pre-check clearance issues locally from loaded data
    const issues = [];
    const unpaidBills = (data.bills || []).filter(
      (b) => String(b.status || "").toLowerCase() !== "paid"
    );
    if (unpaidBills.length > 0) {
      const totalAmt = unpaidBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
      issues.push({
        type: "BILLS",
        title: `${unpaidBills.length} Unpaid Bill(s)`,
        detail: `Pending dues totaling ₹${totalAmt.toLocaleString("en-IN")}. Must be paid or cleared first.`,
        tab: "bills",
      });
    }

    const openTickets = (data.complaints || []).filter(
      (c) => ["OPEN", "IN_PROGRESS", "PENDING"].includes(String(c.status || "").toUpperCase())
    );
    if (openTickets.length > 0) {
      issues.push({
        type: "COMPLAINTS",
        title: `${openTickets.length} Open Complaint(s)`,
        detail: "Active complaint tickets must be resolved before move out.",
        tab: "complaints",
      });
    }

    const gateParcels = (data.parcels || []).filter(
      (p) => ["EXPECTED", "AT_GATE"].includes(String(p.status || "").toUpperCase())
    );
    if (gateParcels.length > 0) {
      issues.push({
        type: "PARCELS",
        title: `${gateParcels.length} Undelivered Parcel(s)`,
        detail: "Courier packages waiting at the gate or expected must be collected first.",
        tab: "parcels",
      });
    }

    const pendingPark = (data.parking || []).filter(
      (p) => String(p.status || "").toUpperCase() === "PENDING"
    );
    if (pendingPark.length > 0) {
      issues.push({
        type: "PARKING",
        title: `${pendingPark.length} Pending Parking Request(s)`,
        detail: "Open parking slot requests must be approved or rejected first.",
        tab: "parking",
      });
    }

    if (issues.length > 0) {
      setClearanceBlock({
        resident,
        flat: selectedFlat,
        issues,
      });
      return;
    }

    // 2. Query clearance API from server for backend verification
    if (flatId) {
      try {
        const res = await API.get(`/flat-history/${flatId}/clearance/${userId || ""}`);
        if (res.data && res.data.canMoveOut === false) {
          const serverIssues = (res.data.issues || []).map((msg) => ({
            type: "SERVER",
            title: "Clearance Required",
            detail: msg,
          }));
          setClearanceBlock({
            resident,
            flat: selectedFlat,
            issues: serverIssues,
          });
          return;
        }
      } catch (err) {
        if (err.response?.data?.canMoveOut === false) {
          setClearanceBlock({
            resident,
            flat: selectedFlat,
            issues: (err.response.data.issues || []).map((msg) => ({
              type: "SERVER",
              title: "Clearance Required",
              detail: msg,
            })),
          });
          return;
        }
      }
    }

    setConfirmMoveOut({ flat: selectedFlat, resident });
  }, [selectedFlat, data]);

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

      const headers = activeSocId ? { "x-society-id": activeSocId } : {};
      const params = activeSocId ? { society_id: activeSocId } : {};
      const res = await API.get("/flats/getall", { headers, params });
      const fresh = toArr(res);
      setFlats(fresh);
      const updated = fresh.find((f) => String(f.id) === String(flat.id));
      if (updated) await fetchFlatDetails(updated);
    } catch (err) {
      console.error("Move-out error:", err);
      const resData = err.response?.data;
      if (resData?.canMoveOut === false && Array.isArray(resData?.issues)) {
        setClearanceBlock({
          resident: confirmMoveOut.resident,
          flat: confirmMoveOut.flat,
          issues: resData.issues.map((msg) => ({
            type: "SERVER",
            title: "Clearance Required",
            detail: msg,
          })),
        });
        toast.error("Clearance required: " + resData.issues.join("; "));
      } else {
        toast.error(resData?.message || t("fhMoveOutFail") || "Failed to process move out");
      }
    } finally {
      setMovingOut(false);
    }
  }, [confirmMoveOut, movingOut, t, fetchFlatDetails, activeSocId]);

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
        return <BillsTab bills={data.bills} residents={data.residents} t={t} />;
      case "parcels":
        return <ParcelsTab parcels={data.parcels} residents={data.residents} t={t} />;
      case "visitors":
        return <VisitorsTab visitors={data.visitors} residents={data.residents} t={t} />;
      case "complaints":
        return <ComplaintsTab complaints={data.complaints} residents={data.residents} t={t} />;
      case "parking":
        return <ParkingTab parking={data.parking} residents={data.residents} t={t} />;
      default:
        return null;
    }
  };

  return (
    <div className="fh-root flat-history-page space-y-5 animate-fadeIn">
      {/* ── 1. Header & Navigation Controls (Always Visible with Society Dropdown in Same Row) ── */}
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
          {/* SuperAdmin Society Selector in the SAME ROW with header controls */}
          {isSuperAdmin && (
            <div style={{ minWidth: 180, maxWidth: 260 }} className="shrink-0">
              <Select
                value={selectedSocietyId}
                onChange={(e) => handleSocietyChange(e.target.value)}
                style={{ width: "100%", height: 38, borderRadius: 10, fontSize: 13, fontWeight: 700 }}
              >
                <option value="">Select Society...</option>
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          {blockNames.length > 0 && (
            <div style={{ minWidth: 160, maxWidth: 220 }} className="shrink-0">
              <Select
                value={activeBlock}
                onChange={(e) => {
                  setActiveBlock(e.target.value);
                  setFlatPage(1);
                }}
                style={{
                  width: "100%",
                  height: 38,
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "var(--card-inner-bg)",
                  border: "1px solid var(--divider, rgba(99, 102, 241, 0.12))",
                }}
              >
                <option value={ALL_BLOCKS}>
                  {t("allBlocks") || "All Blocks"} ({allFlats.length})
                </option>
                {blockNames.map((bName) => {
                  const count = allBlockGroups[bName]?.flats?.length || 0;
                  return (
                    <option key={bName} value={bName}>
                      {bName} ({count})
                    </option>
                  );
                })}
              </Select>
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

      {/* ── Body: Ask to select society if not selected ── */}
      {isSuperAdmin && !activeSocId ? (
        <div className="card" style={{ padding: 48, textAlign: "center", borderRadius: 18, border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "rgba(160, 90, 255, 0.12)",
            border: "1px solid rgba(160, 90, 255, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            margin: "0 auto 16px"
          }}>
            <MdApartment size={28} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Select a Society</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 440, margin: "8px auto 0" }}>
            Please select a society from the dropdown above in the header to view its flats, residents, and tenancy history.
          </p>
        </div>
      ) : (
        <>
          {/* ── 2. Summary KPI Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={MdApartment}
          value={flats.length}
          label={t("fhTotalFlats", "Total Flats")}
          tone="brand"
          description={`${blockNames.length} ${blockNames.length === 1 ? "Block" : "Blocks"}`}
          active={statusFilter === "all" && isAllBlocks}
          onClick={() => { setStatusFilter("all"); setActiveBlock(ALL_BLOCKS); }}
        />
        <StatCard
          icon={MdPerson}
          value={totalOccupied}
          label={t("fhOccupiedFlats", "Occupied Flats")}
          tone="info"
          description={`${flats.length ? Math.round((totalOccupied / flats.length) * 100) : 0}% Occupancy`}
          active={statusFilter === "occupied"}
          onClick={() => setStatusFilter(statusFilter === "occupied" ? "all" : "occupied")}
        />
        <StatCard
          icon={MdMeetingRoom}
          value={totalVacant}
          label={t("fhVacantFlats", "Vacant Flats")}
          tone="success"
          description="Ready to assign"
          active={statusFilter === "vacant"}
          onClick={() => setStatusFilter(statusFilter === "vacant" ? "all" : "vacant")}
        />
        <StatCard
          icon={MdDoorFront}
          value={statusFilteredFlats.length}
          label={isAllBlocks ? (t("allBlocks", "All Blocks")) : activeBlock}
          tone="warning"
          description={`${statusFilteredFlats.length} flats matched`}
          onClick={() => setStatusFilter("all")}
        />
      </div>

      {/* ── 3. Flats Card Grid Section ── */}
      <div
        className="fh-grid-section rounded-2xl p-4 sm:p-6"
        style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--divider, rgba(99, 102, 241, 0.08))",
          borderRadius: 20,
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        {isAllBlocks || (activeBlock && allBlockGroups[activeBlock]) ? (
          <div>
            {/* Filter Bar: Status tabs + Search count */}
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 mb-5"
              style={{ borderBottom: "1px solid var(--divider, rgba(99, 102, 241, 0.08))" }}
            >
              {/* Status Filter Segmented Control */}
              <div
                className="flex items-center gap-1.5 p-1.5 rounded-2xl w-fit flex-wrap"
                style={{
                  background: "var(--card-inner-bg, rgba(248, 250, 252, 0.8))",
                  border: "1px solid var(--divider, rgba(99, 102, 241, 0.08))",
                  boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.02)",
                }}
              >
                <button
                  type="button"
                  onClick={() => { setStatusFilter("all"); setFlatPage(1); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-accent text-white shadow-md shadow-accent/25"
                      : "text-secondary hover:text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <MdApartment size={15} />
                  <span>All Units</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{
                      background: statusFilter === "all" ? "rgba(255, 255, 255, 0.22)" : "rgba(99, 102, 241, 0.08)",
                      color: statusFilter === "all" ? "#ffffff" : "var(--accent, #6366f1)",
                    }}
                  >
                    {activeBlockFlats.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusFilter("occupied"); setFlatPage(1); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    statusFilter === "occupied"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "text-secondary hover:text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>Occupied</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{
                      background: statusFilter === "occupied" ? "rgba(255, 255, 255, 0.22)" : "rgba(79, 70, 229, 0.08)",
                      color: statusFilter === "occupied" ? "#ffffff" : "#4f46e5",
                    }}
                  >
                    {activeBlockFlats.filter((f) => !!f.resident_id).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusFilter("vacant"); setFlatPage(1); }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    statusFilter === "vacant"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                      : "text-secondary hover:text-primary hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Vacant</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{
                      background: statusFilter === "vacant" ? "rgba(255, 255, 255, 0.22)" : "rgba(16, 185, 129, 0.08)",
                      color: statusFilter === "vacant" ? "#ffffff" : "#059669",
                    }}
                  >
                    {activeBlockFlats.filter((f) => !f.resident_id).length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-secondary font-medium">
                <span className="px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.04]" style={{ border: "1px solid var(--divider, rgba(99, 102, 241, 0.08))" }}>
                  Showing <strong>{statusFilteredFlats.length}</strong> {statusFilter !== "all" ? statusFilter : ""} flats{" "}
                  {isAllBlocks ? "across All Blocks" : `in ${activeBlock}`}
                </span>
              </div>
            </div>

            {statusFilteredFlats.length === 0 ? (
              <Empty
                icon="🔍"
                text={t("fhNoFlatsFound", "No matching flats found")}
                sub={t("fhNoFlatsSub", "Try changing your status filter, search query, or selecting a different block above.")}
              />
            ) : (
              <div key={`${flatPage}-${statusFilter}`} className="animate-slide-page">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {pagedFlats.map((flat, i) => {
                    const occ = !!flat.resident_id;
                    const isSelected = selectedFlat?.id === flat.id;
                    const residentName = getFlatOwnerName(flat) || (occ ? "Occupied Resident" : null);
                    const blockName = getBlockName(flat);
                    const initial = residentName?.trim()?.charAt(0)?.toUpperCase() || "R";

                    return (
                      <div
                        key={flat.id}
                        onClick={() => fetchFlatDetails(flat)}
                        style={{
                          animationDelay: `${i * 15}ms`,
                          position: "relative",
                          borderRadius: 18,
                          padding: "16px 18px",
                          cursor: "pointer",
                          transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                          background: "var(--card-inner-bg, #ffffff)",
                          border: isSelected
                            ? "2px solid var(--accent, #6366f1)"
                            : "1px solid var(--divider, rgba(99, 102, 241, 0.09))",
                          boxShadow: isSelected
                            ? "0 10px 25px -3px rgba(99, 102, 241, 0.22)"
                            : "0 2px 8px -2px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)",
                          outline: "none",
                        }}
                        className="group hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1"
                      >
                        {/* Top Header: Icon + Unit Number + BHK + Status Badge */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              background: occ ? "rgba(99, 102, 241, 0.09)" : "rgba(16, 185, 129, 0.09)",
                              border: occ ? "1px solid rgba(99, 102, 241, 0.18)" : "1px solid rgba(16, 185, 129, 0.18)",
                              color: occ ? "var(--accent, #6366f1)" : "#10b981",
                            }}>
                              {occ ? <MdApartment size={21} /> : <MdDoorFront size={21} />}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "nowrap" }}>
                                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                                  {formatFlatTitle(flat.flat_number)}
                                </span>
                                {flat.flat_type && <BhkBadge type={flat.flat_type} />}
                              </div>

                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                color: "var(--text-secondary)",
                                marginTop: 3,
                                flexWrap: "nowrap",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}>
                                <span style={{ fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{blockName}</span>
                                {flat.Floor?.floor_number != null && (
                                  <>
                                    <span style={{ opacity: 0.4 }}>•</span>
                                    <span style={{ whiteSpace: "nowrap" }}>Floor {flat.Floor.floor_number}</span>
                                  </>
                                )}
                                {flat.area_sqft && (
                                  <>
                                    <span style={{ opacity: 0.4 }}>•</span>
                                    <span style={{ whiteSpace: "nowrap" }}>{flat.area_sqft} sq.ft</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3.5px 10px",
                            borderRadius: 999,
                            background: occ ? "rgba(99, 102, 241, 0.08)" : "rgba(16, 185, 129, 0.08)",
                            color: occ ? "#4f46e5" : "#059669",
                            border: occ ? "1px solid rgba(99, 102, 241, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: occ ? "#4f46e5" : "#10b981",
                              boxShadow: occ ? "0 0 6px rgba(79, 70, 229, 0.4)" : "0 0 6px rgba(16, 185, 129, 0.4)",
                            }} />
                            <span>{occ ? t("fhOccupied", "Occupied") : t("fhVacant", "Vacant")}</span>
                          </span>
                        </div>

                        {/* Bottom Section: Resident Strip OR Vacant Action */}
                        <div style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: "1px solid var(--divider, rgba(99, 102, 241, 0.08))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          minHeight: 46,
                        }}>
                          {occ ? (
                            <>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p
                                  title={residentName}
                                  style={{
                                    margin: 0,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {residentName}
                                </p>
                                <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {flat.resident_type || "Primary Resident"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchFlatDetails(flat);
                                }}
                                title={t("fhViewHistory", "View History")}
                                aria-label="View History"
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  background: "var(--card-inner-bg, rgba(0, 0, 0, 0.03))",
                                  color: "var(--text-secondary, #64748b)",
                                  border: "1px solid var(--divider, rgba(99, 102, 241, 0.12))",
                                  cursor: "pointer",
                                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                                }}
                                className="hover:!bg-accent hover:!text-white hover:!border-accent hover:shadow-md hover:shadow-accent/25 hover:scale-105 active:scale-95 group-hover:border-accent/40 group-hover:text-primary"
                              >
                                <MdVisibility size={17} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{
                                  margin: 0,
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "var(--text-primary)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>
                                  Vacant Flat
                                </p>
                                <p style={{
                                  margin: 0,
                                  fontSize: 11,
                                  color: "var(--text-secondary)",
                                  marginTop: 2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>
                                  Ready to Move In
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchFlatDetails(flat);
                                }}
                                title={t("fhViewHistory", "View History")}
                                aria-label="View History"
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  background: "var(--card-inner-bg, rgba(0, 0, 0, 0.03))",
                                  color: "var(--text-secondary, #64748b)",
                                  border: "1px solid var(--divider, rgba(99, 102, 241, 0.12))",
                                  cursor: "pointer",
                                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                                }}
                                className="hover:!bg-accent hover:!text-white hover:!border-accent hover:shadow-md hover:shadow-accent/25 hover:scale-105 active:scale-95 group-hover:border-accent/40 group-hover:text-primary"
                              >
                                <MdVisibility size={17} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Footer */}
                <div
                  className="flex flex-col sm:flex-row justify-between items-center px-2 pt-5 mt-4 gap-3"
                  style={{ borderTop: "1px solid var(--divider, rgba(99, 102, 241, 0.08))" }}
                >
                  <span className="text-xs text-secondary font-medium">
                    Showing <strong>{pagedFlats.length}</strong> of <strong>{statusFilteredFlats.length}</strong> flats{" "}
                    {isAllBlocks ? (t("allBlocks", "All Blocks")).toLowerCase() : `in ${activeBlock}`}
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
          <Empty icon="🏢" text={t("fhNoFlatsFound", "No flats found")} sub={t("fhNoFlatsSub", "Select a valid block.")} />
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
                {t("fhFlat") || "Flat"} {formatFlatTitle(selectedFlat.flat_number)}
              </span>
              <GlobalBadge
                size="sm"
                variant="neutral"
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
              }${confirmMoveOut.flat ? ` — ${t("fhFlat") || "Flat"} ${formatFlatTitle(confirmMoveOut.flat.flat_number)}` : ""}?`
            : ""
        }
        confirmLabel={t("fhConfirmMoveOut") || "Confirm Move Out"}
        cancelLabel={t("fhCancel") || "Cancel"}
        variant="danger"
        icon={MdLogout}
        loading={movingOut}
      />

      {/* ── 6. Clearance Required Dialog (Blocks Move-out if Dues/Complaints/Parcels/Parking pending) ── */}
      {clearanceBlock && (
        <GlobalModal
          isOpen={!!clearanceBlock}
          onClose={() => setClearanceBlock(null)}
          size="md"
          icon={<MdWarning size={22} className="text-amber-500" />}
          title="Clearance Required Before Move-Out"
          subtitle={`Flat ${formatFlatTitle(clearanceBlock.flat?.flat_number) || ""} has pending items that must be resolved first`}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <strong>Cannot mark {clearanceBlock.resident?.User?.name || clearanceBlock.resident?.name || "resident"} as moved out.</strong>
              <p className="mt-1">
                To prevent new residents from inheriting uncleared charges or open tickets, all pending bills, complaints, gate parcels, and parking requests must be resolved before proceeding.
              </p>
            </div>

            <div className="space-y-2.5">
              {clearanceBlock.issues.map((iss, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-glass-border flex items-start justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-primary">{iss.title}</p>
                    <p className="text-[11px] text-secondary mt-0.5">{iss.detail}</p>
                  </div>
                  {iss.tab && (
                    <GlobalButton
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setActiveTab(iss.tab);
                        setClearanceBlock(null);
                      }}
                    >
                      View
                    </GlobalButton>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <GlobalButton variant="secondary" onClick={() => setClearanceBlock(null)}>
                Close
              </GlobalButton>
            </div>
          </div>
        </GlobalModal>
      )}
        </>
      )}
    </div>
  );
};

export default FlatHistory;
