import { useState } from "react";
import {
  MdInventory2,
  MdOutlineInbox,
  MdLocalShipping,
  MdStorefront,
  MdCheckCircle,
  MdMeetingRoom,
  MdArrowForward,
} from "react-icons/md";
import { FaUserShield, FaRegHandPaper, FaBuilding } from "react-icons/fa";
import SlidingTabs from "../../../components/common/SlidingTabs";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import Pagination from "../../../components/common/Pagination";
import GlobalBadge from "../../../components/common/GlobalBadge";
import Select from "../../../components/common/Select";
import {
  getLoggedAt,
  getStatusMeta,
  getUnitDetails,
  getUnitLabel,
  formatDate,
  resolveArrivalGuard,
  resolveDeliveryGuard,
  resolveRequester,
  resolveResident,
} from "../parcelDetails";

/** Modern Stat Counter Card */
const StatCard = ({ icon: Icon, title, count, color, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-1 min-w-[130px] p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
    style={{
      background: active ? `${color}14` : "var(--card-bg)",
      borderColor: active ? color : "var(--glass-border)",
      boxShadow: active ? `0 8px 20px -4px ${color}33` : "none",
    }}
  >
    <div className="flex items-center justify-between gap-2">
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${color}1f`,
          border: `1px solid ${color}38`,
          color: color,
        }}
      >
        <Icon size={16} />
      </span>
      <span
        className="text-lg font-black tracking-tight"
        style={{ color: active ? color : "var(--text-primary)" }}
      >
        {count || 0}
      </span>
    </div>
    <p
      className="text-xs font-semibold mt-2.5 truncate"
      style={{ color: active ? color : "var(--text-secondary)", margin: "10px 0 0" }}
    >
      {title}
    </p>
  </button>
);

/** Modern, Attractive Parcel Card */
const ParcelCard = ({ parcel, onOpen }) => {
  const meta = getStatusMeta(parcel.status);
  const unit = getUnitLabel(parcel);
  const unitDetails = getUnitDetails(parcel);
  const resident = resolveResident(parcel);
  const requester = resolveRequester(parcel);
  const arrival = resolveArrivalGuard(parcel);
  const delivery = resolveDeliveryGuard(parcel);
  const loggedAt = getLoggedAt(parcel);

  const requestedByOther =
    requester && resident && requester.id !== resident.id ? requester : null;

  return (
    <div
      onClick={() => onOpen(parcel)}
      className="group relative flex flex-col justify-between rounded-3xl p-4 bg-card border cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{
        borderColor: "var(--glass-border)",
      }}
    >
      {/* Glow overlay on hover */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${meta.accent}12 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 space-y-3">
        {/* Top row: Courier info + Status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${meta.accent}22, ${meta.accent}12)`,
                border: `1px solid ${meta.accent}38`,
                color: meta.accent,
              }}
            >
              <MdLocalShipping size={20} />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-primary truncate m-0 group-hover:text-accent transition-colors">
                {parcel.courier_name || "Courier Package"}
              </h4>
              <p className="text-xs text-secondary mt-0.5 m-0">
                <span className="font-semibold text-tertiary">#{parcel.id}</span>
              </p>
            </div>
          </div>
          <GlobalBadge variant={meta.variant} dot size="sm">
            {meta.label}
          </GlobalBadge>
        </div>

        {/* Clear Destination Unit Box (Wing, Floor, Flat) */}
        <div
          className="p-2.5 rounded-2xl flex items-center gap-2.5 text-xs"
          style={{
            background: "var(--card-inner-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <MdMeetingRoom size={17} className="text-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-primary m-0 leading-tight">
              {unit}
            </p>
          </div>
        </div>

        {/* Resident & Requester info */}
        <div className="text-xs text-secondary leading-snug space-y-1">
          <p className="m-0 truncate">
            <span className="text-tertiary font-medium">To: </span>
            <span className="font-bold text-primary">
              {resident ? resident.name : "No resident recorded"}
            </span>
            {requestedByOther ? (
              <span className="text-tertiary text-[11px] ml-1">
                (by {requestedByOther.name})
              </span>
            ) : null}
          </p>

          {parcel.Society?.name && (
            <div className="flex items-center gap-1.5 text-[11px] text-secondary font-medium pt-0.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px]"
                style={{
                  background: "rgba(124, 58, 237, 0.08)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  color: "var(--accent)",
                }}
              >
                <FaBuilding size={10} className="shrink-0" />
                <span className="truncate">{parcel.Society.name}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer: Gate Handling & Timestamp */}
      <div
        className="relative z-10 mt-3 pt-3 border-t flex items-center justify-between gap-2 text-[11px]"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {arrival ? (
            <span
              className="inline-flex items-center gap-1 font-semibold text-amber-500 truncate"
              title={`Gate arrival: ${arrival.name}`}
            >
              <FaUserShield size={11} className="shrink-0" />
              <span className="truncate">{arrival.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-tertiary">
              <FaUserShield size={11} className="shrink-0" />
              <span>Gate: —</span>
            </span>
          )}

          {delivery && (
            <span
              className="inline-flex items-center gap-1 font-semibold text-emerald-500 truncate"
              title={`Delivered by: ${delivery.name}`}
            >
              <FaRegHandPaper size={11} className="shrink-0" />
              <span className="truncate">{delivery.name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-tertiary shrink-0">
          {loggedAt && (
            <span className="text-[10px] whitespace-nowrap">
              {formatDate(loggedAt)}
            </span>
          )}
          <MdArrowForward
            size={14}
            className="text-tertiary group-hover:text-accent group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="rounded-3xl p-4 bg-card border space-y-3" style={{ borderColor: "var(--glass-border)" }}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="animate-pulse rounded-2xl w-10 h-10" style={{ background: "var(--card-inner-bg)" }} />
        <div className="space-y-1.5">
          <div className="animate-pulse rounded h-3 w-28" style={{ background: "var(--card-inner-bg)" }} />
          <div className="animate-pulse rounded h-2.5 w-16" style={{ background: "var(--card-inner-bg)" }} />
        </div>
      </div>
      <div className="animate-pulse rounded-full h-5 w-16" style={{ background: "var(--card-inner-bg)" }} />
    </div>
    <div className="animate-pulse rounded-lg h-8 w-full" style={{ background: "var(--card-inner-bg)" }} />
    <div className="animate-pulse rounded h-3 w-3/4" style={{ background: "var(--card-inner-bg)" }} />
    <div className="animate-pulse rounded h-2 w-full pt-2" style={{ background: "var(--card-inner-bg)" }} />
  </div>
);

export default function Index({
  rows,
  counts,
  status,
  onStatusChange,
  search,
  onSearchChange,
  isSearchOpen,
  onSearchOpenChange,
  loading,
  refreshing,
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onOpen,
  societyLabel,
  isSuperAdmin,
  societies = [],
  societyId = "",
  onSocietyChange,
}) {
  const tabs = [
    { id: "ALL", label: "All", badge: counts.ALL },
    { id: "EXPECTED", label: "Expected", badge: counts.EXPECTED },
    { id: "AT_GATE", label: "At Gate", badge: counts.AT_GATE },
    { id: "COLLECTED", label: "Collected", badge: counts.COLLECTED },
    { id: "CANCELLED", label: "Cancelled", badge: counts.CANCELLED },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Top Hero / Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              boxShadow: "0 8px 24px -4px rgba(124, 58, 237, 0.4)",
              color: "#ffffff",
            }}
          >
            <MdInventory2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-primary m-0">
                Parcel Management
              </h1>
              {societyLabel && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(124, 58, 237, 0.12)",
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    color: "var(--accent)",
                  }}
                >
                  {societyLabel}
                </span>
              )}
            </div>
            <p className="text-secondary text-xs mt-1 m-0">
              Track deliveries, gate acknowledgments, and resident handovers in real time.
            </p>
          </div>
        </div>

        {/* Search, Tabs & SuperAdmin Society Filter Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1">
          <SlidingTabs
            value={status}
            onChange={onStatusChange}
            items={isSearchOpen ? tabs.filter((tab) => tab.id === status) : tabs}
          />

          <ExpandableSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Search courier, unit, resident…"
            fetching={refreshing}
            isOpen={isSearchOpen}
            onOpenChange={onSearchOpenChange}
            maxWidth={300}
          />

          {isSuperAdmin && (
            <Select
              className="input"
              value={societyId || "ALL"}
              onChange={(e) => onSocietyChange?.(e.target.value)}
              style={{ height: 40, fontSize: 13, minWidth: 190, maxWidth: 220, borderRadius: "10px" }}
            >
              <option value="ALL">All Societies (Global View)</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* ── Quick Stats Metric Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={MdInventory2}
          title="All Parcels"
          count={counts.ALL}
          color="#6366f1"
          active={status === "ALL"}
          onClick={() => onStatusChange("ALL")}
        />
        <StatCard
          icon={MdLocalShipping}
          title="Expected"
          count={counts.EXPECTED}
          color="#60a5fa"
          active={status === "EXPECTED"}
          onClick={() => onStatusChange("EXPECTED")}
        />
        <StatCard
          icon={MdStorefront}
          title="At Gate"
          count={counts.AT_GATE}
          color="#f59e0b"
          active={status === "AT_GATE"}
          onClick={() => onStatusChange("AT_GATE")}
        />
        <StatCard
          icon={MdCheckCircle}
          title="Collected"
          count={counts.COLLECTED}
          color="#10b981"
          active={status === "COLLECTED"}
          onClick={() => onStatusChange("COLLECTED")}
        />
      </div>

      {/* ── Cards Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div
          className="py-16 flex flex-col items-center justify-center gap-3 rounded-3xl bg-card border text-center p-6"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-tertiary"
            style={{ background: "var(--card-inner-bg)", border: "1px solid var(--glass-border)" }}
          >
            <MdOutlineInbox size={32} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary m-0">
              {search.trim()
                ? `No parcels matching "${search.trim()}"`
                : status === "ALL"
                ? "No parcel records found"
                : `No ${getStatusMeta(status).label.toLowerCase()} parcels`}
            </h3>
            <p className="text-xs text-secondary mt-1 m-0">
              {search.trim()
                ? "Try checking for spelling errors or search by courier, unit, or recipient name."
                : "New incoming parcels logged at the gate or requested by residents will appear here."}
            </p>
          </div>
          {search.trim() ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="mt-1 px-4 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-sm hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              Clear Search
            </button>
          ) : null}
        </div>
      ) : (
        <div
          key={`${status}-${page}`}
          className="animate-slide-page grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          {rows.map((p) => (
            <ParcelCard key={p.id} parcel={p} onOpen={onOpen} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <span className="text-xs font-medium text-tertiary">
          {totalItems > 0
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                totalItems
              )} of ${totalItems} parcels`
            : "No records to display"}
        </span>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
