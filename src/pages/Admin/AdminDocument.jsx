
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLang } from "../../context/LanguageContext";
import { useAuthContext } from "../../context/AuthContext";
import { useCustomAlert } from "../../context/CustomAlertContext";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import {
  MdDescription, MdDelete, MdClose,
  MdGavel, MdGroups, MdDirectionsCar,
  MdBarChart, MdSecurity,
  MdCheckCircle, MdWarningAmber, MdVisibility,
  MdInsertDriveFile, MdOutlineUploadFile,
  MdAdd, MdRefresh, MdCloudUpload,
} from "react-icons/md";
import API from "../../services/api";
import { BASE_URL } from "../../config/apiConfig";
import { getTitleError } from "../../utils/validators";
import Select from "../../components/common/Select";
import GlobalButton from "../../components/common/GlobalButton";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import GlobalModal from "../../components/common/GlobalModal";
import GlobalConfirmDialog from "../../components/common/GlobalConfirmDialog";
import SlidingTabs from "../../components/common/SlidingTabs";
import Pagination from "../../components/common/Pagination";

const ALL_CATS = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];
const FORM_CATS = ["Legal", "Meetings", "Guidelines", "Finance", "Security"];
const ICON_MAP = {
  Legal: MdGavel,
  Meetings: MdGroups,
  Guidelines: MdDirectionsCar,
  Finance: MdBarChart,
  Security: MdSecurity,
};
const COLOR_MAP = {
  Legal: "purple",
  Meetings: "blue",
  Guidelines: "amber",
  Finance: "red",
  Security: "green",
};

