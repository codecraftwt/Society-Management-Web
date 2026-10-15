// DOCUMENT SECTION (replaces src/pages/Admin/AdminDocument.jsx)
import { useState, useEffect, useRef, useCallback } from "react";
import { MdCheckCircle, MdWarningAmber, MdDescription, MdFileDownload, MdOpenInNew } from "react-icons/md";
import API from "../../services/api";
import { BASE_URL } from "../../config/apiConfig";
import { useLang } from "../../context/LanguageContext";
import { useAuthContext } from "../../context/AuthContext";
import { useCustomAlert } from "../../context/CustomAlertContext";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import useDebounce from "../../hooks/useDebounce";
import GlobalModal from "../../components/common/GlobalModal";
import Index from "./index/Index";
import Create from "./create/Create";
import Delete from "./delete/Delete";
import "./Document.css";

const ALL_CATS = ["All", "Legal", "Meetings", "Guidelines", "Finance", "Security"];

export default function Document() {
  const { t } = useLang();
  const { user } = useAuthContext();
  const { showUnauthorized } = useCustomAlert();
  const isCommittee = isCommitteeMember(user);

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

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSession, setUploadSession] = useState(0);
  const [viewDoc, setViewDoc] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);

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
    setUploadSession((s) => s + 1);
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

  const handlePageSizeChange = (s) => {
    limitRef.current = s;
    setLimit(s);
    setPage(1);
    fetchDocuments(1, debSearch, activeCat);
  };

  const handleCreated = (title) => {
    showToast(`"${title}" ${t("adDocUploadSuccess")}`);
    fetchDocuments(1, debSearch, activeCat);
  };

  const handleDeleted = () => {
    const newPage = docs.length === 1 && page > 1 ? page - 1 : page;
    fetchDocuments(newPage, debSearch, activeCat);
  };

  const shownFrom = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const shownTo = Math.min(page * limit, totalItems);

  return (
    <div className="documents-page space-y-5 animate-fadeIn">
      {toast && (
        <div className={`ad-toast ad-toast--${toast.type}`}>
          {toast.type === "success" ? <MdCheckCircle size={16} /> : <MdWarningAmber size={16} />}
          {toast.msg}
        </div>
      )}

      <Index
        search={search}
        counts={counts}
        docs={docs}
        initialLoad={initialLoad}
        fetching={fetching}
        error={error}
        activeCat={activeCat}
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalItems={totalItems}
        shownFrom={shownFrom}
        shownTo={shownTo}
        isCommittee={isCommittee}
        catLabel={catLabel}
        onSearchChange={setSearch}
        onCatChange={handleCatChange}
        onClearFilters={() => {
          setSearch("");
          handleCatChange("All");
        }}
        onRetry={() => fetchDocuments(1, debSearch, activeCat)}
        onOpenUpload={handleToggleUpload}
        onOpenView={setViewDoc}
        onDelete={handleOpenDelete}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Create
        key={uploadSession}
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={handleCreated}
        onToast={showToast}
        catLabel={catLabel}
      />

      <Delete
        key={deleteTarget?.id}
        isOpen={!!deleteTarget}
        doc={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
        onToast={showToast}
      />

      {/* Enhanced Full-Featured Document Preview Modal */}
      {viewDoc && (
        <GlobalModal
          isOpen={!!viewDoc}
          onClose={() => setViewDoc(null)}
          size="xxl"
          style={{ maxWidth: "1280px", width: "95vw", height: "90vh", borderRadius: 24 }}
          bodyStyle={{ padding: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0f172a" }}
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-base text-primary truncate max-w-sm sm:max-w-md">
                {viewDoc.title}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20">
                {catLabel(viewDoc.category)}
              </span>
            </div>
          }
          subtitle={
            <span className="text-xs text-secondary flex items-center gap-2 mt-0.5 font-medium">
              <span className="font-mono text-slate-400">{viewDoc.file_name}</span>
              {viewDoc.file_size_formatted && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{viewDoc.file_size_formatted}</span>
                </>
              )}
            </span>
          }
          icon={MdDescription}
        >
          {/* Document Viewer Action Strip */}
          <div className="px-4 py-2.5 bg-slate-900/90 backdrop-blur border-b border-white/10 flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono font-bold text-[10px] text-slate-200 uppercase tracking-wider">
                {String(viewDoc.file_name || "").split(".").pop() || "FILE"}
              </span>
              {viewDoc.created_at && (
                <span className="text-slate-400 text-xs hidden sm:inline">
                  Uploaded {new Date(viewDoc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={
                  viewDoc.file_url?.startsWith("http")
                    ? viewDoc.file_url
                    : `${BASE_URL}/${viewDoc.file_url}`
                }
                download={viewDoc.file_name || "document"}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download original document"
              >
                <MdFileDownload size={15} />
                <span>Download</span>
              </a>

              <a
                href={
                  viewDoc.file_url?.startsWith("http")
                    ? viewDoc.file_url
                    : `${BASE_URL}/${viewDoc.file_url}`
                }
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Open file in new browser window"
              >
                <MdOpenInNew size={14} />
                <span>Full Tab</span>
              </a>
            </div>
          </div>

          {/* Document Content Viewport */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
            {/\.(png|jpe?g|webp|gif|svg)$/i.test(viewDoc.file_name || "") ? (
              <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
                <img
                  src={
                    viewDoc.file_url?.startsWith("http")
                      ? viewDoc.file_url
                      : `${BASE_URL}/${viewDoc.file_url}`
                  }
                  alt={viewDoc.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            ) : (
              <iframe
                src={`${
                  viewDoc.file_url?.startsWith("http")
                    ? viewDoc.file_url
                    : `${BASE_URL}/${viewDoc.file_url}`
                }#toolbar=1&navpanes=0`}
                title={viewDoc.title}
                width="100%"
                height="100%"
                className="w-full h-full border-none"
              />
            )}
          </div>
        </GlobalModal>
      )}
    </div>
  );
}