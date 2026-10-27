import { useState } from "react";
import { MdPerson, MdOutlineInbox, MdAccessTime, MdVisibility } from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import Select from "../../../components/common/Select";
import SlidingTabs from "../../../components/common/SlidingTabs";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import GlobalTable from "../../../components/common/GlobalTable";
import GlobalBadge from "../../../components/common/GlobalBadge";
import GlobalModal from "../../../components/common/GlobalModal";

const safeLabel = (translate, key, fallback) => {
  const raw = translate(key);
  if (!raw || raw === key || raw.toLowerCase().includes("filter") || raw.toLowerCase().includes("vifilter")) {
    return fallback;
  }
  return raw;
};

export default function Index({
  isSuperAdmin,
  counts,
  logs,
  initialLoad,
  fetching,
  page,
  pageSize,
  totalPages,
  totalItems,
  filter,
  search,
  isSearchOpen,
  societiesList,
  blocks,
  floors,
  flats,
  filterSocietyId,
  filterBlockId,
  filterFloorId,
  filterFlatId,
  onFilterChange,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSearchOpenChange,
  onSocietyChange,
  onBlockChange,
  onFloorChange,
  onFlatChange,
}) {
  const { t } = useLang();
  const [detailVisitor, setDetailVisitor] = useState(null);

  const getCleanLabel = (key, fallback) => {
    return safeLabel(t, key, fallback);
  };

  const label = (key, fallback) => getCleanLabel(key, fallback);

  const filterTabs = [
    { id: "ALL", label: getCleanLabel("vlFilterAll", getCleanLabel("vlTabAll", "All")), badge: counts.ALL || 0 },
    { id: "IN",  label: getCleanLabel("vlFilterIn", getCleanLabel("vlTabInside", "Currently In")), badge: counts.IN || 0 },
    { id: "OUT", label: getCleanLabel("vlFilterOut", getCleanLabel("vlTabExited", "Checked Out")), badge: counts.OUT || 0 },
  ];

  const columns = [
    {
      key: "idx",
      header: t("srNo") || "Sr. No.",
      width: 65,
      render: (_, idx) => (
        <span style={{ color: "var(--text-tertiary)", fontSize: "0.82rem", fontWeight: 500 }}>
          {(page - 1) * pageSize + idx + 1}
        </span>
      ),
    },
    {
      key: "visitor",
      header: t("vlColVisitor") || "Visitor",
      render: (v) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(160, 90, 255, 0.15)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MdPerson size={15} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.25 }}>
              {v.name}
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
              {v.mobile}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "flat",
      header: label("vlColFlat", "Flat"),
      hiddenMobile: true,
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.85rem" }}>
          {v.flat}
        </span>
      ),
    },
    {
      key: "intime",
      header: label("vlColIn", "In Time"),
      render: (v) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: "0.82rem", fontWeight: 600 }}>
          <MdAccessTime size={13} /> {v.intime}
        </span>
      ),
    },
    {
      key: "outtime",
      header: label("vlColOut", "Out Time"),
      hiddenMobile: true,
      render: (v) => (
        v.outtime ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            <MdAccessTime size={13} /> {v.outtime}
          </span>
        ) : (
          <span style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>—</span>
        )
      ),
    },
    {
      key: "duration",
      header: label("vlDuration", "Duration"),
      hiddenMobile: true,
      render: (v) => (
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: v.ongoing ? "#10b981" : "var(--text-secondary)" }}>
          {v.duration}
        </span>
      ),
    },
    {
      key: "status",
      header: label("billStatusCol", "Status"),
      render: (v) => (
        <GlobalBadge
          variant={v.status === "IN" ? "success" : "neutral"}
          dot
        >
          {v.status === "IN" ? t("vlIn") || "IN" : t("vlOut") || "OUT"}
        </GlobalBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDetailVisitor(v);
          }}
          title={t("vlViewDetails") || "View details"}
          aria-label={t("vlViewDetails") || "View details"}
          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
          style={{
            background: "var(--card-inner-bg)",
            color: "var(--text-secondary)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <MdVisibility size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── Page Header: Unified Single Row with Sliding Tabs, Unit Filters & Search ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(158, 88, 255, 0.3)",
              color: "#ffffff",
            }}
          >
            <MdOutlineInbox size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0 }}>
              {t("vlTitle") || "Visitor Logs"}
            </h2>
            <p className="text-secondary text-xs mt-0.5">
              {totalItems} {t("vlSubtitle") || "Total visitor records"}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto max-w-full pb-1">
          {/* Status Toggle Sliding Tabs */}
          <SlidingTabs
            value={filter}
            onChange={onFilterChange}
            items={isSearchOpen ? filterTabs.filter((t) => t.id === filter) : filterTabs}
          />

          {/* Unit Filters Dropdowns */}
          {isSuperAdmin && (
            <Select
              className="input h-10 text-xs min-w-30 bg-white/5 border-white/10"
              value={filterSocietyId}
              onChange={e => onSocietyChange(e.target.value)}
            >
              <option value="">{t("allSocieties") || "All Societies"}</option>
              {societiesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterBlockId}
            onChange={e => onBlockChange(e.target.value)}
          >
            <option value="">{t("allBlocks") || "All Blocks"}</option>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>

          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterFloorId}
            onChange={e => onFloorChange(e.target.value)}
            disabled={!filterBlockId}
          >
            <option value="">{t("allFloors") || "All Floors"}</option>
            {floors.map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
          </Select>

          <Select
            className="input h-10 text-xs min-w-28 bg-white/5 border-white/10"
            value={filterFlatId}
            onChange={e => onFlatChange(e.target.value)}
            disabled={!filterFloorId}
          >
            <option value="">{t("allFlats") || "All Flats"}</option>
            {flats.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
          </Select>

          {/* Expandable Animated Search Slider */}
          <ExpandableSearch
            value={search}
            onChange={onSearchChange}
            placeholder={t("vlSearch") || "Search visitors, flat, purpose…"}
            fetching={fetching}
            isOpen={isSearchOpen}
            onOpenChange={onSearchOpenChange}
          />
        </div>
      </div>

      {/* ── GLOBAL TABLE WITH ANIMATION ── */}
      <div key={`${filter}-${page}`} className="animate-slide-page">
        <GlobalTable
          columns={columns}
          data={logs}
          loading={initialLoad}
          emptyMessage={counts.ALL === 0 ? (t("vlEmpty") || "No visitor logs yet") : (t("vlNoMatch") || "No matching visitor logs")}
          emptyIcon={MdOutlineInbox}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          onRowClick={setDetailVisitor}
        />
      </div>

      <VisitorDetailModal
        visitor={detailVisitor}
        onClose={() => setDetailVisitor(null)}
      />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: "1px solid var(--divider)" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="text-right" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflowWrap: "anywhere" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function VisitorDetailModal({ visitor, onClose }) {
  const { t } = useLang();
  if (!visitor) return null;

  return (
    <GlobalModal
      isOpen={Boolean(visitor)}
      onClose={onClose}
      title={t("vlDetailTitle") || "Visitor Details"}
      subtitle={`${visitor.name} · ${visitor.date}`}
      icon={MdPerson}
      size="md"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(160, 90, 255, 0.15)", color: "var(--accent)" }}
          >
            <MdPerson size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>{visitor.name}</p>
            <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{visitor.mobile}</p>
          </div>
        </div>
        <GlobalBadge variant={visitor.status === "IN" ? "success" : "neutral"} dot>
          {visitor.status === "IN" ? t("vlIn") || "IN" : t("vlOut") || "OUT"}
        </GlobalBadge>
      </div>

      <div>
         <DetailRow label={safeLabel(t, "vlColPurpose", "Purpose")} value={visitor.purpose} />
         <DetailRow label={safeLabel(t, "vlColFlat", "Flat")} value={visitor.flat} />
         <DetailRow label={safeLabel(t, "vlColOwner", "Owner / Resident")} value={visitor.owner} />
         <DetailRow label={safeLabel(t, "vlEntryDate", "Entry Date")} value={visitor.entryDate} />
         <DetailRow label={safeLabel(t, "vlColIn", "In Time")} value={visitor.intime} />
         <DetailRow label={safeLabel(t, "vlExitDate", "Exit Date")} value={visitor.exitDate || (visitor.ongoing ? safeLabel(t, "vlOngoing", "Ongoing") : "—")} />
         <DetailRow label={safeLabel(t, "vlColOut", "Out Time")} value={visitor.outtime || safeLabel(t, "vlOngoing", "Ongoing")} />
        <DetailRow
           label={safeLabel(t, "vlTotalStay", "Total Stay")}
          value={visitor.ongoing ? `${t("vlOngoing") || "Ongoing"} · ${visitor.duration}` : visitor.duration}
        />
         <DetailRow label={safeLabel(t, "vlVehicle", "Vehicle")} value={visitor.vehicle} />
      </div>
    </GlobalModal>
  );
}
