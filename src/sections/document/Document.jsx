// DOCUMENT SECTION (replaces src/pages/Admin/AdminDocument.jsx)
import { useState, useEffect, useRef, useCallback } from "react";
import { MdCheckCircle, MdWarningAmber, MdDescription } from "react-icons/md";
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
    <div className="space-y-5 animate-fadeIn">
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