function DocCard({ doc, t, onDelete, onOpen, isCommittee, catLabel }) {
  const Icon = ICON_MAP[doc.category] || MdDescription;
  const color = COLOR_MAP[doc.category] || "blue";
  const formatDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4"
      style={{
        background: "var(--card-bg, #111827)",
        borderColor: "var(--glass-border, rgba(255, 255, 255, 0.08))",
        minHeight: 170,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.04))",
              border: "1px solid var(--glass-border)",
              color: `var(--stat-${color}-color, #818cf8)`,
            }}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-bold truncate"
              style={{ letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}
              title={doc.title}
            >
              {doc.title}
            </h3>
            <p
              className="text-xs truncate mt-0.5"
              style={{ color: "var(--text-secondary)", margin: 0 }}
              title={doc.file_name}
            >
              {doc.file_name}
            </p>
          </div>
        </div>
        <span
          className="px-2 py-1 rounded-md text-[10px] font-bold shrink-0 border"
          style={{
            background: `var(--stat-${color}-bg, rgba(255,255,255,0.05))`,
            color: `var(--stat-${color}-color, #fff)`,
            borderColor: `var(--stat-${color}-border, rgba(255,255,255,0.1))`,
          }}
        >
          {catLabel(doc.category)}
        </span>
      </div>

      <div
        className="flex items-center gap-3 text-[11px] font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        <span className="flex items-center gap-1.5">
          <MdInsertDriveFile size={12} /> {doc.file_size_formatted || "—"}
        </span>
        <span>•</span>
        <span>{formatDate(doc.created_at)}</span>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onOpen(doc)}
          className="flex-1 h-9 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all"
          style={{
            background: "var(--card-inner-bg)",
            borderColor: "var(--glass-border)",
            color: "var(--text-primary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.08))";
            e.currentTarget.style.borderColor = "var(--accent-light, #818cf8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--card-inner-bg)";
            e.currentTarget.style.borderColor = "var(--glass-border)";
          }}
        >
          <MdVisibility size={14} /> {t("docView")}
        </button>
        {!isCommittee && (
          <button
            type="button"
            onClick={() => onDelete(doc)}
            className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0"
            style={{
              background: "var(--card-inner-bg)",
              borderColor: "var(--glass-border)",
              color: "var(--stat-red-color, #ef4444)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--stat-red-bg, rgba(239,68,68,0.15))";
              e.currentTarget.style.borderColor = "var(--stat-red-border, rgba(239,68,68,0.3))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--card-inner-bg)";
              e.currentTarget.style.borderColor = "var(--glass-border)";
            }}
            aria-label={t("billDelete")}
          >
            <MdDelete size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-2xl border p-5 flex flex-col gap-3"
      style={{
        borderColor: "var(--glass-border, rgba(255,255,255,0.08))",
        background: "var(--card-bg, #111827)",
        minHeight: 170,
      }}
    >
      <div className="flex gap-3 items-center">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div style={{ height: 14, width: "70%", borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ height: 10, width: "40%", borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
        </div>
      </div>
      <div style={{ height: 12, width: "50%", borderRadius: 4, background: "rgba(255,255,255,0.04)", marginTop: 8 }} />
      <div style={{ height: 36, width: "100%", borderRadius: 10, background: "rgba(255,255,255,0.04)", marginTop: "auto" }} />
    </div>
  );
}

function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AdminDocument() {
  const { t } = useLang();
  const { user } = useAuthContext();
  const { showUnauthorized } = useCustomAlert();
  const isCommittee = isCommitteeMember(user);
  const fileRef = useRef();

  const [docs, setDocs] = useState([]);
  const [counts, setCounts] = useState({
    All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0,
  });
  const [initialLoad, setInitialLoad] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const debSearch = useDebounce(search, 500);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: "", category: "Legal", desc: "" });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const catLabel = (cat) =>
    ({
      All: t("docCatAll"),
      Legal: t("docCatLegal"),
      Meetings: t("docCatMeetings"),
      Guidelines: t("docCatGuidelines"),
      Finance: t("docCatFinance"),
      Security: t("docCatSecurity"),
    }[cat] || cat);

  const handleToggleUpload = () => {
    if (!hasPermission(user, "society_documents", "upload")) {
      showUnauthorized("You do not have permission to upload society documents.");
      return;
    }
    setUploadOpen(true);
  };

  const handleOpenDelete = (doc) => {
    if (!hasPermission(user, "society_documents", "delete")) {
      showUnauthorized("You do not have permission to delete society documents.");
      return;
    }
    setDeleteTarget(doc);
  };

  const fetchDocuments = useCallback(async (pg, q, cat, isInit = false) => {
    isInit ? setInitialLoad(true) : setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pg, limit: limitRef.current });
      if (q) params.set("search", q);
      if (cat && cat !== "All") params.set("category", cat);

      const res = await API.get(`/documents/admin?${params}`);
      const data = res.data;

      const rawDocs = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.documents)
        ? data.documents
        : [];
      setDocs(rawDocs);
      setCounts(data.counts || { All: 0, Legal: 0, Meetings: 0, Guidelines: 0, Finance: 0, Security: 0 });
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotalItems(data.pagination?.totalItems ?? 0);
      setPage(pg);
    } catch (err) {
      setError(err.response?.data?.message || t("docLoadError"));
    } finally {
      setInitialLoad(false);
      setFetching(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDocuments(1, "", "All", true);
  }, []);

  useEffect(() => {
    if (initialLoad) return;
    fetchDocuments(1, debSearch, activeCat);
  }, [debSearch]);

  const handleCatChange = (cat) => {
    setActiveCat(cat);
    fetchDocuments(1, debSearch, cat);
  };

  const handlePageChange = (p) => fetchDocuments(p, debSearch, activeCat);

  const resetUploadForm = () => {
    setForm({ title: "", category: "Legal", desc: "" });
    setFile(null);
    setDragOver(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!hasPermission(user, "society_documents", "upload")) {
      showUnauthorized("You do not have permission to upload society documents.");
      return;
    }
    const titleErr = getTitleError(form.title, "Document title");
    if (titleErr) {
      showToast(titleErr, "error");
      return;
    }
    if (!file) {
      showToast(t("adDocErrFile"), "error");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", form.title.trim());
      formData.append("category", form.category);
      formData.append("description", form.desc.trim());
      const res = await API.post("/documents/admin", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      resetUploadForm();
      setUploadOpen(false);
      showToast(`"${res.data.data.title}" ${t("adDocUploadSuccess")}`);
      fetchDocuments(1, debSearch, activeCat);
    } catch (err) {
      showToast(err.response?.data?.message || t("adDocUploadFail"), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!hasPermission(user, "society_documents", "delete")) {
      showUnauthorized("You do not have permission to delete society documents.");
      return;
    }
    try {
      setDeleting(true);
      await API.delete(`/documents/admin/${deleteTarget.id}?hard=true`);
      showToast(`"${deleteTarget.title}" ${t("adDocDeleteSuccess")}`);
      setDeleteTarget(null);
      const newPage = docs.length === 1 && page > 1 ? page - 1 : page;
      fetchDocuments(newPage, debSearch, activeCat);
    } catch (err) {
      showToast(err.response?.data?.message || t("adDocDeleteFail"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const shownFrom = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const shownTo = Math.min(page * limit, totalItems);

  return (
    <div className="space-y-5 animate-fadeIn">
      {toast && (
        <div className={`ad-toast ad-toast--${toast.type}`}>
          {toast.type === "success" ? <MdCheckCircle size={16} /> : <MdWarningAmber size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ad-page-icon">
            <MdDescription size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ letterSpacing: "-0.02em", margin: 0, color: "var(--text-primary)" }}>
              {t("adDocTitle")}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", margin: 0 }}>
              {initialLoad
                ? "—"
                : `${totalItems} ${t("adDocBadgeCount")}${activeCat !== "All" ? ` · ${catLabel(activeCat)}` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <ExpandableSearch
            value={search}
            onChange={setSearch}
            placeholder={t("adDocSearch")}
          />
          {!isCommittee && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              onClick={handleToggleUpload}
            >
              {t("adDocUploadBtn")}
            </GlobalButton>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ marginBottom: 16 }}>
        <SlidingTabs
          value={activeCat}
          onChange={handleCatChange}
          items={ALL_CATS.map((cat) => ({
            id: cat,
            label: catLabel(cat),
            badge: counts[cat] ?? 0,
          }))}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--card-bg)",
          }}
        >
          <p style={{ color: "var(--stat-red-color, #ef4444)", margin: 0, fontSize: 13 }}>{error}</p>
          <GlobalButton
            variant="secondary"
            icon={MdRefresh}
            onClick={() => fetchDocuments(1, debSearch, activeCat)}
          >
            {t("docRetry")}
          </GlobalButton>
        </div>
      )}

      {/* Loading */}
      {initialLoad && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!initialLoad && !error && docs.length === 0 && !fetching && (
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
            <MdDescription size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            {counts.All === 0 ? t("docEmptyTitle") : t("docNotFound")}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, maxWidth: 380 }}>
            {counts.All === 0 ? t("adDocEmptySub") : t("docNotFoundSub")}
          </p>
          {(search || activeCat !== "All") && (
            <GlobalButton
              variant="secondary"
              style={{ marginTop: 6 }}
              onClick={() => {
                setSearch("");
                handleCatChange("All");
              }}
            >
              {t("billClearFilters")}
            </GlobalButton>
          )}
          {!isCommittee && counts.All === 0 && (
            <GlobalButton
              variant="add"
              icon={MdAdd}
              borderDraw
              style={{ marginTop: 6 }}
              onClick={handleToggleUpload}
            >
              {t("adDocUploadBtn")}
            </GlobalButton>
          )}
        </div>
      )}

      {/* Cards + pagination */}
      {!initialLoad && !error && docs.length > 0 && (
        <>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            style={{ opacity: fetching ? 0.55 : 1, transition: "opacity 0.2s ease" }}
          >
            {docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                t={t}
                catLabel={catLabel}
                onDelete={handleOpenDelete}
                onOpen={setViewDoc}
                isCommittee={isCommittee}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("adDocShowingCount", {
                from: shownFrom,
                to: shownTo,
                total: totalItems,
              })}
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={limit}
              onPageSizeChange={(s) => {
                limitRef.current = s;
                setLimit(s);
                setPage(1);
                fetchDocuments(1, debSearch, activeCat);
              }}
            />
          </div>
        </>
      )}

      {/* Upload modal */}
      <GlobalModal
        isOpen={uploadOpen}
        onClose={() => {
          if (uploading) return;
          setUploadOpen(false);
          resetUploadForm();
        }}
        title={t("adDocUploadTitle")}
        subtitle={t("adDocUploadSub")}
        icon={MdCloudUpload}
        size="lg"
      >
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {t("adDocFieldTitle")} <span style={{ color: "var(--stat-red-color)" }}>*</span>
              </label>
              <input
                className="input"
                type="text"
                placeholder={t("adDocFieldTitlePlaceholder")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {t("adDocFieldCategory")} <span style={{ color: "var(--stat-red-color)" }}>*</span>
              </label>
              <Select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {FORM_CATS.map((c) => (
                  <option key={c} value={c}>
                    {catLabel(c)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("adDocFieldDesc")}{" "}
              <span style={{ fontWeight: 500, opacity: 0.7 }}>({t("compPhotoOptional")})</span>
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder={t("adDocFieldDescPlaceholder")}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              style={{ resize: "vertical", minHeight: 64 }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
              {t("adDocFieldFile")} <span style={{ color: "var(--stat-red-color)" }}>*</span>
            </label>
            <div
              className={`ad-dropzone${dragOver ? " ad-dropzone--over" : ""}${file ? " ad-dropzone--filled" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{ cursor: "pointer" }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
              {file ? (
                <div className="ad-dz-filled">
                  <div className="ad-dz-file-icon">
                    <MdCheckCircle size={20} />
                  </div>
                  <div className="ad-dz-info">
                    <p className="ad-dz-filename">{file.name}</p>
                    <p className="ad-dz-filesize">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    className="ad-dz-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <MdClose size={14} />
                  </button>
                </div>
              ) : (
                <div className="ad-dz-empty">
                  <MdOutlineUploadFile size={34} className="ad-dz-cloud" />
                  <p className="ad-dz-text">
                    {t("adDocDragDrop")} <span className="ad-dz-browse">{t("adDocBrowse")}</span>
                  </p>
                  <p className="ad-dz-hint">{t("adDocFileHint")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GlobalButton
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => {
                setUploadOpen(false);
                resetUploadForm();
              }}
            >
              {t("cancel")}
            </GlobalButton>
            <GlobalButton type="submit" variant="add" icon={MdCloudUpload} disabled={uploading} borderDraw>
              {uploading ? t("adDocUploading") : t("adDocUploadBtn")}
            </GlobalButton>
          </div>
        </form>
      </GlobalModal>

      {/* Delete confirm */}
      <GlobalConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("adDocDeleteTitle")}
        message={
          deleteTarget
            ? `"${deleteTarget.title}" ${t("adDocDeleteBody")}`
            : ""
        }
        variant="danger"
        loading={deleting}
      />

      {/* View modal */}
      <GlobalModal
        isOpen={!!viewDoc}
        onClose={() => setViewDoc(null)}
        title={viewDoc?.title || "Document"}
        subtitle={viewDoc?.file_name}
        icon={MdDescription}
        size="lg"
      >
        <div
          style={{
            height: "70vh",
            width: "100%",
            borderRadius: 12,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {viewDoc && (
            <iframe
              src={
                viewDoc.file_url?.startsWith("http")
                  ? viewDoc.file_url
                  : `${BASE_URL}/${viewDoc.file_url}`
              }
              title={viewDoc.title}
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          )}
        </div>
      </GlobalModal>
    </div>
  );
}
