import { MdPerson, MdOutlineInbox, MdAccessTime } from "react-icons/md";
import { useLang } from "../../../context/LanguageContext";
import Select from "../../../components/common/Select";
import SlidingTabs from "../../../components/common/SlidingTabs";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import GlobalTable from "../../../components/common/GlobalTable";
import GlobalBadge from "../../../components/common/GlobalBadge";

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

  const getCleanLabel = (key, fallback) => {
    const raw = t(key);
    if (!raw || raw === key || raw.toLowerCase().includes("filter") || raw.toLowerCase().includes("vifilter")) {
      return fallback;
    }
    return raw;
  };

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
      header: t("vlColFlat") || "Flat",
      hiddenMobile: true,
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "0.85rem" }}>
          {v.flat}
        </span>
      ),
    },
    {
      key: "purpose",
      header: t("vlColPurpose") || "Purpose",
      hiddenMobile: true,
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          {v.purpose}
        </span>
      ),
    },
    {
      key: "date",
      header: t("vlColDate") || "Date",
      hiddenMobile: true,
      render: (v) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
          {v.date}
        </span>
      ),
    },
    {
      key: "intime",
      header: t("vlColIn") || "In Time",
      render: (v) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: "0.82rem", fontWeight: 600 }}>
          <MdAccessTime size={13} /> {v.intime}
        </span>
      ),
    },
    {
      key: "outtime",
      header: t("vlColOut") || "Out Time",
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
      key: "status",
      header: t("billStatusCol") || "Status",
      render: (v) => (
        <GlobalBadge
          variant={v.status === "IN" ? "success" : "neutral"}
          dot
        >
          {v.status === "IN" ? t("vlIn") || "IN" : t("vlOut") || "OUT"}
        </GlobalBadge>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ── Page Header: Unified Single Row with Sliding Tabs, Unit Filters & Search ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdOutlineInbox size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em" }}>
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
        />
      </div>
    </div>
  );
}