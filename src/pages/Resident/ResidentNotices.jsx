
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import socket from "../../services/socket";
import { useLang } from "../../context/LanguageContext";
import {
  MdCampaign, MdAttachFile, MdAccessTime,
  MdOutlineInbox, MdSearch, MdClose, MdOpenInNew,
  MdChevronLeft, MdChevronRight,
} from "react-icons/md";

import { BASE_URL } from "../../config/apiConfig";

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Spinner({ small = false }) {
  const s = small ? 13 : 20;
  return (
    <svg style={{ width: s, height: s }} className="animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
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
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`pagination-page ${p === page ? "pagination-page--active" : ""}`}
          >
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

const LIMIT = 10;

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const timeAgoRaw = (date) => {
  if (!date) return "";
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return { key: "timeJustNow",  val: 0 };
  if (diff < 3600)  return { key: "timeMinsAgo",  val: Math.floor(diff / 60) };
  if (diff < 86400) return { key: "timeHoursAgo", val: Math.floor(diff / 3600) };
  return { key: "timeDaysAgo", val: Math.floor(diff / 86400) };
};

/* ── File helpers ── */

const isImageFile = (fileName) =>
  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName || "");

const isPublicHost = () => {
  const h = window.location.hostname;
  return (
    h !== "localhost" &&
    !h.startsWith("127.") &&
    !h.startsWith("192.168.") &&
    !h.startsWith("10.")
  );
};

