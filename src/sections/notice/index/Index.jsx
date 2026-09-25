import { useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useLang } from "../../../context/LanguageContext";
import {
  MdAdd,
  MdAttachFile,
  MdSchedule,
  MdCampaign,
  MdOutlineOpenInNew,
  MdEdit,
  MdDelete,
  MdOutlineArticle,
} from "react-icons/md";

import Select from "../../../components/common/Select";
import ExpandableSearch from "../../../components/common/ExpandableSearch";
import GlobalButton from "../../../components/common/GlobalButton";
import Pagination from "../../../components/common/Pagination";
import { isCommitteeMember, hasPermission } from "../../../utils/permissions";

export default function Index({
  isSuperAdmin,
  filterSocietyId,
  societiesList,
  notices,
  displayedNotices,
  initialLoad,
  fetching,
  totalAll,
  totalItems,
  totalPages,
  page,
  limit,
  search,
  fmtDate,
  onSearchChange,
  onFilterSociety,
  onCreate,
  onEdit,
  onDelete,
  onViewHistory,
  onViewFile,
  onReadMore,
  onPageChange,
  onPageSizeChange,
}) {
  const { t } = useLang();
  const { user } = useContext(AuthContext);

  const canPost = hasPermission(user, "notice", "create") || hasPermission(user, "notice", "view");

  return (
    <>
      {/* ── HEADER & TOOLBAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title Block */}
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              flexShrink: 0,
              background: "linear-gradient(135deg, rgba(160,90,255,0.18), rgba(160,90,255,0.1))",
              border: "1.5px solid rgba(160,90,255,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(160,90,255,0.18)",
            }}
          >
            <MdCampaign size={22} style={{ color: "var(--accent, #3b82f6)" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              {t("noticeBoard") || "Notice Board"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
              {initialLoad ? "—" : `${totalAll} notices published`}
            </p>
            <p style={{ fontSize: 11, color: "var(--accent, #3b82f6)", fontWeight: 600, margin: "4px 0 0", letterSpacing: "0.02em" }}>
              New Notice Section
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Expandable Search */}
          <ExpandableSearch
            value={search}
            onChange={(val) => {
              onSearchChange(val);
            }}
            placeholder={t("noticeSearch")}
          />

          {/* Super Admin Society Filter */}
          {isSuperAdmin && (
            <Select
              className="input"
              value={filterSocietyId}
              onChange={(e) => {
                onFilterSociety(e.target.value);
              }}
              style={{ height: 40, fontSize: 13, minWidth: 190, maxWidth: 220, borderRadius: "10px" }}
            >
              <option value="ALL">{t("allSocietiesGlobalView")}</option>
              {societiesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}

          {/* Publish Notice Button */}
          {canPost && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={() => {
                onCreate();
              }}
            >
              {t("noticeAddBtn") || "Publish Notice"}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* ── NOTICE CARDS GRID ── */}
      {fetching || initialLoad ? (
        /* Loading Skeleton Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                borderRadius: 16,
                border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                background: "var(--card-bg, #111827)",
                padding: 20,
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 14, width: "70%", borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ height: 10, width: "40%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
              <div style={{ height: 12, width: "90%", borderRadius: 4, background: "rgba(255,255,255,0.04)", marginTop: 8 }} />
              <div style={{ height: 12, width: "60%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
            </div>
          ))}
        </div>
      ) : displayedNotices.length === 0 ? (
        /* Empty State */
        <div
          style={{
            borderRadius: 16,
            border: "1px dashed var(--glass-border, rgba(255, 255, 255, 0.12))",
            background: "var(--card-bg, #111827)",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(160, 90, 255, 0.1)",
              color: "var(--accent, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MdCampaign size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {t("noticeEmpty") || "No notices published yet"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 380 }}>
            There are no active notices matching your filter. Publish a new notice to broadcast announcements to society residents.
          </p>
          {canPost && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              style={{ marginTop: 6 }}
              onClick={() => {
                onCreate();
              }}
            >
              {t("noticeAddBtn") || "Publish Notice"}
            </GlobalButton>
          )}
        </div>
      ) : (
        <>
          {/* Responsive Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedNotices.map((n) => {
              const socName =
                n.Society?.name ||
                societiesList.find((s) => String(s.id) === String(n.society_id))?.name;

              return (
                <div
                  key={n.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
                    background: "var(--card-bg, #111827)",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.12)",
                    transition: "all 0.2s ease-in-out",
                  }}
                  className="hover:border-blue-500/30 hover:shadow-lg"
                >
                  {/* Card Header & Content */}
                  <div>
                    {/* Top Row: Campaign Icon + Title + Meta */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: "rgba(160, 90, 255, 0.12)",
                          color: "var(--accent, #3b82f6)",
                          border: "1px solid rgba(160, 90, 255, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <MdCampaign size={22} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {n.title}
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <MdSchedule size={13} style={{ opacity: 0.7 }} />
                            <span>{fmtDate(n.created_at)}</span>
                          </div>

                          {n.created_by_name && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(59, 130, 246, 0.12)",
                                color: "#60a5fa",
                                border: "1px solid rgba(59, 130, 246, 0.25)",
                              }}
                            >
                              By: {n.created_by_name} ({n.created_by_role === "COMMITTEE_MEMBER" ? "Committee" : "Admin"})
                            </span>
                          )}

                          {socName && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(99, 102, 241, 0.12)",
                                color: "#818cf8",
                                border: "1px solid rgba(99, 102, 241, 0.25)",
                              }}
                            >
                              {socName}
                            </span>
                          )}

                          {n.acknowledgement_required && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(16, 185, 129, 0.12)",
                                color: "#10b981",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                              }}
                            >
                              ACK REQUIRED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notice Description with Read More */}
                    <div style={{ marginTop: 2 }}>
                      {n.description && n.description.length > 120 ? (
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            lineHeight: 1.55,
                            margin: 0,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {n.description.slice(0, 115)}...
                          <button
                            type="button"
                            onClick={() => onReadMore(n)}
                            style={{
                              color: "var(--accent, #a855f7)",
                              background: "none",
                              border: "none",
                              padding: 0,
                              fontWeight: 700,
                              cursor: "pointer",
                              marginLeft: 6,
                              fontSize: "0.82rem",
                              display: "inline-block",
                            }}
                          >
                            Read More →
                          </button>
                        </p>
                      ) : (
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            lineHeight: 1.55,
                            margin: 0,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {n.description}
                        </p>
                      )}
                    </div>

                    {/* Attachment badge placed ABOVE the footer action divider line */}
                    {n.file_url && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => onViewFile(n.file_url)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "var(--accent, #a855f7)",
                            background: "rgba(168, 85, 247, 0.12)",
                            border: "1px solid rgba(168, 85, 247, 0.28)",
                            padding: "4px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <MdAttachFile size={14} />
                          <span>Attachment</span>
                          <MdOutlineOpenInNew size={12} style={{ opacity: 0.8 }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Aligned Action Buttons */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingTop: 12,
                      borderTop: "1px solid var(--divider, rgba(255, 255, 255, 0.06))",
                      gap: 8,
                      marginTop: "auto",
                    }}
                  >
                    {canPost && (() => {
                      const isOwn = hasPermission(user, "notice", "edit") || hasPermission(user, "notice", "delete") || !isCommitteeMember(user) || n.created_by_user_id === user?.id || !n.created_by_user_id;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
                          {n.acknowledgement_required && (
                            <GlobalButton
                              variant="secondary"
                              size="sm"
                              icon={MdOutlineArticle}
                              onClick={() => onViewHistory(n)}
                            >
                              {t("noticeViewHistory") || "View History"}
                            </GlobalButton>
                          )}
                          {isOwn && (
                            <>
                              <GlobalButton
                                variant="edit"
                                size="sm"
                                icon={MdEdit}
                                onClick={() => onEdit(n)}
                              >
                                Edit
                              </GlobalButton>
                              <GlobalButton
                                variant="delete"
                                size="sm"
                                icon={MdDelete}
                                onClick={() => onDelete(n)}
                              />
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="notice-pagination-footer">
            <span className="notice-pagination-summary">
              {t("noticeShowingCount", { shown: notices.length, total: totalItems })}
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pageSize={limit}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </>
      )}
    </>
  );
}