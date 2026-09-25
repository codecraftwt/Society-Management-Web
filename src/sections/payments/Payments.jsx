import { useEffect, useState, useContext, useMemo } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { hasPermission, isAdmin } from "../../utils/permissions";
import API from "../../services/api";
import { getPaymentsList, confirmBillPayment } from "../../services/accountingService";
import { amenityDescription, resolveResidentName, resolveFlatNumber } from "./paymentDetails";
import Index, { PaymentsSkeleton } from "./index/Index";
import PaymentDetailsModal from "./index/PaymentDetailsModal";

export default function Payments() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.activeRole === "SUPER_ADMIN";
  const canConfirm = isAdmin(user) || hasPermission(user, "payments", "confirm");

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [source, setSource] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  /* ── SuperAdmin society gate ── */
  const [societies, setSocieties] = useState([]);
  const [societyId, setSocietyId] = useState(
    () => localStorage.getItem("superadmin_society_filter") || ""
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/societies")
      .then((r) => setSocieties(r.data || []))
      .catch(() => setSocieties([]));
  }, [isSuperAdmin]);

  const load = async (p = page, src = source, size = limit) => {
    if (isSuperAdmin && (!societyId || societyId === "ALL")) {
      setLoading(false);
      setRows([]);
      setPagination({});
      return;
    }
    try {
      setLoading(true);
      setErr("");
      const params = { page: p, limit: size };
      if (src) params.source = src;
      const res = await getPaymentsList(params);
      setRows(res.data || []);
      setPagination(res.pagination || {});
    } catch (e) {
      console.error("Failed to load payments", e);
      setErr(t("payLoadFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    setSocietyId(val);
    localStorage.setItem("superadmin_society_filter", val);
    setPage(1);
    load(1, source);
  };

  useEffect(() => {
    load(1, source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const confirm = async (row) => {
    if (!row.bill_id) return;
    try {
      setConfirming(row.id);
      const res = await confirmBillPayment(row.bill_id);
      toast.success(res?.message || t("payConfirmOk"));
      load(page);
    } catch (e) {
      console.error("Failed to confirm payment", e);
      toast.error(e?.response?.data?.message || t("payConfirmFail"));
    } finally {
      setConfirming(null);
    }
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const resName = resolveResidentName(r).toLowerCase();
      const flatNum = resolveFlatNumber(r).toLowerCase();
      const desc = (
        r.Bill?.title ||
        amenityDescription(r.booking, t) ||
        (r.source === "MAINTENANCE" ? t("payMaintenanceHash", { id: r.bill_id || "" }) : "")
      ).toLowerCase();
      const mode = (r.payment_mode || "").toLowerCase();
      const amt = String(r.amount || "");
      const src = (r.source || "").toLowerCase();

      return (
        resName.includes(q) ||
        flatNum.includes(q) ||
        desc.includes(q) ||
        mode.includes(q) ||
        amt.includes(q) ||
        src.includes(q)
      );
    });
  }, [rows, search, t]);

  if (loading && rows.length === 0) return <PaymentsSkeleton />;

  const pageSize = limit;
  const currentPage = pagination.currentPage || page;
  const workingSocietyName = societies.find((s) => String(s.id) === String(societyId))?.name || "";
  const totalCount = pagination.totalItems ?? rows.length;
  const hasContent = !isSuperAdmin || (societyId && societyId !== "ALL");

  return (
    <div className="space-y-6 w-full min-w-0 max-w-1200 mx-auto pb-8">
      <Index
        source={source}
        onSourceChange={(val) => {
          setSource(val);
          setPage(1);
        }}
        search={search}
        onSearchChange={setSearch}
        isSearchOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        loading={loading}
        onRefresh={() => load(page)}
        isSuperAdmin={isSuperAdmin}
        societies={societies}
        societyId={societyId}
        onSocietyChange={handleSocietyChange}
        workingSocietyName={workingSocietyName}
        totalCount={totalCount}
        hasContent={hasContent}
        err={err}
        onRetry={() => load(page)}
        filteredRows={filteredRows}
        onReset={() => {
          setSource("");
          setSearch("");
          load(1, "");
          setPage(1);
        }}
        currentPage={currentPage}
        pageSize={pageSize}
        pagination={pagination}
        canConfirm={canConfirm}
        confirming={confirming}
        onConfirm={confirm}
        onView={setSelected}
        onPageChange={(p) => {
          setPage(p);
          load(p);
        }}
        onPageSizeChange={(s) => {
          setLimit(s);
          setPage(1);
          load(1, source, s);
        }}
      />
      {selected && <PaymentDetailsModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}