const getPreviewUrl = (url, name) => {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return url;
  if (["doc", "docx", "ppt", "pptx", "csv"].includes(ext)) {
    if (!isPublicHost()) return null;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  if (["xls", "xlsx"].includes(ext)) {
    if (!isPublicHost()) return null;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }
  return null;
};

export default function ResidentNotices() {
  const { t } = useLang();

  const [notices, setNotices] = useState([]);
  const [totalAll, setTotalAll] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [lightbox, setLightbox] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const timeAgo = (date) => {
    const r = timeAgoRaw(date);
    if (!r) return "";
    if (r.key === "timeJustNow") return t("timeJustNow");
    return `${r.val} ${t(r.key)}`;
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
      setTotalAll(res.data.totalAll ?? res.data.pagination.totalItems);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load notices", err);
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, []);

  useEffect(() => { loadNotices(1, "", true); }, []);
  useEffect(() => {
    if (initialLoad) return;
    loadNotices(1, debouncedSearch);
  }, [debouncedSearch]);

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

 const handleFileView = (fileUrl) => {
  if (!fileUrl) return;

  // 1. Recover the original human-readable filename
  //    Priority: ?filename= query param  →  last path segment
  let fileName = "attachment";
  try {
    const paramMatch = fileUrl.match(/[?&]filename=([^&]+)/);
    fileName = paramMatch
      ? decodeURIComponent(paramMatch[1])
      : decodeURIComponent(fileUrl.split("?")[0].split("/").pop()) || "attachment";
  } catch (_) {
    fileName = fileUrl.split("?")[0].split("/").pop() || "attachment";
  }

  // 2. Build a clean URL — strip ALL query params for the actual src/href.
  //    Cloudinary URLs are already absolute → use as-is.
  //    Legacy local paths (/uploads/...) → prepend BASE_URL.
  const rawPath = fileUrl.split("?")[0];
  const fullUrl =
    rawPath.startsWith("http://") || rawPath.startsWith("https://")
      ? rawPath                      // ✅ Cloudinary absolute URL, no prefix
      : `${BASE_URL}${rawPath}`;     // ✅ legacy local path

  // 3. Route to the right viewer
  if (isImageFile(fileName)) {
    setLightbox(fullUrl);
    return;
  }

  setFilePreview({
    fullUrl,
    name: fileName,
    previewUrl: getPreviewUrl(fullUrl, fileName),
  });
};
  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ✅ FULL UI REMAINS EXACTLY SAME AS YOUR ORIGINAL */}

            {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.25)" }}
          >
            <MdCampaign size={21} className="text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("noticesTitle")}</h2>
            <p className="text-secondary text-xs mt-0.5">
              {initialLoad ? "—" : totalAll} {t("noticesSubtitle")}
            </p>
          </div>
        </div>

        {!initialLoad && totalAll > 0 && (
          <div className="relative">
            <MdSearch
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
            />
            <input
              key="notices-search-input"
              className="input h-9 pl-8 pr-8 text-xs w-full sm:w-56"
              placeholder={t("noticesSearch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {fetching ? (
                <Spinner small />
              ) : search ? (
                <button onClick={() => setSearch("")} className="text-secondary transition-colors">
                  <MdClose size={13} />
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* STATES */}
      {initialLoad ? (
        <div className="bg-card p-12 flex flex-col items-center gap-3 text-secondary">
          <Spinner />
          <p className="text-sm">{t("noticesLoading")}</p>
        </div>

      ) : totalAll === 0 ? (
        <div className="bg-card p-16 flex flex-col items-center gap-3 text-secondary animate-fadeIn">
          <MdOutlineInbox size={48} className="opacity-25" />
          <p className="text-sm">{t("noticesEmpty")}</p>
        </div>

      ) : notices.length === 0 ? (
        <div className="bg-card p-14 flex flex-col items-center gap-2 text-secondary animate-fadeIn">
          <MdSearch size={36} className="opacity-25" />
          <p className="text-sm">{t("noticesNoMatch")}</p>
          <button onClick={() => setSearch("")} className="text-xs text-accent hover:underline mt-1">
            {t("noticesClearSearch")}
          </button>
        </div>

      ) : (
        <div className="bg-card p-4 sm:p-5">
          <p className="text-xs text-secondary mb-4">
            {totalItems} {t("noticesCount")}
            {search && ` ${t("noticesMatching")} "${search}"`}
          </p>

          {/* ── MOBILE CARDS ── */}
          <div className="md:hidden space-y-3">
            {notices.map((n, i) => {
              const isExpanded = expanded === n.id;
              return (
                <div
                  key={n.id}
                  className="rounded-xl overflow-hidden animate-fadeIn transition-colors duration-200"
                  style={{
                    background: "var(--card-inner-bg)",
                    border: "1px solid var(--card-inner-border)",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : n.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.22)" }}
                    >
                      <MdCampaign size={16} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug">{n.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-secondary flex-wrap">
                        <MdAccessTime size={11} />
                        <span>{timeAgo(n.created_at)}</span>
                        <span className="opacity-20">·</span>
                        <span>{formatDate(n.created_at)}</span>
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-secondary shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div
                      className="px-4 pb-4 space-y-3 pt-3 animate-fadeIn"
                      style={{ borderTop: "1px solid var(--card-inner-border)" }}
                    >
                      {n.description && (
                        <p className="text-xs text-secondary leading-relaxed">{n.description}</p>
                      )}
                      {n.file_url && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFileView(n.file_url); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
                          style={{
                            background: "rgba(91,141,239,0.10)",
                            border: "1px solid rgba(91,141,239,0.22)",
                            color: "#94B5F5",
                          }}
                        >
                          <MdAttachFile size={13} /> {t("noticesViewAttachment")} <MdOpenInNew size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>

          {/* ── DESKTOP TABLE ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-secondary border-b border-white/10">
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left w-1/4">{t("noticesColTitle")}</th>
                  <th className="p-3 text-left">{t("noticesColDesc")}</th>
                  <th className="p-3 text-left w-28">{t("noticesColAttachment")}</th>
                  <th className="p-3 text-left w-44">{t("noticesColDate")}</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n, i) => (
                  <tr
                    key={n.id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors duration-150 animate-fadeIn"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <td className="p-3 text-secondary text-xs">
                      {(page - 1) * LIMIT + i + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(91,141,239,0.12)", border: "1px solid rgba(91,141,239,0.22)" }}
                        >
                          <MdCampaign size={13} className="text-accent" />
                        </div>
                        <span className="font-medium">{n.title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-secondary text-xs max-w-xs">
                      <span className="line-clamp-2 leading-relaxed">{n.description || "—"}</span>
                    </td>
                    <td className="p-3">
                      {n.file_url ? (
                        <button
                          onClick={() => handleFileView(n.file_url)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-all duration-200"
                          style={{
                            background: "rgba(91,141,239,0.10)",
                            border: "1px solid rgba(91,141,239,0.22)",
                            color: "#94B5F5",
                          }}
                        >
                          <MdAttachFile size={12} /> {t("noticesView")}
                        </button>
                      ) : (
                        <span className="text-secondary/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="text-xs text-secondary/70">{timeAgo(n.created_at)}</p>
                      <p className="text-[10px] text-secondary/40 mt-0.5">{formatDate(n.created_at)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col gap-2 mt-3">
              <p className="text-xs text-secondary text-right">
                {t("billShowing") || "Showing"} {notices.length} {t("billOf") || "of"} {totalItems} {t("noticesCount")}
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        </div>
      )}

      {/* ══ IMAGE LIGHTBOX ══ */}
      {lightbox && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ width: "100%", maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={() => setLightbox(null)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                  border: "none", cursor: "pointer", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdClose size={17} />
              </button>
            </div>
            <img src={lightbox} alt="attachment"
              style={{ width: "100%", borderRadius: 12, objectFit: "contain", maxHeight: "75vh", display: "block" }} />
            <p style={{ textAlign: "center", fontSize: 11, marginTop: 10, color: "rgba(255,255,255,0.3)" }}>
              {t("chatTapClose") || "Tap outside to close"}
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* ══ FILE PREVIEW MODAL (PDF / Doc / Sheet) ══ */}
      {filePreview && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setFilePreview(null)}
        >
          <div
            style={{ width: "100%", maxWidth: 860, height: "82vh", display: "flex", flexDirection: "column", gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "white", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                📄 {filePreview.name}
              </span>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a
                  href={filePreview.fullUrl} target="_blank" rel="noopener noreferrer" 
                  style={{ padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    color: "white", background: "rgba(255,255,255,0.12)", textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 5 }}
                >
                  ↓ {t("docDownload") || "Download"}
                </a>
                <button onClick={() => setFilePreview(null)}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)",
                    border: "none", cursor: "pointer", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MdClose size={17} />
                </button>
              </div>
            </div>

            {filePreview.previewUrl ? (
              <iframe
                key={filePreview.previewUrl}
                src={filePreview.previewUrl}
                title={filePreview.name}
                style={{ flex: 1, border: "none", borderRadius: 12, background: "white", width: "100%" }}
              />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 14, background: "rgba(255,255,255,0.04)",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 48 }}>📄</span>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {filePreview.name}
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0, textAlign: "center", maxWidth: 320 }}>
                  {isPublicHost()
                    ? "Preview not available for this file type."
                    : "In-browser preview requires a deployed (public) URL. Download the file to open it."}
                </p>
                <a
                 a href={filePreview.fullUrl} target="_blank" rel="noopener noreferrer" 
                  style={{ padding: "8px 20px", borderRadius: 999, background: "var(--accent)",
                    color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 6 }}
                >
                  ↓ Download file
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}