import { useEffect, useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import {
  MdHome, MdPersonAdd, MdWarning, MdClose, MdCheck,
  MdBadge, MdCreditCard, MdDelete, MdAccessTime, MdAutorenew
} from "react-icons/md";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

/* ─────────────────────────────────────────────
   Document Upload Field
───────────────────────────────────────────── */
function DocumentUploadField({ label, icon: Icon, accept, file, onChange }) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="text-[10px] text-secondary font-semibold uppercase tracking-wider mb-1 block">
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border-2 border-dashed p-3 flex items-center gap-3 cursor-pointer transition-all"
        style={{
          background: file ? "rgba(34,197,94,0.1)" : "var(--card-inner-bg, rgba(255,255,255,0.03))",
          borderColor: file ? "rgba(34,197,94,0.5)" : "var(--divider, rgba(255,255,255,0.1))"
        }}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${file ? "bg-green-500/20 text-green-500" : "bg-blue-500/10 text-blue-500"}`}>
          {file ? <MdCheck size={18} /> : <Icon size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: file ? "#4ade80" : "var(--text-primary, #fff)" }}>
            {file ? file.name : "Click to upload"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function MyProperties() {
  const { user } = useContext(AuthContext);
  const [properties, setProperties]   = useState([]);
  const [loading, setLoading]         = useState(true);

  // Tenant Add Form
  const [showForm, setShowForm]             = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "",
    vehicle_count: 0, occupant_count: 1,
    move_in_date: "", move_out_date: ""
  });
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile]       = useState(null);

  // View Tenant Modal
  const [viewTenantData, setViewTenantData] = useState(null);
  const [isRenewing, setIsRenewing]         = useState(false);
  const [newLeaseDate, setNewLeaseDate]     = useState("");

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
      const flats   = Array.isArray(flatRes.data) ? flatRes.data : [];

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
            const latestTenant = memberships.find((m) => m.role === "TENANT") || null;
            return { ...flat, tenantData: latestTenant };
          } catch {
            return { ...flat, tenantData: null };
          }
        })
      );

      setProperties(enriched);
    } catch (err) {
      console.error("[MyProperties] loadProperties error:", err);
      toast.error("Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadProperties();
  }, [user]);

  /* ─────────────────────────────────────────
     Handlers
  ───────────────────────────────────────── */
  const handleAddTenant = async (e) => {
    e.preventDefault();
    if (!aadharFile || !panFile)
      return toast.error("Please upload both Aadhar and PAN documents.");

    setSubmitting(true);
    try {
      const res       = await API.post("/users/resident/add-tenant", { flat_id: selectedFlatId, ...formData });
      const newUserId = res.data.tenant.id;

      const docForm = new FormData();
      docForm.append("aadhar", aadharFile);
      docForm.append("pan",    panFile);

      await API.post(`/user-documents?userId=${newUserId}`, docForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Tenant added & documents uploaded! Awaiting Admin verification.");
      setShowForm(false);
      setFormData({ name: "", email: "", phone: "", password: "", vehicle_count: 0, occupant_count: 1, move_in_date: "", move_out_date: "" });
      setAadharFile(null);
      setPanFile(null);
      loadProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add tenant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTenant = async (tenantMembershipId, flatId) => {
    if (!window.confirm("Are you sure you want to remove this tenant? This will revoke their access.")) return;
    try {
      await API.post("/users/resident/remove-tenant", {
        flat_id:              flatId,
        tenant_membership_id: tenantMembershipId,
      });
      toast.success("Tenant removed successfully.");
      setViewTenantData(null);
      setIsRenewing(false);
      loadProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove tenant.");
    }
  };

  const handleRenewLease = async (tenantMembershipId, flatId) => {
    if (!newLeaseDate) return toast.error("Please select a new lease end date.");
    try {
      await API.post("/users/resident/renew-tenant", {
        flat_id:              flatId,
        tenant_membership_id: tenantMembershipId,
        new_move_out_date:    newLeaseDate,
      });
      toast.success("Lease renewed successfully!");
      setIsRenewing(false);
      setNewLeaseDate("");
      setViewTenantData(null);
      loadProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to renew lease.");
    }
  };

  /* ─────────────────────────────────────────
     Styles
  ───────────────────────────────────────── */
  const inputStyle = {
    background:   "var(--bg-default, #151521)",
    border:       "1px solid var(--divider, rgba(255,255,255,0.1))",
    color:        "var(--text-primary, #ffffff)",
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

  if (properties.length === 0)
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <MdHome size={32} />
        </div>
        <h3 className="text-lg font-semibold">No Properties Found</h3>
        <p className="text-secondary text-sm max-w-xs">
          You don't have any flats assigned as owner yet. Contact your society admin.
        </p>
      </div>
    );

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <MdHome size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">My Properties</h2>
          <p className="text-secondary text-xs">Manage your flats and tenants</p>
        </div>
      </div>

      {/* ── Property Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map((prop) => {
          const hasTenant       = !!prop.tenantData;
          const tenantStatus    = hasTenant ? prop.tenantData.User?.approval_status : null;
          const isRejected      = hasTenant && tenantStatus === "REJECTED";
          const rejectionReason = isRejected ? prop.tenantData.User?.rejection_reason : null;
          const isPending       = hasTenant && tenantStatus === "PENDING"  && prop.tenantData.is_current;
          const isApproved      = hasTenant && tenantStatus === "APPROVED" && prop.tenantData.is_current;
          const showSelfOccupied = !isPending && !isApproved;

          // ✅ flat_number / block_name / floor_number come directly from get-flat
          const flatNumber  = prop.flat_number  || "Unknown";
          const blockName   = prop.block_name   ? `Block ${prop.block_name}` : "";
          const floorLabel  = prop.floor_number != null ? `Floor ${prop.floor_number}` : "";
          const flatLabel   = [blockName, floorLabel, `Flat ${flatNumber}`].filter(Boolean).join(", ");

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
                    Status:{" "}
                    <span
                      className={
                        showSelfOccupied
                          ? "text-green-400 font-semibold"
                          : isPending
                          ? "text-blue-400 font-semibold"
                          : "text-amber-400 font-semibold"
                      }
                    >
                      {showSelfOccupied ? "Self-Occupied" : isPending ? "Tenant Verification Pending" : "Rented Out"}
                    </span>
                  </p>
                </div>

                {/* Add Tenant button */}
                {showSelfOccupied && (
                  <div className="flex flex-col items-end gap-2">
                    {isRejected && (
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded font-semibold border border-red-500/20">
                          Previous Request Rejected
                        </span>
                        {rejectionReason && (
                          <span
                            className="text-[10px] text-red-400/80 mt-1 max-w-48 line-clamp-2"
                            title={rejectionReason}
                          >
                            <b className="text-red-400">Reason:</b> {rejectionReason}
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => { setSelectedFlatId(prop.flat_id); setShowForm(true); }}
                      className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-green-500/20 transition-all"
                    >
                      <MdPersonAdd size={14} /> Add Tenant
                    </button>
                  </div>
                )}
              </div>

              {/* Pending Tenant */}
              {isPending && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <MdAccessTime size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-400">Under Verification</p>
                      <p className="text-[10px] text-secondary">Tenant profile is waiting for Admin approval.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveTenant(prop.tenantData.id, prop.flat_id)}
                    className="bg-red-500/10 text-red-500 border border-red-500/20 p-2 rounded-lg hover:bg-red-500/20 transition"
                    title="Cancel Request"
                  >
                    <MdClose size={18} />
                  </button>
                </div>
              )}

              {/* Approved Tenant */}
              {isApproved && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                      <MdWarning size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-500">Tenant Occupied</p>
                      <p className="text-[10px] text-secondary">You are not living here.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setIsRenewing(false); setViewTenantData(prop.tenantData); }}
                    className="bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition-all"
                  >
                    View Tenant
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── ADD TENANT MODAL ── */}
      {showForm && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 9999 }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-scaleIn"
            style={{ background: "var(--card-bg, #1e1e2d)", border: "1px solid var(--divider, rgba(255,255,255,0.1))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 z-10 flex justify-between items-center p-5 border-b"
              style={{ background: "var(--card-bg, #1e1e2d)", borderColor: "var(--divider, rgba(255,255,255,0.1))" }}
            >
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary, #fff)" }}>Add Tenant Details</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-secondary hover:text-white transition">
                <MdClose size={22} />
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="p-6 space-y-5">
              {/* Personal Info */}
              <div style={{ background: "var(--card-inner-bg, rgba(255,255,255,0.02))", padding: "14px", borderRadius: "12px", border: "1px solid var(--divider, rgba(255,255,255,0.05))" }}>
                <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">Full Name</label><input required style={inputStyle} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">Email</label><input required type="email" style={inputStyle} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">Phone</label><input required style={inputStyle} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">Temp Password</label><input required type="password" style={inputStyle} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>
                </div>
              </div>

              {/* Lease & Occupancy */}
              <div style={{ background: "var(--card-inner-bg, rgba(255,255,255,0.02))", padding: "14px", borderRadius: "12px", border: "1px solid var(--divider, rgba(255,255,255,0.05))" }}>
                <h4 className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">Lease & Occupancy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">Lease Start Date</label><input required type="date" style={inputStyle} value={formData.move_in_date} onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })} /></div>
                  <div><label className="text-[10px] text-secondary font-semibold uppercase block mb-1">Lease End Date</label><input required type="date" style={inputStyle} value={formData.move_out_date} onChange={(e) => setFormData({ ...formData, move_out_date: e.target.value })} /></div>
                </div>
              </div>

              {/* KYC Documents */}
              <div style={{ background: "var(--card-inner-bg, rgba(255,255,255,0.02))", padding: "14px", borderRadius: "12px", border: "1px solid var(--divider, rgba(255,255,255,0.05))" }}>
                <h4 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wider">KYC Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DocumentUploadField label="Aadhar Card" icon={MdBadge}     accept="application/pdf,image/*" file={aadharFile} onChange={setAadharFile} />
                  <DocumentUploadField label="PAN Card"    icon={MdCreditCard} accept="application/pdf,image/*" file={panFile}    onChange={setPanFile}    />
                </div>
              </div>

              <div className="pt-1">
                <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm flex justify-center items-center gap-2">
                  {submitting ? "Uploading Documents & Saving..." : <><MdPersonAdd size={18} /> Submit Tenant</>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── VIEW TENANT MODAL ── */}
      {viewTenantData && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 9999 }}
          onClick={() => { setViewTenantData(null); setIsRenewing(false); }}
        >
          <div
            className="rounded-2xl w-full max-w-md shadow-2xl animate-scaleIn"
            style={{ background: "var(--card-bg, #1e1e2d)", border: "1px solid var(--divider, rgba(255,255,255,0.1))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b" style={{ borderColor: "var(--divider, rgba(255,255,255,0.1))" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary, #fff)" }}>Tenant Profile</h3>
              <button type="button" onClick={() => { setViewTenantData(null); setIsRenewing(false); }} className="text-secondary hover:text-white transition">
                <MdClose size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Tenant Avatar */}
              <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-bold">
                  {viewTenantData.User?.name?.charAt(0) || "T"}
                </div>
                <div>
                  <h4 className="text-lg font-bold">{viewTenantData.User?.name || "—"}</h4>
                  <p className="text-xs text-secondary">
                    {viewTenantData.User?.email || "—"} • {viewTenantData.User?.phone || "—"}
                  </p>
                </div>
              </div>

              {/* Lease Dates */}
              <div
                className="grid grid-cols-2 gap-4"
                style={{ background: "var(--card-inner-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--divider)" }}
              >
                <div>
                  <p className="text-[10px] text-secondary font-semibold uppercase">Move-In Date</p>
                  <p className="text-sm font-semibold">{viewTenantData.move_in_date || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-secondary font-semibold uppercase">Move-Out Date</p>
                  <p className="text-sm font-semibold text-blue-400">{viewTenantData.move_out_date || "N/A"}</p>
                </div>
              </div>

              {/* Renewal / Actions */}
              {isRenewing ? (
                <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl space-y-4 animate-scaleIn">
                  <div>
                    <label className="text-[10px] text-secondary font-semibold uppercase block mb-1">Select New Lease End Date</label>
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
                      Cancel
                    </button>
                    <button onClick={() => handleRenewLease(viewTenantData.id, viewTenantData.flat_id)} className="flex-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-500/30 transition">
                      Confirm Renewal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setIsRenewing(true)} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-blue-500/20 transition-all">
                    <MdAutorenew size={18} /> Renew Lease
                  </button>
                  <button onClick={() => handleRemoveTenant(viewTenantData.id, viewTenantData.flat_id)} className="bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-red-500/20 transition-all">
                    <MdDelete size={18} /> End Lease
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