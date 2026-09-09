import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import {
  MdSearch, MdRefresh, MdChevronLeft, MdChevronRight,
  MdCampaign, MdAccessTime, MdAttachFile, MdOpenInNew, MdClose,
  MdCheckCircle, MdWarning, MdDoneAll
} from "react-icons/md";
import PdfViewer from "../../components/common/PdfViewer";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalButton from "../../components/common/GlobalButton";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const LIMIT = 10;

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

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pagination-wrap">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="pagination-btn">
        <MdChevronLeft size={15} /> Prev
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`e-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}>
            {p}
          </button>
        )
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="pagination-btn">
        Next <MdChevronRight size={15} />
      </button>
    </div>
  );
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
        limit: LIMIT,
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
    socket.on("notice_created", onNoticeCreated);
    return () => socket.off("notice_created", onNoticeCreated);
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
      alert(err.response?.data?.message || "Failed to acknowledge notice");
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {t("noticesTitle") || "Society Notices"}
          </h2>
          <p className="text-xs text-secondary mt-1">
            {initialLoad ? "—" : `${totalAll} notices published for your society`}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <input
            type="text"
            placeholder={t("noticesSearch") || "Search notices..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-10 pr-4 h-10 text-xs rounded-xl"
          />
        </div>
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
                            {isAcked ? "✓ ACKNOWLEDGED" : "ACK REQUIRED"}
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
                      <span className="text-[11px] text-secondary/40">Click to read details</span>
                    )}

                    {isAckReq && !isAcked && (
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <MdWarning size={12} /> Action Needed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      {/* ── NOTICE DETAIL MODAL ── */}
      {selectedNotice && (
        <GlobalModal
          isOpen={!!selectedNotice}
          onClose={handleAttemptClose}
          title={selectedNotice.title}
          subtitle={`Published ${formatDate(selectedNotice.created_at)}`}
          icon={MdCampaign}
          size="md"
        >
          <div className="space-y-5">
            {/* Acknowledgement Status Header Banner */}
            {selectedNotice.acknowledgement_required && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  selectedNotice.acknowledgement_status === "ACKNOWLEDGED"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {selectedNotice.acknowledgement_status === "ACKNOWLEDGED" ? (
                    <MdDoneAll size={20} />
                  ) : (
                    <MdWarning size={20} />
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {selectedNotice.acknowledgement_status === "ACKNOWLEDGED"
                        ? "Notice Acknowledged"
                        : "Acknowledgement Required"}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {selectedNotice.acknowledgement_status === "ACKNOWLEDGED"
                        ? `Acknowledged on ${fmtDate(selectedNotice.acknowledged_at)}`
                        : "Please read carefully and click 'Mark as Read' below to confirm."}
                    </p>
                  </div>
                </div>

                {selectedNotice.acknowledgement_status !== "ACKNOWLEDGED" && (
                  <GlobalButton
                    variant="primary"
                    size="sm"
                    icon={MdCheckCircle}
                    onClick={() => handleAcknowledgeNotice(selectedNotice.id)}
                    loading={ackLoading}
                  >
                    {t("noticeMarkAsRead") || "Mark as Read"}
                  </GlobalButton>
                )}
              </div>
            )}

            {/* Notice Body */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Notice Details</h4>
              <p className="text-sm text-primary leading-relaxed whitespace-pre-line bg-white/5 p-4 rounded-xl border border-white/5">
                {selectedNotice.description}
              </p>
            </div>

            {/* Attachment Section */}
            {selectedNotice.file_url && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Attachment</h4>
                <button
                  type="button"
                  onClick={() => handleFileView(selectedNotice.file_url)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-accent hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <MdAttachFile size={18} />
                    <span className="text-xs font-semibold">View Notice Document / File</span>
                  </div>
                  <MdOpenInNew size={16} />
                </button>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              {selectedNotice.acknowledgement_required && selectedNotice.acknowledgement_status !== "ACKNOWLEDGED" ? (
                <GlobalButton
                  variant="primary"
                  icon={MdCheckCircle}
                  onClick={() => handleAcknowledgeNotice(selectedNotice.id)}
                  loading={ackLoading}
                >
                  {t("noticeMarkAsRead") || "Mark as Read"}
                </GlobalButton>
              ) : (
                <GlobalButton variant="secondary" onClick={() => setSelectedNotice(null)}>
                  Close
                </GlobalButton>
              )}
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
              This notice requires explicit read confirmation. You must acknowledge this notice before closing or navigating away.
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