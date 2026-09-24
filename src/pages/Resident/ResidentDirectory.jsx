import { useEffect, useState, useMemo } from "react";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import SlidingTabs from "../../components/common/SlidingTabs";
import {
  MdPeople,
  MdPhone,
  MdEmail,
  MdHome,
  MdApartment,
  MdOutlineInbox,
  MdSearch,
  MdPerson,
  MdContentCopy,
  MdCheck,
} from "react-icons/md";

/* ── Debounce Hook ── */
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Skeleton Loading ── */
function ResidentCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1.5px solid var(--glass-border)",
        borderRadius: "18px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div className="rd-skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
          <div className="rd-skeleton" style={{ width: "60%", height: 16, borderRadius: 4 }} />
          <div className="rd-skeleton" style={{ width: "40%", height: 12, borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="rd-skeleton" style={{ width: "80%", height: 12, borderRadius: 4 }} />
        <div className="rd-skeleton" style={{ width: "50%", height: 12, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function ResidentDirectory() {
  const { t } = useLang();

  const [loading, setLoading] = useState(true);
  const [neighbours, setNeighbours] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("ALL");
  const [copiedId, setCopiedId] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const fetchNeighbours = async () => {
    try {
      setLoading(true);
      const res = await API.get("/flats/neighbours");
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setNeighbours(list);
    } catch (err) {
      console.warn("Failed to fetch neighbours directory:", err);
      setNeighbours([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeighbours();
  }, []);

  /* Extract unique blocks for filter tabs */
  const blocks = useMemo(() => {
    const set = new Set();
    neighbours.forEach((n) => {
      const bName = n.Block?.name || n.block_name || n.Block?.block_name;
      if (bName) set.add(bName);
    });
    return Array.from(set).sort();
  }, [neighbours]);

  const blockTabItems = useMemo(() => {
    return [
      { id: "ALL", label: t("compTabAll") || "All Blocks", badge: neighbours.length },
      ...blocks.map((b) => ({
        id: b,
        label: b,
        badge: neighbours.filter((n) => (n.Block?.name || n.block_name || n.Block?.block_name) === b).length,
      })),
    ];
  }, [blocks, neighbours, t]);

  /* Filtered neighbours */
  const filtered = useMemo(() => {
    let list = neighbours;

    // Block filter
    if (selectedBlock !== "ALL") {
      list = list.filter((n) => (n.Block?.name || n.block_name || n.Block?.block_name) === selectedBlock);
    }

    // Search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((n) => {
        const user = n.User || {};
        const bName = n.Block?.name || n.block_name || n.Block?.block_name || "";
        const fNum = n.flat_number || "";
        const uName = user.name || "";
        const phone = user.phone || "";
        const email = user.email || "";

        return (
          uName.toLowerCase().includes(q) ||
          fNum.toLowerCase().includes(q) ||
          bName.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [neighbours, selectedBlock, debouncedSearch]);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="page-root animate-fadeIn">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="ad-page-icon">
            <MdPeople size={22} />
          </div>
          <div>
            <h2 className="page-title">{t("menuDirectory") || "Society Directory"}</h2>
            <div className="page-subtitle">
              {loading ? t("dirLoadingDirectory") : t("dirRegisteredNeighbours", { count: neighbours.length })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginTop: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="complaint-stat-card complaint-stat-total">
          <span className="complaint-stat-val">{neighbours.length}</span>
          <span className="complaint-stat-label">{t("dirTotalNeighbours")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-inprogress">
          <span className="complaint-stat-val">{blocks.length || 1}</span>
          <span className="complaint-stat-label">{t("dirSocietyBlocks")}</span>
        </div>
        <div className="complaint-stat-card complaint-stat-resolved">
          <span className="complaint-stat-val">{filtered.length}</span>
          <span className="complaint-stat-label">{t("dirActiveMatches")}</span>
        </div>
      </div>

      {/* Filter Tabs & Expandable Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Left: Block Tabs */}
        {blockTabItems.length > 1 && (
          <div className="overflow-x-auto max-w-full pb-0.5" style={{ scrollbarWidth: "none" }}>
            <SlidingTabs
              items={blockTabItems}
              value={selectedBlock}
              onChange={setSelectedBlock}
            />
          </div>
        )}

        {/* Right: Expandable Search */}
        <div className="flex items-center gap-2.5 ml-auto">
          <ExpandableSearch
            placeholder={t("dirSearch")}
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {[...Array(6)].map((_, i) => (
            <ResidentCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <MdOutlineInbox size={48} className="empty-state__icon" />
          <h3 className="empty-state__title">{t("dirEmptyTitle")}</h3>
          <p className="empty-state__desc">
            {search || selectedBlock !== "ALL"
              ? t("dirEmptyFilter")
              : t("dirEmptyRegistered")}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {filtered.map((item) => {
            const user = item.User || {};
            const blockName = item.Block?.name || item.block_name || item.Block?.block_name || t("dirBlock");
            const flatNum = item.flat_number || "—";
            const initial = (user.name || "R").charAt(0).toUpperCase();
            const copyPhoneId = `phone-${item.id}`;
            const copyEmailId = `email-${item.id}`;

            return (
              <div
                key={item.id}
                style={{
                  background: "var(--card-bg)",
                  border: "1.5px solid var(--glass-border)",
                  borderRadius: "20px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                className="hover-card-elevation"
              >
                {/* Top Info */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: "700",
                      flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
                    }}
                  >
                    {initial}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <h4
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.name || t("dirResidentFallback")}
                      </h4>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          backgroundColor: "var(--card-inner-bg)",
                          color: "var(--accent)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        {item.flat_type || "Flat"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MdHome size={14} /> Flat {flatNum}
                      </span>
                      <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>•</span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MdApartment size={14} /> {blockName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Links & Badges */}
                <div
                  style={{
                    borderTop: "1px solid var(--glass-border)",
                    paddingTop: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {user.phone && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <a
                        href={`tel:${user.phone}`}
                        style={{
                          fontSize: "12px",
                          color: "var(--text-primary)",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: 500,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: "var(--stat-green-bg)",
                            color: "var(--stat-green-color)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MdPhone size={14} />
                        </div>
                        {user.phone}
                      </a>
                      <button
                        onClick={() => handleCopy(user.phone, copyPhoneId)}
                        title={t("dirCopyPhone")}
                        style={{
                          background: "none",
                          border: "none",
                          color: copiedId === copyPhoneId ? "var(--stat-green-color)" : "var(--text-tertiary)",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {copiedId === copyPhoneId ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
                      </button>
                    </div>
                  )}

                  {user.email && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <a
                        href={`mailto:${user.email}`}
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: "var(--card-inner-bg)",
                            color: "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MdEmail size={14} />
                        </div>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.email}
                        </span>
                      </a>
                      <button
                        onClick={() => handleCopy(user.email, copyEmailId)}
                        title={t("dirCopyEmail")}
                        style={{
                          background: "none",
                          border: "none",
                          color: copiedId === copyEmailId ? "var(--stat-green-color)" : "var(--text-tertiary)",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {copiedId === copyEmailId ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
