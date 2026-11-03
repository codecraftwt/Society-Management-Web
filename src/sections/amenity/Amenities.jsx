import { useEffect, useState, useMemo, useContext } from "react";
import { useLocation } from "react-router-dom";
import API from "../../services/api";
import { useLang } from "../../context/LanguageContext";
import { AuthContext } from "../../context/AuthContext";
import { isCommitteeMember, hasPermission } from "../../utils/permissions";
import { getTitleError, getPositiveAmountError, getNumberError } from "../../utils/validators";
import { useCustomAlert } from "../../context/CustomAlertContext";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";
import { isPaidAmenity, useIsMobile } from "./amenityHelpers.jsx";
import Index from "./index/Index";
import Create from "./create/Create";
import Disable from "./disable/Disable";
import { MdApartment } from "react-icons/md";

export default function Amenities() {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const { showUnauthorized, showWarning, showError, showSuccess } = useCustomAlert();
  const canEdit = !isCommitteeMember(user);
  const isSuperAdmin = (user?.activeRole || user?.role) === "SUPER_ADMIN";
  const [selectedSocietyId, setSelectedSocietyId] = useState(() => localStorage.getItem("superadmin_society_filter") || "");
  const [societies, setSocieties] = useState([]);
  const activeSocietyId = isSuperAdmin ? selectedSocietyId : (user?.society_id || "");

  const [amenities, setAmenities] = useState([]);
  const [groupedBookings, setGroupedBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);

  /* Unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showForm && canEdit);
  const requestCloseForm = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else { setShowForm(false); setEditingAmenity(null); }
  };
  const [activeTab, setActiveTab] = useState("AMENITIES");
  const [searchAmenity, setSearchAmenity] = useState("");
  const [isAmenSearchOpen, setIsAmenSearchOpen] = useState(false);
  const [amenityStatusFilter, setAmenityStatusFilter] = useState("ALL");
  const [amenityPricingFilter, setAmenityPricingFilter] = useState("ALL");
  const [searchBooking, setSearchBooking] = useState("");
  const [isBookingSearchOpen, setIsBookingSearchOpen] = useState(false);
  const [bookingFilter, setBookingFilter] = useState("ALL");
  const [amenFilterOpen, setAmenFilterOpen] = useState(false);
  const [amenFilterPos, setAmenFilterPos] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [disableModalAmenity, setDisableModalAmenity] = useState(null);

  const [form, setForm] = useState({
    name: "", type: "FREE", booking_type: "SLOT",
    rate_per_hour: 0, opening_time: "", closing_time: "",
    capacity: 1, requires_approval: false,
  });

  const loadAmenities = async () => {
    const societyId = isSuperAdmin ? selectedSocietyId : null;
    if (isSuperAdmin && (!societyId || societyId === "ALL")) { setAmenities([]); return; }
    const query = societyId && societyId !== "ALL" ? `?societyId=${encodeURIComponent(societyId)}` : "";
    const r = await API.get(`/amenities${query}`);
    const data = Array.isArray(r.data)
      ? r.data
      : Array.isArray(r.data?.data)
      ? r.data.data
      : Array.isArray(r.data?.amenities)
      ? r.data.amenities
      : [];
    setAmenities(data);
  };

  const loadBookings = async () => {
    try {
      const societyId = isSuperAdmin ? selectedSocietyId : null;
      if (isSuperAdmin && (!societyId || societyId === "ALL")) { setGroupedBookings([]); return; }
      const query = societyId && societyId !== "ALL" ? `?societyId=${encodeURIComponent(societyId)}` : "";
      const r = await API.get(`/admin/amenities/bookings${query}`);
      const data = Array.isArray(r.data)
        ? r.data
        : Array.isArray(r.data?.data)
        ? r.data.data
        : Array.isArray(r.data?.bookings)
        ? r.data.bookings
        : [];
      const seen = new Set();
      const unique = data.filter((b) => {
        if (!b?.id) return true;
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
      setGroupedBookings(unique);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      API.get("/societies").then((r) => setSocieties(Array.isArray(r.data) ? r.data : (r.data?.societies || r.data?.data || []))).catch(() => setSocieties([]));
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    const syncSociety = () => setSelectedSocietyId(localStorage.getItem("superadmin_society_filter") || "");
    window.addEventListener("superadmin-society-scope-change", syncSociety);
    return () => window.removeEventListener("superadmin-society-scope-change", syncSociety);
  }, []);

  useEffect(() => {
    if (isSuperAdmin && !activeSocietyId) return;
    loadAmenities();
    loadBookings();
    const reloadForSocietyScope = () => {
      loadAmenities();
      loadBookings();
    };
    window.addEventListener("superadmin-society-scope-change", reloadForSocietyScope);
    return () => window.removeEventListener("superadmin-society-scope-change", reloadForSocietyScope);
  }, [location.pathname, isSuperAdmin, activeSocietyId]);

  const handleToggleAddForm = () => {
    if (!showForm && !hasPermission(user, "amenities", "create")) {
      showUnauthorized("You do not have permission to add amenities.");
      return;
    }
    setEditingAmenity(null);
    setForm({ name: "", type: "FREE", booking_type: "SLOT", rate_per_hour: 0, opening_time: "", closing_time: "", capacity: 1, requires_approval: false });
    setShowForm(p => !p);
  };

  const handleToggleAmenFilter = (e) => {
    if (amenFilterOpen) { setAmenFilterOpen(false); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setAmenFilterPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 276)) });
    setAmenFilterOpen(true);
  };

  const activeFilterCount = (amenityStatusFilter !== "ALL" ? 1 : 0) + (amenityPricingFilter !== "ALL" ? 1 : 0);

  const handleOpenEditForm = (amenity) => {
    if (!hasPermission(user, "amenities", "edit")) {
      showUnauthorized("You do not have permission to edit amenities.");
      return;
    }
    setEditingAmenity(amenity);
    setForm({
      name: amenity.name || "",
      type: (amenity.type || "FREE").toUpperCase(),
      booking_type: amenity.booking_type || "SLOT",
      rate_per_hour: Number(amenity.rate_per_hour) || 0,
      opening_time: amenity.opening_time ? String(amenity.opening_time).slice(0, 5) : "",
      closing_time: amenity.closing_time ? String(amenity.closing_time).slice(0, 5) : "",
      capacity: Number(amenity.capacity) || 1,
      requires_approval: !!amenity.requires_approval,
    });
    setShowForm(true);
  };

  const submitAmenity = async () => {
    const canWrite = editingAmenity ? "edit" : "create";
    if (!hasPermission(user, "amenities", canWrite)) {
      showUnauthorized(`You do not have permission to ${canWrite} amenities.`);
      return;
    }
    setSubmitting(true);
    try {
      const nameErr = getTitleError(form.name, "Amenity name");
      if (nameErr) { showWarning(nameErr); setSubmitting(false); return; }
      const capErr = getNumberError(form.capacity, "Capacity", { min: 1, allowZero: false });
      if (capErr) { showWarning(capErr); setSubmitting(false); return; }
      if (form.type === "PAID") {
        const rateErr = getPositiveAmountError(form.rate_per_hour, "Rate per hour");
        if (rateErr) { showWarning(rateErr); setSubmitting(false); return; }
      }
      if (form.booking_type === "SLOT" && (!form.opening_time || !form.closing_time)) { showWarning(t("amenErrTime")); setSubmitting(false); return; }
      const payload = {
        name: form.name.trim(),
        type: form.type,
        booking_type: form.booking_type,
        rate_per_hour: form.type === "PAID" ? Number(form.rate_per_hour) : 0,
        opening_time: form.opening_time || null,
        closing_time: form.closing_time || null,
        capacity: Number(form.capacity),
        requires_approval: form.requires_approval,
      };
      if (editingAmenity) {
        await API.put(`/admin/amenities/${editingAmenity.id}`, payload);
      } else {
        await API.post("/admin/amenities", payload);
      }
      showSuccess(editingAmenity ? "Amenity updated successfully." : "Amenity created successfully.");
      loadAmenities();
      setShowForm(false);
      setEditingAmenity(null);
      setForm({ name: "", type: "FREE", booking_type: "SLOT", rate_per_hour: 0, opening_time: "", closing_time: "", capacity: 1, requires_approval: false });
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || (editingAmenity ? "Failed to update amenity" : "Failed to create amenity"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReEnable = async (id) => {
    if (!hasPermission(user, "amenities", "edit")) {
      showUnauthorized("You do not have permission to toggle amenities.");
      return;
    }
    setTogglingId(id);
    try { await API.patch(`/admin/amenities/${id}/toggle`); await loadAmenities(); }
    catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to toggle amenity status");
      }
    }
    finally { setTogglingId(null); }
  };

  const approveBooking = async (b) => {
    if (!hasPermission(user, "amenities", "manage_bookings")) {
      showUnauthorized("You do not have permission to manage bookings.");
      return;
    }
    const id = b.booking_ids?.[0] ?? b.id;
    setApprovingId(id);
    try {
      await API.put(`/admin/amenities/bookings/${id}/approve`,
        b.booking_ids?.length ? { booking_ids: b.booking_ids } : undefined
      );
      await loadBookings();
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to approve booking");
      }
    }
    finally { setApprovingId(null); }
  };

  const rejectBooking = async (b) => {
    if (!hasPermission(user, "amenities", "manage_bookings")) {
      showUnauthorized("You do not have permission to manage bookings.");
      return;
    }
    const id = b.booking_ids?.[0] ?? b.id;
    setRejectingId(id);
    try {
      await API.put(`/admin/amenities/bookings/${id}/reject`,
        b.booking_ids?.length ? { booking_ids: b.booking_ids } : undefined
      );
      await loadBookings();
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Failed to reject booking");
      }
    }
    finally { setRejectingId(null); }
  };

  const handleOpenDisableModal = (amenity) => {
    if (!hasPermission(user, "amenities", "delete")) {
      showUnauthorized("You do not have permission to disable amenities.");
      return;
    }
    setDisableModalAmenity(amenity);
  };

  const handleDisableConfirm = async (payload) => {
    if (!hasPermission(user, "amenities", "delete")) {
      showUnauthorized("You do not have permission to disable amenities.");
      setDisableModalAmenity(null);
      return;
    }
    try {
      await API.patch(`/admin/amenities/${disableModalAmenity.id}/disable`, payload);
      showSuccess("Amenity disabled successfully.");
      await loadAmenities();
      await loadBookings(); // refresh — PAYMENT_PENDING rows may now be CANCELLED
    } catch (e) {
      if (e.response?.status === 403) {
        showUnauthorized(e.response?.data?.message || "Operation restricted");
      } else {
        showError(e.response?.data?.message || "Could not disable amenity. Please try again.");
      }
    } finally {
      setDisableModalAmenity(null);
    }
  };

  const filteredAmenities = useMemo(() =>
    amenities.filter(a =>
      a.name.toLowerCase().includes(searchAmenity.toLowerCase()) &&
      (amenityStatusFilter === "ALL" || (amenityStatusFilter === "ACTIVE" ? !!a.is_active : !a.is_active)) &&
      (amenityPricingFilter === "ALL" || (isPaidAmenity(a) ? "PAID" : "FREE") === amenityPricingFilter)
    ),
    [amenities, searchAmenity, amenityStatusFilter, amenityPricingFilter]
  );

  const filteredBookings = useMemo(() =>
    [...groupedBookings]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter(b => {
        const q = searchBooking.toLowerCase().trim();
        const range = b.to_date && b.to_date !== b.from_date ? `${b.from_date} – ${b.to_date}` : b.from_date || b.date;
        const flat = b.Flat || b.User?.Flat;
        const flatNum = (flat?.flat_number || "").toLowerCase();
        const blockName = (flat?.Block?.name || "").toLowerCase();
        const phone = (b.User?.phone || "").toLowerCase();
        const email = (b.User?.email || "").toLowerCase();
        const ms =
          !q ||
          b.Amenity?.name?.toLowerCase().includes(q) ||
          b.User?.name?.toLowerCase().includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          flatNum.includes(q) ||
          blockName.includes(q) ||
          (b.from_date || b.date || "")?.includes(q) ||
          (b.to_date || "")?.includes(q) ||
          range?.includes(q);
        const mf = bookingFilter === "ALL" || b.status === bookingFilter;
        return ms && mf;
      }),
    [groupedBookings, searchBooking, bookingFilter]
  );

  const bStats = {
    total: groupedBookings.length,
    paymentPending: groupedBookings.filter(b => b.status === "PAYMENT_PENDING").length,
    pending: groupedBookings.filter(b => b.status === "PENDING").length,
    approved: groupedBookings.filter(b => b.status === "APPROVED").length,
    rejected: groupedBookings.filter(b => b.status === "REJECTED").length,
  };

  if (isSuperAdmin && !activeSocietyId) {
    return <div className="card" style={{ padding: 48, textAlign: "center", borderRadius: 18, border: "1px solid var(--glass-border)", background: "var(--card-bg)" }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(160, 90, 255, 0.12)", border: "1px solid rgba(160, 90, 255, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", margin: "0 auto 16px" }}><MdApartment size={28} /></div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Select a Society</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 440, margin: "8px auto 18px" }}>Please select a society from the dropdown above to view and manage its amenities.</p>
      <select className="input sa-society-select" value={selectedSocietyId} onChange={(e) => { const value = e.target.value; setSelectedSocietyId(value); localStorage.setItem("superadmin_society_filter", value); window.dispatchEvent(new Event("superadmin-society-scope-change")); }} style={{ minWidth: 240, height: 40 }}>
        <option value="">Select Society</option><option value="ALL">All Societies</option>{societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }} className="animate-fadeIn">

      <Index
        activeTab={activeTab}
        onTabChange={setActiveTab}
        amenities={amenities}
        groupedBookings={groupedBookings}
        bStats={bStats}
        canEdit={canEdit}
        isMobile={isMobile}
        searchAmenity={searchAmenity}
        onSearchAmenity={setSearchAmenity}
        isAmenSearchOpen={isAmenSearchOpen}
        onAmenSearchOpen={setIsAmenSearchOpen}
        searchBooking={searchBooking}
        onSearchBooking={setSearchBooking}
        isBookingSearchOpen={isBookingSearchOpen}
        onBookingSearchOpen={setIsBookingSearchOpen}
        bookingFilter={bookingFilter}
        onBookingFilter={setBookingFilter}
        amenFilterOpen={amenFilterOpen}
        amenFilterPos={amenFilterPos}
        onToggleAmenFilter={handleToggleAmenFilter}
        onCloseAmenFilter={() => setAmenFilterOpen(false)}
        activeFilterCount={activeFilterCount}
        amenityStatusFilter={amenityStatusFilter}
        onAmenityStatusFilter={setAmenityStatusFilter}
        amenityPricingFilter={amenityPricingFilter}
        onAmenityPricingFilter={setAmenityPricingFilter}
        onClearAmenFilters={() => { setAmenityStatusFilter("ALL"); setAmenityPricingFilter("ALL"); }}
        showForm={showForm}
        onToggleAddForm={handleToggleAddForm}
        filteredAmenities={filteredAmenities}
        filteredBookings={filteredBookings}
        togglingId={togglingId}
        approvingId={approvingId}
        rejectingId={rejectingId}
        onDisable={handleOpenDisableModal}
        onReEnable={handleReEnable}
        onApprove={approveBooking}
        onReject={rejectBooking}
        onEdit={handleOpenEditForm}
        isSuperAdmin={isSuperAdmin}
        societiesList={societies}
        selectedSocietyId={selectedSocietyId}
        onSocietyChange={(value) => {
          setSelectedSocietyId(value);
          localStorage.setItem("superadmin_society_filter", value || "ALL");
          window.dispatchEvent(new Event("superadmin-society-scope-change"));
        }}
      />

      <Disable
        isOpen={!!disableModalAmenity}
        amenity={disableModalAmenity}
        onClose={() => setDisableModalAmenity(null)}
        onConfirm={handleDisableConfirm}
      />

      {canEdit && showForm && (
        <Create
          isMobile={isMobile}
          editingAmenity={editingAmenity}
          form={form}
          setForm={setForm}
          submitting={submitting}
          requestCloseForm={requestCloseForm}
          submitAmenity={submitAmenity}
          markDirty={() => { dirtyRef.current = true; }}
        />
      )}

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); setShowForm(false); setEditingAmenity(null); }}
      />
    </div>
  );
}
