import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { hasPermission, isAdmin } from "../../utils/permissions";
import API from "../../services/api";
import { getPaymentsList, confirmBillPayment } from "../../services/accountingService";
import { amenityDescription, resolveResidentName, resolveFlatNumber } from "./paymentDetails";
import Index, { PaymentsSkeleton } from "./index/Index";
import PaymentDetailsModal from "./index/PaymentDetailsModal";
import {
  MdAttachMoney,
  MdSearch,
  MdOutlineInbox,
  MdArrowForward,
} from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import Select from "../../components/common/Select";

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
  const [modeFilter, setModeFilter] = useState("ALL");
  const [confirming, setConfirming] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  /* ── SuperAdmin society gate ── */
  const [societies, setSocieties] = useState([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [societySearch, setSocietySearch] = useState("");
  const [societyId, setSocietyId] = useState(() => {
    const cached = localStorage.getItem("superadmin_society_filter");
    return cached && cached !== "ALL" ? cached : "";
  });

  const loadSocieties = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoadingSocieties(true);
    try {
      const r = await API.get("/societies");
      const list = Array.isArray(r.data)
        ? r.data
        : Array.isArray(r.data?.data)
        ? r.data.data
        : [];
      setSocieties(list);
    } catch (e) {
      console.error("Failed to load societies:", e);
      setSocieties([]);
    } finally {
      setLoadingSocieties(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadSocieties();
  }, [loadSocieties]);

  const load = async (p = page, src = source, size = limit, currentSocId = societyId) => {
    if (isSuperAdmin && (!currentSocId || currentSocId === "ALL")) {
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
      if (isSuperAdmin && currentSocId) {
        params.society_id = currentSocId;
      }
      const res = await getPaymentsList(params);
      setRows(res.data || []);
      setPagination(res.pagination || {});
    } catch (e) {
      console.error("Failed to load payments", e);
      setErr(t("payLoadFail") || "Failed to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSociety = (val) => {
    if (!val || val === "ALL") {
      setSocietyId("");
      localStorage.setItem("superadmin_society_filter", "ALL");
      setRows([]);
      setPagination({});
      window.dispatchEvent(new Event("storage"));
      return;
    }
    const strId = String(val);
    setSocietyId(strId);
    localStorage.setItem("superadmin_society_filter", strId);
    window.dispatchEvent(new Event("storage"));
    setPage(1);
    load(1, source, limit, strId);
  };

  const handleSocietyChange = (e) => {
    handleSelectSociety(e.target.value);
  };

  useEffect(() => {
    if (!isSuperAdmin || (societyId && societyId !== "ALL")) {
      load(1, source, limit, societyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, societyId]);

  const confirm = async (row) => {
    if (!row.bill_id) return;
    try {
      setConfirming(row.id);
      const res = await confirmBillPayment(row.bill_id);
      toast.success(res?.message || t("payConfirmOk") || "Payment verified successfully!");
      load(page, source, limit, societyId);
    } catch (e) {
      console.error("Failed to confirm payment", e);
      toast.error(e?.response?.data?.message || t("payConfirmFail") || "Failed to confirm payment.");
    } finally {
      setConfirming(null);
    }
  };

  const filteredRows = useMemo(() => {
    let list = rows;
    if (modeFilter && modeFilter !== "ALL") {
      list = list.filter(
        (r) => (r.payment_mode || "UPI").toUpperCase() === modeFilter.toUpperCase()
      );
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((r) => {
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
  }, [rows, search, modeFilter, t]);

  const stats = useMemo(() => {
    let totalAmt = 0;
    let maintAmt = 0;
    let maintCount = 0;
    let billAmt = 0;
    let billCount = 0;
    let amenityAmt = 0;
    let amenityCount = 0;

    rows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      totalAmt += amt;
      const src = (r.source || "").toUpperCase();
      if (src === "MAINTENANCE") {
        maintAmt += amt;
        maintCount += 1;
      } else if (src === "AMENITY") {
        amenityAmt += amt;
        amenityCount += 1;
      } else {
        billAmt += amt;
        billCount += 1;
      }
    });

    return {
      totalAmt,
      totalCount: rows.length,
      maintAmt,
      maintCount,
      billAmt,
      billCount,
      amenityAmt,
      amenityCount,
    };
  }, [rows]);

  const handleExportCSV = () => {
    if (!filteredRows.length) {
      toast.info("No records to export.");
      return;
    }
    const headers = [
      "Sr No",
      "Date",
      "Source",
      "Resident Name",
      "Flat Number",
      "Description",
      "Amount",
      "Payment Mode",
      "Status",
    ];
    const csvData = [headers.join(",")];
    filteredRows.forEach((r, idx) => {
      const sr = idx + 1;
      const date = r.payment_date
        ? `"${new Date(r.payment_date).toLocaleDateString()}"`
        : `"—"`;
      const src = `"${r.source || "BILL"}"`;
      const resident = `"${resolveResidentName(r).replace(/"/g, '""')}"`;
      const flat = `"${resolveFlatNumber(r).replace(/"/g, '""')}"`;
      const desc = `"${(
        r.Bill?.title ||
        amenityDescription(r.booking, t) ||
        r.source ||
        "—"
      ).replace(/"/g, '""')}"`;
      const amt = r.amount || 0;
      const mode = `"${r.payment_mode || "UPI"}"`;
      const status = `"${r.status || "SUCCESS"}"`;

      csvData.push([sr, date, src, resident, flat, desc, amt, mode, status].join(","));
    });

    const blob = new Blob([csvData.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Payments_${workingSocietyName ? workingSocietyName.replace(/\s+/g, "_") : "Society"}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payments export downloaded!");
  };

  const filteredSocieties = useMemo(() => {
    const q = societySearch.trim().toLowerCase();
    if (!q) return societies;
    return societies.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
    );
  }, [societies, societySearch]);

  const pageSize = limit;
  const currentPage = pagination.currentPage || page;
  const workingSocietyName = societies.find((s) => String(s.id) === String(societyId))?.name || "";
  const totalCount = pagination.totalItems ?? rows.length;
  const hasContent = !isSuperAdmin || (societyId && societyId !== "ALL");

  // If Super Admin has not selected a society, show the Society Selection Console
  if (isSuperAdmin && (!societyId || societyId === "ALL")) {
    return (
      <div className="space-y-6 animate-fadeIn py-2 max-w-5xl mx-auto">
        {/* Hero Banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(var(--acct-green-rgb, 16, 185, 129), 0.16) 0%, rgba(var(--acct-purple-rgb, 124, 58, 237), 0.1) 100%)",
            border: "1.5px solid var(--glass-border)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                <MdAttachMoney size={13} />
                <span>Super Admin Payments Console</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                Select Society to View Collections
              </h1>
              <p className="text-sm text-secondary max-w-xl leading-relaxed">
                Review payment registers, verified utility bills, maintenance contributions, and
                facility booking collections for any registered society.
              </p>
            </div>

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-inner">
              <MdAttachMoney size={38} />
            </div>
          </div>
        </div>

        {/* Quick Dropdown + Search Bar */}
        <div
          className="p-5 rounded-2xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card border border-glass"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center gap-2 flex-1 relative">
            <MdSearch
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
            />
            <input
              type="text"
              value={societySearch}
              onChange={(e) => setSocietySearch(e.target.value)}
              placeholder="Search society by name or address…"
              className="input w-full pl-9 h-11 text-sm font-medium rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              className="input h-11 min-w-[200px] text-sm font-semibold rounded-xl"
              value=""
              onChange={(e) => handleSelectSociety(e.target.value)}
            >
              <option value="" disabled>
                Quick Choose Society…
              </option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Societies Grid */}
        {loadingSocieties ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-secondary">
            <svg className="animate-spin w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-medium">Loading registered societies…</p>
          </div>
        ) : filteredSocieties.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-secondary bg-card rounded-2xl border border-glass">
            <MdOutlineInbox size={48} className="opacity-30" />
            <p className="text-sm font-semibold">
              {societySearch
                ? `No societies matching "${societySearch}"`
                : "No societies found"}
            </p>
            {societySearch && (
              <button
                onClick={() => setSocietySearch("")}
                className="text-xs text-accent hover:underline font-medium"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSocieties.map((soc) => (
              <div
                key={soc.id}
                onClick={() => handleSelectSociety(soc.id)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl cursor-pointer transition-all bg-card border border-glass hover:border-emerald-500 hover:shadow-lg"
                style={{
                  transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 group-hover:scale-105 transition-transform">
                      <FaBuilding size={18} />
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-card-inner text-secondary border border-glass">
                      ID #{soc.id}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-primary group-hover:text-emerald-500 transition-colors line-clamp-1">
                      {soc.name}
                    </h3>
                    <p className="text-xs text-secondary line-clamp-2 mt-1">
                      {soc.address || soc.city || "Society community registered in system"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-glass flex items-center justify-between text-xs font-bold text-emerald-500">
                  <span>View Collections & Inflow</span>
                  <MdArrowForward
                    size={16}
                    className="transform group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading && rows.length === 0) return <PaymentsSkeleton />;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-7xl mx-auto pb-8 animate-fadeIn">
      <Index
        source={source}
        onSourceChange={(val) => {
          setSource(val);
          setPage(1);
        }}
        modeFilter={modeFilter}
        onModeFilterChange={setModeFilter}
        search={search}
        onSearchChange={setSearch}
        isSearchOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        loading={loading}
        onRefresh={() => load(page, source, limit, societyId)}
        onExportCSV={handleExportCSV}
        isSuperAdmin={isSuperAdmin}
        societies={societies}
        societyId={societyId}
        onSocietyChange={handleSocietyChange}
        onSelectSociety={handleSelectSociety}
        workingSocietyName={workingSocietyName}
        totalCount={totalCount}
        hasContent={hasContent}
        err={err}
        onRetry={() => load(page, source, limit, societyId)}
        filteredRows={filteredRows}
        stats={stats}
        onReset={() => {
          setSource("");
          setModeFilter("ALL");
          setSearch("");
          load(1, "", limit, societyId);
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
          load(p, source, limit, societyId);
        }}
        onPageSizeChange={(s) => {
          setLimit(s);
          setPage(1);
          load(1, source, s, societyId);
        }}
      />
      {selected && <PaymentDetailsModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}