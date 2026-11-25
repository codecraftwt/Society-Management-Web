import { useEffect, useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import {
  MdHome, MdPersonAdd, MdWarning, MdClose, MdCheck,
  MdBadge, MdCreditCard, MdDelete, MdAccessTime, MdAutorenew,
  MdVisibility, MdVisibilityOff, MdCheckCircle, MdOpenInNew
, MdEmail, MdPhone, MdLocationOn, MdEvent, MdErrorOutline, MdInfoOutline, MdPerson } from "react-icons/md";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import GlobalButton from "../../components/common/GlobalButton";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";
import { getNameError, getEmailError, getMobileError, getRequiredDateError, getDateRangeError, getPasswordError } from "../../utils/validators";
import { useLang } from "../../context/LanguageContext";
import { formatFullFlatLabel } from "../../utils/flatFormatter";

/* ─────────────────────────────────────────────
   Document Upload Field
───────────────────────────────────────────── */
function DocumentUploadField({ label, icon: Icon, accept, file, onChange }) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return Math.round(bytes / 1024) + " KB";
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (!selected) {
      onChange(null);
      return;
    }
    // Show upload/reading loader on file selection as requested
    setIsSelecting(true);
    setTimeout(() => {
      onChange(selected);
      setIsSelecting(false);
    }, 450);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] text-secondary font-semibold uppercase tracking-wider block">
          {label}
        </label>
        {file && !isSelecting && (
          <span className="text-[10px] text-secondary font-medium">
            {formatFileSize(file.size)}
          </span>
        )}
      </div>
      <div
        onClick={() => {
          if (!isSelecting) inputRef.current?.click();
        }}
        className={`rounded-xl border-2 border-dashed p-3 flex items-center gap-3 transition-all relative overflow-hidden ${
          isSelecting
            ? "cursor-wait border-blue-500 bg-blue-500/10 shadow-sm"
            : "cursor-pointer hover:border-blue-400"
        }`}
        style={{
          background: isSelecting
            ? "rgba(59,130,246,0.08)"
            : file
            ? "rgba(34,197,94,0.08)"
            : "var(--card-inner-bg)",
          borderColor: isSelecting
            ? "#3b82f6"
            : file
            ? "rgba(34,197,94,0.5)"
            : "var(--divider, rgba(255,255,255,0.12))",
        }}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden transition-all ${
            isSelecting
              ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/30"
              : file
              ? "bg-green-500/20 text-green-500"
              : "bg-blue-500/10 text-blue-500"
          }`}
        >
          {isSelecting ? (
            <svg
              className="animate-spin text-blue-500 w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : previewUrl ? (
            <img src={previewUrl} alt="preview" className="w-full h-full object-cover rounded-lg" />
          ) : file ? (
            <MdCheck size={20} className="text-green-500" />
          ) : (
            <Icon size={18} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold truncate"
            style={{
              color: isSelecting ? "#60a5fa" : file ? "#4ade80" : "var(--text-primary)",
            }}
          >
            {isSelecting ? "Uploading & processing photo..." : file ? file.name : t("rpropClickUpload")}
          </p>
          <p className="text-[10px] text-secondary truncate mt-0.5">
            {isSelecting ? (
              "Please wait..."
            ) : file ? (
              <span className="text-emerald-400 font-medium">
                ✓ Ready ({formatFileSize(file.size)})
              </span>
            ) : (
              "PDF, JPG, PNG (Max 5MB)"
            )}
          </p>
        </div>

        {file && !isSelecting && (
          <button
            type="button"
            title="Remove document"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="p-1 rounded-md text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <MdClose size={16} />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={isSelecting}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function MyProperties() {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const [properties, setProperties]   = useState([]);
  const [tenantHistory, setTenantHistory] = useState([]);
  const [selectedHistoryTenant, setSelectedHistoryTenant] = useState(null);
  const [activeSection, setActiveSection] = useState("properties");
  const [loading, setLoading]         = useState(true);

  // Tenant Add Form
  const [showForm, setShowForm]             = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "",
    vehicle_count: 0, occupant_count: 1,
    move_in_date: "", move_out_date: ""
  });
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile]       = useState(null);

  // Unsaved-changes guard
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showForm);
  const requestCloseAddTenant = () => {
    if (submitting) return; // Prevent closing while documents are uploading
    setShowPassword(false);
    if (dirtyRef.current) setConfirmDiscard(true);
    else setShowForm(false);
  };

  // View Tenant Modal
  const [viewTenantData, setViewTenantData] = useState(null);
  const [isRenewing, setIsRenewing]         = useState(false);
  const [newLeaseDate, setNewLeaseDate]     = useState("");
  const [tenantDocs, setTenantDocs]         = useState(null);
  const [loadingDocs, setLoadingDocs]       = useState(false);

  useEffect(() => {
    if (!viewTenantData) {
      setTenantDocs(null);
      setLoadingDocs(false);
      return;
    }
    const tenantUserId = viewTenantData.User?.id || viewTenantData.user_id;
    if (tenantUserId) {
      setLoadingDocs(true);
      API.get(`/user-documents/user/${tenantUserId}`)
        .then((res) => setTenantDocs(res.data))
        .catch((err) => {
          console.error("[MyProperties] fetch tenant docs error:", err);
          setTenantDocs(null);
        })
        .finally(() => setLoadingDocs(false));
    }
  }, [viewTenantData]);

  /* ─────────────────────────────────────────
     Load Properties
     Uses /users/get-flat (working endpoint) +
     /flats/:id/memberships for tenant info
  ───────────────────────────────────────── */
  const loadProperties = async () => {
    try {
      setLoading(true);

      // Step 1 — get all flats this user belongs to
      const flatRes = await API.get("/users/get-flat");
      let flats   = Array.isArray(flatRes.data) ? flatRes.data : [];

      // Filter by current active society if present
      if (user?.society_id) {
        flats = flats.filter(
          (f) => !f.society_id || String(f.society_id) === String(user.society_id)
        );
      }

      // Step 2 — keep only flats where user is OWNER (not family member / tenant)
      const ownedFlats = flats.filter((f) => f.role === "OWNER" || f.isAdmin);

      if (ownedFlats.length === 0) {
        setProperties([]);
        return;
      }

      // Step 3 — enrich each flat with latest tenant membership
      const enriched = await Promise.all(
        ownedFlats.map(async (flat) => {
          try {
            const memRes     = await API.get(`/flats/${flat.flat_id}/memberships?all=1`);
            const memberships = memRes.data?.memberships || [];
            // Backend should sort by createdAt DESC; first TENANT entry = most recent
            const latestTenant = memberships.find((m) => m.role === "TENANT" && m.is_current !== false) || null;
            return { ...flat, tenantData: latestTenant };
          } catch {
            return { ...flat, tenantData: null };
          }
        })
      );

      setProperties(enriched);
    } catch (err) {
      console.error("[MyProperties] loadProperties error:", err);
      toast.error(t("rpropLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadProperties();
  }, [user?.id, user?.society_id]);

  useEffect(() => {
    if (!user?.id) return;
    API.get("/users/resident/tenant-history")
      .then((res) => setTenantHistory(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setTenantHistory([]));
  }, [user?.id, user?.society_id]);

  /* ─────────────────────────────────────────
     Handlers
  ───────────────────────────────────────── */
  const handleAddTenant = async (e) => {
    e.preventDefault();

    // Normalize pasted or manually typed whitespace before validating. A name
    // such as "Kunal  Mehta" is still a valid full name; collapse repeated
    // spaces so the shared validator does not reject it.
    const normalizedName = String(formData.name || "").trim().replace(/\s+/g, " ");
    const nameError = getNameError(normalizedName, t("rpropFullName"));
    if (nameError) return toast.error(nameError);

    const emailError = getEmailError(formData.email, t("rpropEmail"));
    if (emailError) return toast.error(emailError);

    const phoneError = getMobileError(formData.phone, t("rpropPhone"));
    if (phoneError) return toast.error(phoneError);

    const passwordError = getPasswordError(formData.password, t("rpropTempPassword"));
    if (passwordError) return toast.error(passwordError);

    const moveInError = getRequiredDateError(formData.move_in_date, t("rpropLeaseStart"));
    if (moveInError) return toast.error(moveInError);

    const moveOutError = getRequiredDateError(formData.move_out_date, t("rpropLeaseEnd"));
    if (moveOutError) return toast.error(moveOutError);

    const rangeError = getDateRangeError(formData.move_in_date, formData.move_out_date, t("rpropLeaseStart"), t("rpropLeaseEnd"));
    if (rangeError) return toast.error(rangeError);

    if (!aadharFile || !panFile)
      return toast.error(t("rpropUploadBothDocs"));

    setSubmitting(true);
    try {
      const res       = await API.post("/users/resident/add-tenant", { flat_id: selectedFlatId, ...formData, name: normalizedName });
      const newUserId = res.data?.tenant?.id || res.data?.user?.id;


      const docForm = new FormData();
      docForm.append("aadhar", aadharFile);
      docForm.append("pan",    panFile);

      await API.post(`/user-documents?userId=${newUserId}`, docForm, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(95, 30 + Math.round(pct * 0.65)));
          }
        },
      });

      toast.success(t("rpropTenantAdded"));
      setShowForm(false);
      setFormData({ name: "", email: "", phone: "", password: "", vehicle_count: 0, occupant_count: 1, move_in_date: "", move_out_date: "" });
      setAadharFile(null);
      setPanFile(null);
      loadProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || t("rpropAddFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTenant = async (tenantMembershipId, flatId) => {
    if (!window.confirm(t("rpropConfirmRemove"))) return;
    try {
      await API.post("/users/resident/remove-tenant", {
        flat_id:              flatId,
        tenant_membership_id: tenantMembershipId,
      });
      toast.success(t("rpropTenantRemoved"));
      setViewTenantData(null);
      setIsRenewing(false);
      loadProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || t("rpropRemoveFailed"));
    }
  };

  const handleRenewLease = async (tenantMembershipId, flatId) => {
    if (!newLeaseDate) return toast.error(t("rpropSelectNewDate"));
    try {
      await API.post("/users/resident/renew-tenant", {
        flat_id:              flatId,
        tenant_membership_id: tenantMembershipId,
        new_move_out_date:    newLeaseDate,
      });
      toast.success(t("rpropLeaseRenewed"));
      setIsRenewing(false);
      setNewLeaseDate("");
      setViewTenantData(null);
      loadProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || t("rpropRenewFailed"));
    }
  };

  /* ─────────────────────────────────────────
     Styles
  ───────────────────────────────────────── */
  const inputStyle = {
    background:   "var(--input-bg)",
    border:       "1px solid var(--divider, rgba(0,0,0,0.12))",
    color:        "var(--text-primary)",
    padding:      "10px 12px",
    borderRadius: "8px",
    outline:      "none",
    width:        "100%",
    fontSize:     "13px",
  };

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  if (loading)
    return (
      <div className="flex justify-center p-20">
        <span className="animate-spin text-2xl">⏳</span>
      </div>
    );

  if (properties.length === 0 && tenantHistory.length === 0)
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center ad-page-icon">
          <MdHome size={32} />
        </div>
        <h3 className="text-lg font-semibold">{t("rpropNoProperties")}</h3>
        <p className="text-secondary text-sm max-w-xs">
          {t("rpropNoPropertiesSub")}
        </p>
      </div>
    );

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="ad-page-icon">
          <MdHome size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("rpropTitle")}</h2>
          <p className="text-secondary text-xs">{t("rpropSubtitle")}</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-card border border-(--divider) w-fit">
        <button type="button" onClick={() => setActiveSection("properties")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeSection === "properties" ? "bg-blue-600 text-white" : "text-secondary hover:text-primary"}`}>
          Properties
        </button>
        <button type="button" onClick={() => setActiveSection("tenants")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeSection === "tenants" ? "bg-blue-600 text-white" : "text-secondary hover:text-primary"}`}>
          Tenants {tenantHistory.length > 0 ? `(${tenantHistory.length})` : ""}
        </button>
      </div>

      {activeSection === "tenants" && (
        <section className="mt-6 bg-card p-5 rounded-2xl border border-(--divider)">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold">Tenant History</h2>
              <p className="text-xs text-secondary mt-1">Previous tenant applications and approval decisions</p>
            </div>
            <MdAccessTime className="text-blue-400" size={22} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-(--divider)">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1.3fr_1.2fr_1fr_1.25fr_1fr_0.45fr] gap-4 px-4 py-3 bg-black/5 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wide text-secondary">
                <span>Tenant</span><span>Property</span><span>Contact</span><span>Timeline & Dates</span><span>Status</span><span>View</span>
              </div>
              <div>
            {tenantHistory.map((tenant) => {
              const rejected = tenant.status === "REJECTED";
              const pending = tenant.status === "PENDING";
              const statusColor = rejected ? "text-red-500 bg-red-500/10 border-red-500/20" : pending ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-green-500 bg-green-500/10 border-green-500/20";
              return (
                <div key={tenant.id} className="grid grid-cols-[1.3fr_1.2fr_1fr_1.25fr_1fr_0.45fr] gap-4 items-center px-4 py-4 border-t border-(--divider) bg-card-inner hover:bg-blue-500/[0.03] transition-colors">
                  <div className="min-w-0">
                    <div className="min-w-0">
                      <p className="font-bold text-base truncate">{tenant.tenant_name}</p>
                      <p className="text-xs text-secondary mt-1 truncate">{tenant.tenant_email || "Tenant application"}</p>
                    </div>
                  </div>
                  <div className="text-xs font-semibold">{tenant.flat_number ? `${tenant.block_name ? `${tenant.block_name}, ` : ""}Flat ${tenant.flat_number}` : "Property link unavailable"}</div>
                  <div className="text-xs font-semibold">{tenant.tenant_phone || "—"}</div>
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5 text-secondary">
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-75">Applied:</span>
                      <span className="font-medium text-primary">
                        {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    {rejected && (
                      <div className="flex items-center gap-1.5 text-red-500 mt-1 text-[11px] font-medium">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Rejected:</span>
                        <span>
                          {tenant.decision_at
                            ? new Date(tenant.decision_at).toLocaleDateString()
                            : tenant.updated_at
                            ? new Date(tenant.updated_at).toLocaleDateString()
                            : tenant.created_at
                            ? new Date(tenant.created_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                    )}
                    {tenant.status === "REMOVED" && (
                      <div className="flex items-center gap-1.5 text-slate-400 mt-1 text-[11px] font-medium">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Removed:</span>
                        <span>
                          {tenant.move_out_date
                            ? new Date(tenant.move_out_date).toLocaleDateString()
                            : tenant.updated_at
                            ? new Date(tenant.updated_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                    )}
                    {tenant.status === "APPROVED" && (
                      <div className="flex items-center gap-1.5 text-emerald-500 mt-1 text-[11px] font-medium">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Approved:</span>
                        <span>
                          {tenant.decision_at
                            ? new Date(tenant.decision_at).toLocaleDateString()
                            : tenant.move_in_date
                            ? new Date(tenant.move_in_date).toLocaleDateString()
                            : "Active"}
                        </span>
                      </div>
                    )}
                    {pending && (
                      <div className="flex items-center gap-1.5 text-amber-500 mt-1 text-[11px] font-medium">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Status:</span>
                        <span>Awaiting Admin</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusColor}`}>
                      {rejected ? "Rejected" : pending ? "Pending" : tenant.status === "REMOVED" ? "Removed" : "Approved"}
                    </span>
                  </div>
                  <button type="button" onClick={() => setSelectedHistoryTenant(tenant)} title="View tenant details" className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors">
                    <MdVisibility size={18} />
                  </button>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedHistoryTenant && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedHistoryTenant(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-card border border-(--divider) shadow-2xl overflow-hidden transition-all transform scale-100"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
          >
            {/* Modal Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-(--divider) bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                    {selectedHistoryTenant.tenant_name ? selectedHistoryTenant.tenant_name.charAt(0).toUpperCase() : "T"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-primary">{selectedHistoryTenant.tenant_name}</h3>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          selectedHistoryTenant.status === "REJECTED"
                            ? "text-red-500 bg-red-500/10 border-red-500/30"
                            : selectedHistoryTenant.status === "PENDING"
                            ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
                            : selectedHistoryTenant.status === "REMOVED"
                            ? "text-slate-400 bg-slate-500/10 border-slate-500/30"
                            : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                        }`}
                      >
                        {selectedHistoryTenant.status === "REJECTED"
                          ? "Rejected"
                          : selectedHistoryTenant.status === "PENDING"
                          ? "Pending Approval"
                          : selectedHistoryTenant.status === "REMOVED"
                          ? "Previous / Removed"
                          : "Approved & Active"}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-0.5">Tenant Application Details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryTenant(null)}
                  className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-secondary hover:text-primary transition-colors shrink-0"
                >
                  <MdClose size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              {/* If Rejected: Rejection Reason Alert Banner */}
              {selectedHistoryTenant.status === "REJECTED" && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <MdErrorOutline className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Reason for Rejection
                      </p>
                      <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-300">
                        {selectedHistoryTenant.rejection_reason || "The administration did not specify a reason."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* If Pending: Verification Banner */}
              {selectedHistoryTenant.status === "PENDING" && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <MdAccessTime className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-500">
                        Verification In Progress
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        This tenant application has been submitted and is currently waiting for society admin or committee approval.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Information Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Contact: Email */}
                <div className="p-3.5 rounded-xl border border-(--divider) bg-black/5 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs text-secondary mb-1">
                    <MdEmail size={15} className="text-blue-500" />
                    <span>Email Address</span>
                  </div>
                  <p className="font-semibold text-sm truncate" title={selectedHistoryTenant.tenant_email}>
                    {selectedHistoryTenant.tenant_email || "—"}
                  </p>
                </div>

                {/* Contact: Phone */}
                <div className="p-3.5 rounded-xl border border-(--divider) bg-black/5 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs text-secondary mb-1">
                    <MdPhone size={15} className="text-blue-500" />
                    <span>Phone Number</span>
                  </div>
                  <p className="font-semibold text-sm">
                    {selectedHistoryTenant.tenant_phone || "—"}
                  </p>
                </div>

                {/* Property / Flat */}
                <div className="p-3.5 rounded-xl border border-(--divider) bg-black/5 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs text-secondary mb-1">
                    <MdHome size={15} className="text-blue-500" />
                    <span>Associated Property</span>
                  </div>
                  <p className="font-semibold text-sm">
                    {selectedHistoryTenant.flat_number
                      ? `${selectedHistoryTenant.block_name ? `${selectedHistoryTenant.block_name}, ` : ""}Flat ${selectedHistoryTenant.flat_number}`
                      : "Property Link Unavailable"}
                  </p>
                </div>

                {/* Application Date */}
                <div className="p-3.5 rounded-xl border border-(--divider) bg-black/5 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs text-secondary mb-1">
                    <MdEvent size={15} className="text-blue-500" />
                    <span>Applied On</span>
                  </div>
                  <p className="font-semibold text-sm">
                    {selectedHistoryTenant.created_at
                      ? new Date(selectedHistoryTenant.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>

                {/* Decision / Status Date */}
                <div className="p-3.5 rounded-xl border border-(--divider) bg-black/5 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs text-secondary mb-1">
                    <MdAccessTime size={15} className={
                      selectedHistoryTenant.status === "REJECTED" ? "text-red-500" :
                      selectedHistoryTenant.status === "PENDING" ? "text-amber-500" :
                      selectedHistoryTenant.status === "REMOVED" ? "text-slate-400" : "text-emerald-500"
                    } />
                    <span>
                      {selectedHistoryTenant.status === "REJECTED"
                        ? "Rejected On"
                        : selectedHistoryTenant.status === "REMOVED"
                        ? "Removed On"
                        : selectedHistoryTenant.status === "PENDING"
                        ? "Decision"
                        : "Approved On"}
                    </span>
                  </div>
                  <p className={`font-semibold text-sm ${
                    selectedHistoryTenant.status === "REJECTED" ? "text-red-500" :
                    selectedHistoryTenant.status === "PENDING" ? "text-amber-500" :
                    selectedHistoryTenant.status === "REMOVED" ? "text-slate-400" : "text-emerald-500"
                  }`}>
                    {selectedHistoryTenant.status === "REJECTED"
                      ? (selectedHistoryTenant.decision_at
                          ? new Date(selectedHistoryTenant.decision_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : selectedHistoryTenant.updated_at
                          ? new Date(selectedHistoryTenant.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : selectedHistoryTenant.created_at
                          ? new Date(selectedHistoryTenant.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : "—")
                      : selectedHistoryTenant.status === "REMOVED"
                      ? (selectedHistoryTenant.move_out_date
                          ? new Date(selectedHistoryTenant.move_out_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : selectedHistoryTenant.updated_at
                          ? new Date(selectedHistoryTenant.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : "—")
                      : selectedHistoryTenant.status === "PENDING"
                      ? "Under Verification"
                      : (selectedHistoryTenant.decision_at
                          ? new Date(selectedHistoryTenant.decision_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : selectedHistoryTenant.move_in_date
                          ? new Date(selectedHistoryTenant.move_in_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : "Active")}
                  </p>
                </div>
              </div>

              {/* Move In / Lease Info if available */}
              {(selectedHistoryTenant.move_in_date || selectedHistoryTenant.move_out_date) && (
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-(--divider) bg-black/5 dark:bg-white/[0.02] text-xs">
                  <div>
                    <span className="text-secondary block">Move-in Date</span>
                    <span className="font-semibold">{selectedHistoryTenant.move_in_date || "—"}</span>
                  </div>
                  <div>
                    <span className="text-secondary block">Move-out Date</span>
                    <span className="font-semibold">{selectedHistoryTenant.move_out_date || "—"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-(--divider) bg-black/5 dark:bg-white/[0.02] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryTenant(null)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Property Cards ── */}
      {activeSection === "properties" && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map((prop) => {
          const hasTenant       = !!prop.tenantData;
          const tenantStatus    = hasTenant ? prop.tenantData.User?.approval_status : null;
          const isRejected      = hasTenant && tenantStatus === "REJECTED";
          const rejectionReason = isRejected ? prop.tenantData.User?.rejection_reason : null;
          const isPending       = hasTenant && tenantStatus === "PENDING"  && prop.tenantData.is_current;
          const isApproved      = hasTenant && tenantStatus === "APPROVED" && prop.tenantData.is_current;
          const showSelfOccupied = !isPending && !isApproved;

          // ✅ Cleanly format flat label without repeating "Block" or prefix redundancy
          const flatLabel = formatFullFlatLabel(prop, t) || prop.flat_number || t("rpropUnknown");

          return (
            <div
              key={prop.flat_id}
              className="bg-card p-5 rounded-2xl border border-(--divider) hover:border-blue-500/30 transition-all"
            >
              {/* Top row */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{flatLabel}</h3>
                  <p className="text-xs text-secondary mt-1">
                    {t("rpropStatus")}{" "}
                    <span
                      className={
                        showSelfOccupied
                          ? "text-green-400 font-semibold"
                          : isPending
                          ? "text-blue-400 font-semibold"
                          : "text-blue-400 font-semibold"
                      }
                    >
                      {showSelfOccupied ? t("rpropSelfOccupied") : isPending ? t("rpropVerificationPending") : t("rpropRentedOut")}
                    </span>
                  </p>
                </div>

                {/* Add Tenant button */}
                {showSelfOccupied && (
                  <div className="flex flex-col items-end gap-2">
                    {isRejected && (
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded font-semibold border border-red-500/20">
                          {t("rpropPrevRejected")}
                        </span>
                        {rejectionReason && (
                          <span
                            className="text-[10px] text-red-400/80 mt-1 max-w-48 line-clamp-2"
                            title={rejectionReason}
                          >
                            <b className="text-red-400">{t("rpropReason")}</b> {rejectionReason}
                          </span>
                        )}
                      </div>
                    )}
                    <GlobalButton
                      variant="add"
                      size="xs"
                      icon={MdPersonAdd}
                      onClick={() => { setSelectedFlatId(prop.flat_id); setShowForm(true); }}
                    >
                      {t("rpropAddTenant")}
                    </GlobalButton>
                  </div>
                )}
              </div>

              {/* Pending Tenant */}
              {isPending && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <MdAccessTime size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-blue-400">{t("rpropUnderVerification", "Under Verification")}</p>
                        {prop.tenantData?.User?.name && (
                          <span className="text-xs font-bold text-primary">
                            • {prop.tenantData.User.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-secondary">{t("rpropUnderVerificationSub", "Tenant profile is waiting for Admin approval.")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => { setIsRenewing(false); setViewTenantData(prop.tenantData); }}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-0"
                    >
                      <MdVisibility size={15} />
                      <span>{t("rpropViewTenant", "View Details")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTenant(prop.tenantData.id, prop.flat_id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title={t("rpropCancelRequest", "Cancel Request")}
                    >
                      <MdClose size={15} />
                      <span className="hidden sm:inline">{t("cancel", "Cancel")}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Approved Tenant */}
              {isApproved && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <MdWarning size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-500">{t("rpropTenantOccupied")}</p>
                      <p className="text-[10px] text-secondary">{t("rpropTenantOccupiedSub")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setIsRenewing(false); setViewTenantData(prop.tenantData); }}
                    className="bg-blue-500/20 text-blue-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition-all"
                  >
{t("rpropViewTenant")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>}

      {/* ── ADD TENANT MODAL ── */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 9999 }}
          onClick={requestCloseAddTenant}
        >
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-scaleIn"
            style={{ background: "var(--card-bg)", border: "1px solid var(--divider, rgba(255,255,255,0.1))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 z-10 flex justify-between items-center p-5 border-b"
              style={{ background: "var(--card-bg)", borderColor: "var(--divider, rgba(255,255,255,0.1))" }}
            >
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t("rpropAddTenantDetails")}</h3>
              <button
                type="button"
                disabled={submitting}
                onClick={requestCloseAddTenant}
                className="text-secondary hover:opacity-80 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MdClose size={22} />
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="p-6 space-y-5">
              {/* Personal Info */}
              <div style={{ background: "var(--card-inner-bg)", padding: "14px", borderRadius: "12px", border: "1px solid var(--divider, rgba(255,255,255,0.05))" }}>
                <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">{t("rpropPersonalInfo")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">{t("rpropFullName")}</label><input required style={inputStyle} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">{t("rpropEmail")}</label><input required type="email" style={inputStyle} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">{t("rpropPhone")}</label><input required style={inputStyle} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                  <div>
                    <label className="text-[10px] text-secondary font-semibold uppercase block mb-1">{t("rpropTempPassword")}</label>
                    <div className="relative flex items-center">
                      <input
                        required
                        type={showPassword ? "text" : "password"}
                        style={{ ...inputStyle, paddingRight: "40px" }}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="e.g. Pass@123"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-2.5 text-secondary hover:text-accent transition-colors p-1 flex items-center justify-center cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lease & Occupancy */}
              <div style={{ background: "var(--card-inner-bg)", padding: "14px", borderRadius: "12px", border: "1px solid var(--divider, rgba(255,255,255,0.05))" }}>
                <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">{t("rpropLeaseOccupancy")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">{t("rpropLeaseStart")}</label><input required type="date" style={inputStyle} value={formData.move_in_date} onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })} /></div>
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">{t("rpropLeaseEnd")}</label><input required type="date" style={inputStyle} value={formData.move_out_date} onChange={(e) => setFormData({ ...formData, move_out_date: e.target.value })} /></div>
                </div>
              </div>

              {/* KYC Documents */}
              <div style={{ background: "var(--card-inner-bg)", padding: "14px", borderRadius: "12px", border: "1px solid var(--divider, rgba(255,255,255,0.05))" }}>
                <h4 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wider">{t("rpropKYCDocs")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DocumentUploadField
                    label={t("rpropAadhar")}
                    icon={MdBadge}
                    accept="application/pdf,image/*"
                    file={aadharFile}
                    onChange={setAadharFile}
                  />
                  <DocumentUploadField
                    label={t("rpropPAN")}
                    icon={MdCreditCard}
                    accept="application/pdf,image/*"
                    file={panFile}
                    onChange={setPanFile}
                  />
                </div>
              </div>

              <div className="pt-1">
                <GlobalButton
                  type="submit"
                  variant="add"
                  fullWidth
                  icon={MdPersonAdd}
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting ? "Submitting Tenant..." : t("rpropSubmitTenant")}
                </GlobalButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); setShowForm(false); }}
      />

      {/* ── VIEW TENANT MODAL ── */}
      {viewTenantData && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 9999 }}
          onClick={() => { setViewTenantData(null); setIsRenewing(false); }}
        >
          <div
            className="rounded-2xl w-full max-w-lg shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--card-bg)", border: "1px solid var(--divider, rgba(255,255,255,0.1))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: "var(--divider, rgba(255,255,255,0.1))" }}>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{t("rpropTenantProfile", "Tenant Details")}</h3>
                {viewTenantData.User?.approval_status === "PENDING" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                    <MdAccessTime size={12} className="animate-spin" />
                    <span>Under Verification</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                    <MdCheckCircle size={12} />
                    <span>Active Tenant</span>
                  </span>
                )}
              </div>
              <button type="button" onClick={() => { setViewTenantData(null); setIsRenewing(false); }} className="text-secondary hover:opacity-80 transition cursor-pointer border-0 bg-transparent">
                <MdClose size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Tenant Avatar & Info */}
              <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-bold shrink-0">
                  {viewTenantData.User?.name?.charAt(0) || "T"}
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg font-bold truncate">{viewTenantData.User?.name || "—"}</h4>
                  <p className="text-xs text-secondary truncate">
                    {viewTenantData.User?.email || "—"}
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    📞 {viewTenantData.User?.phone || "—"}
                  </p>
                </div>
              </div>

              {/* Lease Dates */}
              <div
                className="grid grid-cols-2 gap-4"
                style={{ background: "var(--card-inner-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--divider)" }}
              >
                <div>
                  <p className="text-[10px] text-secondary font-semibold uppercase">{t("rpropMoveIn", "Lease Start Date")}</p>
                  <p className="text-sm font-semibold">{viewTenantData.move_in_date || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary font-semibold uppercase">{t("rpropMoveOut", "Lease End Date")}</p>
                  <p className="text-sm font-semibold text-blue-400">{viewTenantData.move_out_date || "N/A"}</p>
                </div>
              </div>

              {/* KYC Documents */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider block">
                  {t("rpropKYCDocuments", "KYC Documents")}
                </label>
                {loadingDocs ? (
                  <div className="p-3 text-center text-xs text-secondary rounded-xl bg-card-inner-bg border border-glass-border">
                    Loading documents...
                  </div>
                ) : tenantDocs ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tenantDocs.aadhar_url ? (
                      <a
                        href={tenantDocs.aadhar_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-card-inner-bg border border-glass-border hover:border-blue-500/40 text-xs font-bold text-primary transition group no-underline"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MdBadge className="text-blue-500 shrink-0" size={18} />
                          <span className="truncate">{t("rpropAadhar", "Aadhar Card")}</span>
                        </div>
                        <MdOpenInNew className="text-secondary group-hover:text-blue-500 shrink-0" size={16} />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-card-inner-bg border border-glass-border text-xs text-secondary">
                        <MdBadge size={18} />
                        <span>Aadhar Card: Not Available</span>
                      </div>
                    )}

                    {tenantDocs.pan_url ? (
                      <a
                        href={tenantDocs.pan_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-card-inner-bg border border-glass-border hover:border-blue-500/40 text-xs font-bold text-primary transition group no-underline"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MdCreditCard className="text-purple-500 shrink-0" size={18} />
                          <span className="truncate">{t("rpropPAN", "PAN Card")}</span>
                        </div>
                        <MdOpenInNew className="text-secondary group-hover:text-purple-500 shrink-0" size={16} />
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-card-inner-bg border border-glass-border text-xs text-secondary">
                        <MdCreditCard size={18} />
                        <span>PAN Card: Not Available</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-secondary rounded-xl bg-card-inner-bg border border-glass-border">
                    No KYC documents uploaded
                  </div>
                )}
              </div>

              {/* Renewal / Actions */}
              {viewTenantData.User?.approval_status === "PENDING" ? (
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setViewTenantData(null); setIsRenewing(false); }}
                    className="flex-1 bg-card border border-glass-border py-2.5 rounded-xl text-xs font-bold hover:bg-white/5 transition cursor-pointer"
                  >
                    {t("close", "Close")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveTenant(viewTenantData.id, viewTenantData.flat_id);
                      setViewTenantData(null);
                    }}
                    className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-2.5 rounded-xl text-xs font-bold hover:bg-red-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MdClose size={16} />
                    <span>{t("rpropCancelRequest", "Cancel Request")}</span>
                  </button>
                </div>
              ) : isRenewing ? (
                <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl space-y-4 animate-scaleIn">
                  <div>
                    <label className="text-[10px] text-secondary font-semibold uppercase block mb-1">{t("rpropSelectNewLeaseEnd")}</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newLeaseDate}
                      onChange={(e) => setNewLeaseDate(e.target.value)}
                      min={viewTenantData.move_out_date || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsRenewing(false)} className="flex-1 bg-card border border-(--divider) py-2.5 rounded-xl text-xs font-bold hover:bg-white/5 transition">
                      {t("cancel")}
                    </button>
                    <button onClick={() => handleRenewLease(viewTenantData.id, viewTenantData.flat_id)} className="flex-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-500/30 transition">
                      {t("rpropConfirmRenewal")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setIsRenewing(true)} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-blue-500/20 transition-all cursor-pointer">
                    <MdAutorenew size={18} /> {t("rpropRenewLease")}
                  </button>
                  <button onClick={() => handleRemoveTenant(viewTenantData.id, viewTenantData.flat_id)} className="bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-red-500/20 transition-all cursor-pointer">
                    <MdDelete size={18} /> {t("rpropEndLease")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
