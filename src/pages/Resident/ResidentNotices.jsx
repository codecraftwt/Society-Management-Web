import { useEffect, useState, useCallback, useMemo, useRef} from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import {
  MdRefresh, MdChevronLeft, MdChevronRight,
  MdCampaign, MdAccessTime, MdAttachFile, MdOpenInNew, MdClose,
  MdCheckCircle, MdWarning, MdDoneAll
} from "react-icons/md";
import PdfViewer from "../../components/common/PdfViewer";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalButton from "../../components/common/GlobalButton";
import { useCustomAlert } from "../../context/CustomAlertContext";

import Pagination from "../../components/common/Pagination";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}



function timeAgoRaw(date) {
  if (!date) return null;
  const diffSec = Math.floor((new Date() - new Date(date)) / 1000);
  if (diffSec < 60) return { key: "timeJustNow" };
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { key: "timeMinutesAgo", val: diffMin };
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return { key: "timeHoursAgo", val: diffHours };
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return { key: "timeDaysAgo", val: diffDays };
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return { key: "timeWeeksAgo", val: diffWeeks };
  const diffMonths = Math.floor(diffDays / 30);
  return { key: "timeMonthsAgo", val: diffMonths };
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ResidentNotices() {
  const { t } = useLang();

  const [notices, setNotices] = useState([]);
  const [totalAll, setTotalAll] = useState(0);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const limitRef = useRef(limit);
  limitRef.current = limit;
const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [lightbox, setLightbox] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Acknowledgement prompt guard modal state
  const [showLeaveGuardModal, setShowLeaveGuardModal] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);

  const timeAgo = (date) => {
    const r = timeAgoRaw(date);
    if (!r) return "";
    if (r.key === "timeJustNow") return t("timeJustNow") || "Just now";
    return `${r.val} ${t(r.key) || "ago"}`;
  };

  const loadNotices = useCallback(async (pageNum, currentSearch, isInitial = false) => {
    if (isInitial) setInitialLoad(true);
    else setFetching(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        limit: limitRef.current,
        ...(currentSearch ? { search: currentSearch } : {}),
      });
      const res = await API.get(`/notices?${params}`);
      setNotices(res.data.data || []);
      setTotalAll(res.data.totalAll ?? res.data.pagination?.totalItems ?? 0);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setTotalItems(res.data.pagination?.totalItems ?? 0);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load notices", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadNotices(1, "", true); }, [loadNotices]);
  useEffect(() => {
    if (initialLoad) return;
    loadNotices(1, debouncedSearch);
  }, [debouncedSearch, initialLoad, loadNotices]);

  useEffect(() => {
    const onNoticeCreated = (notice) => {
      setNotices((prev) => {
        if (prev.find((n) => n.id === notice.id)) return prev;
        return [notice, ...prev];
      });
      setTotalAll((c) => c + 1);
      setTotalItems((c) => c + 1);
    };

    const onNoticeAcknowledged = (data) => {
      if (!data?.notice_id) return;
      const targetId = Number(data.notice_id);
      setNotices((prev) =>
        prev.map((item) =>
          Number(item.id) === targetId
            ? {
                ...item,
                acknowledgement_status: "ACKNOWLEDGED",
                acknowledged_at: data.acknowledged_at || new Date().toISOString(),
              }
            : item
        )
      );
      setSelectedNotice((prev) =>
        prev && Number(prev.id) === targetId
          ? {
              ...prev,
              acknowledgement_status: "ACKNOWLEDGED",
              acknowledged_at: data.acknowledged_at || new Date().toISOString(),
            }
          : prev
      );
      setShowLeaveGuardModal(false);
    };

    socket.on("notice_created", onNoticeCreated);
    socket.on("notice_acknowledged", onNoticeAcknowledged);
    return () => {
      socket.off("notice_created", onNoticeCreated);
      socket.off("notice_acknowledged", onNoticeAcknowledged);
    };
  }, []);

  const handlePageChange = (newPage) => loadNotices(newPage, debouncedSearch);

  // Open Notice Detail Modal and Record View
  const handleOpenNotice = async (n) => {
    setSelectedNotice(n);
    try {
      const res = await API.post(`/notices/${n.id}/view`);
      if (res.data?.acknowledgement_status) {
        setNotices((prev) =>
          prev.map((item) =>
            item.id === n.id
              ? {
                  ...item,
                  acknowledgement_status: res.data.acknowledgement_status,
                  viewed_at: res.data.viewed_at,
                  acknowledged_at: res.data.acknowledged_at,
                }
              : item
          )
        );
        setSelectedNotice((prev) =>
          prev && prev.id === n.id
            ? {
                ...prev,
                acknowledgement_status: res.data.acknowledgement_status,
                viewed_at: res.data.viewed_at,
                acknowledged_at: res.data.acknowledged_at,
              }
            : prev
        );
      }
    } catch (err) {
      console.error("Record view failed", err);
    }
  };

  // Explicitly Acknowledge Notice
  const handleAcknowledgeNotice = async (noticeId) => {
    try {
      setAckLoading(true);
      const res = await API.post(`/notices/${noticeId}/acknowledge`);
      if (res.data?.success) {
        setNotices((prev) =>
          prev.map((item) =>
            item.id === noticeId
              ? {
                  ...item,
                  acknowledgement_status: "ACKNOWLEDGED",
                  acknowledged_at: res.data.acknowledged_at,
                }
              : item
          )
        );
        setSelectedNotice((prev) =>
          prev && prev.id === noticeId
            ? {
                ...prev,
                acknowledgement_status: "ACKNOWLEDGED",
                acknowledged_at: res.data.acknowledged_at,
              }
            : prev
        );
        setShowLeaveGuardModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || t("noticeAckError"));
    } finally {
      setAckLoading(false);
    }
  };

  // Attempt Close Notice Detail Modal
  const handleAttemptClose = () => {
    if (
      selectedNotice &&
      selectedNotice.acknowledgement_required &&
      selectedNotice.acknowledgement_status !== "ACKNOWLEDGED"
    ) {
      setShowLeaveGuardModal(true);
    } else {
      setSelectedNotice(null);
    }
  };

  const handleFileView = (fileUrl) => {
    if (!fileUrl) return;
    let fileName = "attachment";
    try {
      const paramMatch = fileUrl.match(/[?&]filename=([^&]+)/);
      fileName = paramMatch
        ? decodeURIComponent(paramMatch[1])
        : decodeURIComponent(fileUrl.split("?")[0].split("/").pop()) || "attachment";
    } catch (_) {
      fileName = fileUrl.split("?")[0].split("/").pop() || "attachment";
    }

    const isPdf = fileName.toLowerCase().endsWith(".pdf") || fileUrl.toLowerCase().includes(".pdf?");
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(fileName);
    const rawPath = fileUrl.split("?")[0];
    const fullUrl = rawPath.startsWith("http") ? rawPath : `${API.defaults.baseURL.replace("/api", "")}${rawPath}`;

    if (isImage) {
      setLightbox(fullUrl);
      return;
    }

    setFilePreview({ fullUrl, name: fileName, isPdf });
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="ge-er-left">
            <div className="ad-page-icon">
              <MdCampaign size={22} />
            </div>
            <div>
              <h2 className="page-title">{t("noticesTitle") || "Society Notices"}</h2>
              <p className="page-subtitle">
                {initialLoad ? "—" : t("noticeCountSub", { count: totalAll })}
              </p>
            </div>
        </div>

        {/* Search */}
        <ExpandableSearch
          placeholder={t("noticesSearch") || "Search notices..."}
          value={search}
          onChange={setSearch}
        />
      </div>

      {/* ── CARDS GRID VIEW ── */}
      {fetching || initialLoad ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-card p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="h-4 w-3/4 bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
              <div className="h-12 w-full bg-white/5 rounded mt-3" />
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-card rounded-2xl border border-white/5 p-12 text-center space-y-3">
          <MdCampaign size={36} className="mx-auto text-secondary opacity-40" />
          <p className="font-semibold text-sm">{t("noticesEmpty") || "No notices available right now."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notices.map((n) => {
              const isAckReq = Boolean(n.acknowledgement_required);
              const isAcked = n.acknowledgement_status === "ACKNOWLEDGED";

              return (
                <div
                  key={n.id}
                  onClick={() => handleOpenNotice(n)}
                  className="bg-card rounded-2xl border border-white/10 p-5 flex flex-col justify-between gap-4 cursor-pointer hover:border-blue-500/40 hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <MdCampaign size={20} className="text-accent" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isAckReq && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isAcked
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                            }`}
                          >
                            {isAcked ? `✓ ${t("noticeBadgeAcked")}` : t("noticeBadgeReq")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                        {n.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-secondary">
                        <MdAccessTime size={12} />
                        <span>{timeAgo(n.created_at)}</span>
                        <span>·</span>
                        <span>{formatDate(n.created_at)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-secondary line-clamp-3 leading-relaxed">
                      {n.description || "—"}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    {n.file_url ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileView(n.file_url);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-accent bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                      >
                        <MdAttachFile size={13} /> {t("noticesViewAttachment") || "Attachment"} <MdOpenInNew size={11} />
                      </button>
                    ) : (
                      <span className="text-[11px] text-secondary/40">{t("noticeClickRead")}</span>
                    )}

                    {isAckReq && !isAcked && (
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <MdWarning size={12} /> {t("noticeActionNeeded")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} pageSize={limit} onPageSizeChange={(s) => { limitRef.current = s; setLimit(s); setPage(1); handlePageChange(1); }} />
        </div>
      )}

      {/* ── NOTICE DETAIL MODAL ── */}
      {selectedNotice && (
        <GlobalModal
          isOpen={!!selectedNotice}
          onClose={handleAttemptClose}
          title={selectedNotice.title}
          subtitle={t("noticePublishedOn", { date: formatDate(selectedNotice.created_at) })}
          icon={MdCampaign}
          size="lg"
          style={{ maxWidth: 660 }}
          bodyStyle={{ padding: "20px 24px" }}
        >
          <div className="space-y-4">
            {/* Acknowledgement Status Header Banner */}
            {selectedNotice.acknowledgement_required && (
              selectedNotice.acknowledgement_status === "ACKNOWLEDGED" ? (
                <div
                  className="p-3.5 px-4 rounded-xl flex items-center gap-3"
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "#059669",
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MdDoneAll size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                      {t("noticeAckDoneTitle", "Notice Acknowledged")}
                    </span>
                    <span className="text-[11px] text-secondary block mt-0.5">
                      {selectedNotice.acknowledged_at
                        ? t("noticeAckOnDate", { date: formatDate(selectedNotice.acknowledged_at) })
                        : "You confirmed receipt of this notice"}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="p-3.5 px-4 rounded-xl flex items-center justify-between gap-3"
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.28)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(245, 158, 11, 0.15)",
                        color: "#d97706",
                      }}
                    >
                      <MdWarning size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block text-amber-700 dark:text-amber-400">
                        {t("noticeAckReqTitle", "Acknowledgement Required")}
                      </span>
                      <span className="text-[11px] text-secondary block mt-0.5">
                        {t("noticeAckReadHint", "Please read carefully and click 'Mark as Read' below to confirm.")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={ackLoading}
                    onClick={() => handleAcknowledgeNotice(selectedNotice.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                    style={{
                      background: "linear-gradient(135deg, var(--accent, #6366f1) 0%, #4f46e5 100%)",
                      boxShadow: "0 3px 10px rgba(99, 102, 241, 0.3)",
                    }}
                  >
                    <MdCheckCircle size={14} />
                    <span>{ackLoading ? "..." : (t("noticeMarkAsRead") || "Mark as Read")}</span>
                  </button>
                </div>
              )
            )}

            {/* Notice Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-secondary uppercase tracking-wider px-1">
                <span>{t("noticeDetailsTitle", "Notice Details")}</span>
                <span className="text-[11px] font-semibold text-secondary lowercase">
                  {timeAgo(selectedNotice.created_at)}
                </span>
              </div>

              <div
                className="p-4 sm:p-5 rounded-2xl border"
                style={{
                  background: "var(--card-inner-bg, rgba(0,0,0,0.02))",
                  borderColor: "var(--divider, rgba(99, 102, 241, 0.12))",
                }}
              >
                <p className="text-sm leading-relaxed text-primary font-normal whitespace-pre-line m-0 select-text">
                  {selectedNotice.description}
                </p>
              </div>
            </div>

            {/* Attachment Section */}
            {selectedNotice.file_url && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block px-1">
                  {t("noticeAttachmentTitle", "Attachment")}
                </span>
                <div
                  className="flex items-center justify-between gap-3 p-3 px-4 rounded-xl border transition-colors hover:border-accent/40"
                  style={{
                    background: "var(--card-inner-bg, rgba(0,0,0,0.02))",
                    borderColor: "var(--divider, rgba(99, 102, 241, 0.15))",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(99, 102, 241, 0.12)",
                        color: "var(--accent, #6366f1)",
                      }}
                    >
                      <MdAttachFile size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-primary block truncate">
                        {selectedNotice.file_name || "Official Circular / Document"}
                      </span>
                      <span className="text-[11px] text-secondary block mt-0.5">
                        Attached document file
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFileView(selectedNotice.file_url)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-accent hover:bg-accent/10 transition-colors shrink-0 cursor-pointer"
                    style={{ border: "1px solid rgba(99, 102, 241, 0.25)" }}
                  >
                    <span>{t("noticeViewFile", "View Document")}</span>
                    <MdOpenInNew size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-3 border-t border-divider flex items-center justify-between gap-3">
              <div className="text-[11px] text-secondary">
                {selectedNotice.acknowledgement_status === "ACKNOWLEDGED" ? (
                  <span className="text-emerald-500 font-semibold inline-flex items-center gap-1">
                    <MdCheckCircle size={14} /> Confirmed
                  </span>
                ) : (
                  <span>Official Society Notice</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedNotice.acknowledgement_required && selectedNotice.acknowledgement_status !== "ACKNOWLEDGED" && (
                  <GlobalButton
                    variant="primary"
                    icon={MdCheckCircle}
                    onClick={() => handleAcknowledgeNotice(selectedNotice.id)}
                    loading={ackLoading}
                  >
                    {t("noticeMarkAsRead") || "Mark as Read"}
                  </GlobalButton>
                )}
                <GlobalButton variant="secondary" onClick={handleAttemptClose}>
                  {t("close", "Close")}
                </GlobalButton>
              </div>
            </div>
          </div>
        </GlobalModal>
      )}

      {/* ── ACKNOWLEDGEMENT LEAVE GUARD PROMPT MODAL ── */}
      {showLeaveGuardModal && (
        <GlobalModal
          isOpen={showLeaveGuardModal}
          onClose={() => setShowLeaveGuardModal(false)}
          title={t("noticeLeavePromptTitle") || "Acknowledgement Required"}
          subtitle={t("noticeLeavePromptMsg") || "Please mark this notice as read before leaving."}
          icon={MdWarning}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-secondary leading-relaxed">
              {t("noticeLeavePromptBody")}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <GlobalButton
                variant="secondary"
                onClick={() => setShowLeaveGuardModal(false)}
              >
                {t("noticeStayBtn") || "Stay on Notice"}
              </GlobalButton>
              <GlobalButton
                variant="primary"
                icon={MdCheckCircle}
                onClick={() => handleAcknowledgeNotice(selectedNotice.id)}
                loading={ackLoading}
              >
                {t("noticeMarkAsRead") || "Mark as Read"}
              </GlobalButton>
            </div>
          </div>
        </GlobalModal>
      )}

      {/* ── FILE PREVIEW MODAL ── */}
      {filePreview && (
        <GlobalModal
          isOpen={true}
          onClose={() => setFilePreview(null)}
          title={filePreview.name}
          size="lg"
        >
          {filePreview.isPdf ? (
            <PdfViewer url={filePreview.fullUrl} fileName={filePreview.name} />
          ) : (
            <img src={filePreview.fullUrl} alt={filePreview.name} className="w-full rounded-xl" />
          )}
        </GlobalModal>
      )}

      {/* ── LIGHTBOX ── */}
      {lightbox && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Preview" className="max-w-full max-h-[90vh] rounded-xl" />
        </div>,
        document.body
      )}
    </div>
  );
}