import React, { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { AuthContext } from "../../context/AuthContext";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  MdClose,
  MdPerson,
  MdEmail,
  MdPhone,
  MdHome,
  MdDirectionsCar,
  MdPeople,
  MdContactPhone,
  MdApartment,
  MdHomeWork,
  MdBadge,
  MdCreditCard,
  MdCheckCircle,
  MdOpenInNew,
  MdEdit,
  MdCheck,
  MdWarning,
} from "react-icons/md";
import UserAvatar from "../../components/common/UserAvatar";

export default function ResidentDetailsModal({ resident, onClose, onEdit, isSuperAdmin, onUpdated }) {
  if (!resident) return null;

  const { user } = useContext(AuthContext);
  const isSuper = isSuperAdmin || user?.activeRole === "SUPER_ADMIN" || user?.role === "SUPER_ADMIN";
  const currentSocId = user?.society_id;

  const [actionLoading, setActionLoading] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [rejectingRow, setRejectingRow] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const handleRowApprove = async (row) => {
    setActionLoading(row.rowKey);
    try {
      await API.put(`/admin/approve-resident/${resident.id}`, { society_id: row.societyId });
      toast.success(`${resident.name || "Resident"} approved for ${row.societyName}`);
      setStatusOverrides((prev) => ({ ...prev, [row.rowKey]: "ACTIVE" }));
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve registration");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowReject = async () => {
    if (!rejectingRow) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    setRejectLoading(true);
    try {
      const { data } = await API.put(`/admin/reject-resident/${resident.id}`, {
        society_id: rejectingRow.societyId,
        reason,
      });
      toast.success(`Registration rejected for ${rejectingRow.societyName}`);
      if (data && data.emailSent === false) {
        toast.warning("Rejection email could not be delivered");
      }
      setStatusOverrides((prev) => ({ ...prev, [rejectingRow.rowKey]: "REJECTED" }));
      setRejectingRow(null);
      setRejectReason("");
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject registration");
    } finally {
      setRejectLoading(false);
    }
  };

  // Profile photo source resolution
  const avatarSrc =
    resident.profile_picture ||
    resident.profile_photo ||
    resident.avatar ||
    resident.photo_url ||
    null;

  // Normalize emergency contact
  let ec = resident.emergency_contact;
  if (typeof ec === "string") {
    try {
      ec = JSON.parse(ec);
    } catch {
      ec = null;
    }
  }
  const ecName = ec?.name || resident.emergency_contact_name || "";
  const ecPhone = ec?.phone || resident.emergency_contact_phone || "";
  const hasEmergencyContact = Boolean(ecName || ecPhone);

  // Normalize documents
  const aadharUrl = resident.documents?.aadhar_url || resident.aadhar_url || null;
  const panUrl = resident.documents?.pan_url || resident.pan_url || null;

  // Normalize societies
  const rawSocieties = Array.isArray(resident.societies) && resident.societies.length > 0
    ? resident.societies
    : [
        {
          id: resident.society_id,
          name: resident.society_name || "Assigned Society",
          membership_status: resident.membership_status || "ACTIVE",
          flats: Array.isArray(resident.flats) && resident.flats.length > 0
            ? resident.flats.map((f) => ({
                id: f.id || f.flat_id,
                flat_number: f.flat_number,
                flat_type: f.flat_type,
                floor_number: f.floor_number ?? f.Floor?.floor_number,
                block_name: f.block_name ?? f.Floor?.Block?.name ?? f.Block?.name,
                role: f.role || resident.resident_type || "OWNER",
              }))
            : resident.flat_number
            ? [
                {
                  id: resident.flat_id,
                  flat_number: resident.flat_number,
                  flat_type: resident.flat_type,
                  floor_number: resident.floor_number,
                  block_name: resident.block_name,
                  role: resident.resident_type || "OWNER",
                },
              ]
            : [],
        },
      ];

  // If not super admin, strictly scope societies to the admin's society
  const societies = !isSuper && currentSocId
    ? rawSocieties.filter((s) => String(s.id) === String(currentSocId))
    : rawSocieties;

  // Normalize roles: if not super admin, only show roles this user has in the current society
  let rolesList = [];
  if (!isSuper && currentSocId) {
    const thisSoc = rawSocieties.find((s) => String(s.id) === String(currentSocId));
    if (thisSoc && Array.isArray(thisSoc.roles) && thisSoc.roles.length > 0) {
      rolesList = thisSoc.roles;
    } else if (Array.isArray(resident.roles) && resident.roles.length > 0) {
      rolesList = resident.roles;
    } else {
      rolesList = ["RESIDENT"];
    }
  } else {
    if (Array.isArray(resident.roles) && resident.roles.length > 0) {
      rolesList = resident.roles;
    } else if (typeof resident.roles === "string") {
      try {
        const parsed = JSON.parse(resident.roles);
        if (Array.isArray(parsed)) rolesList = parsed;
        else rolesList = [resident.roles];
      } catch {
        rolesList = [resident.roles];
      }
    } else if (resident.role) {
      rolesList = [resident.role];
    }
  }
  if (rolesList.length === 0) rolesList = ["RESIDENT"];

  // Flatten societies & flats into compact tabular rows
  const tableRows = [];
  const occupancyHistory = Array.isArray(resident.occupancy_history) ? resident.occupancy_history : [];

  societies.forEach((soc) => {
    const isPrimary = soc.is_default || soc.id === resident.society_id;
    const socRoles = Array.isArray(soc.roles) ? soc.roles : [];
    if (Array.isArray(soc.flats) && soc.flats.length > 0) {
      soc.flats.forEach((flat, fIdx) => {
        tableRows.push({
          rowKey: `${soc.id || "soc"}-${flat.id || fIdx}`,
          societyId: soc.id,
          societyName: soc.name || "Society",
          membershipStatus: soc.membership_status || "ACTIVE",
          isPrimary,
          socRoles,
          flatId: flat.id,
          flatNumber: flat.flat_number,
          flatType: flat.flat_type,
          floorNumber: flat.floor_number,
          blockName: flat.block_name,
          role: flat.role || resident.resident_type || "OWNER",
          isVacated: false,
        });
      });
    } else {
      // Check if there are past flat records for this society
      const socPastFlats = occupancyHistory.filter((h) => !h.society_id || Number(h.society_id) === Number(soc.id));
      if (socPastFlats.length > 0) {
        socPastFlats.forEach((pastFlat, pIdx) => {
          tableRows.push({
            rowKey: `${soc.id || "soc"}-past-${pastFlat.flat_id || pIdx}`,
            societyId: soc.id,
            societyName: soc.name || "Society",
            membershipStatus: "VACATED",
            isPrimary,
            socRoles,
            flatId: pastFlat.flat_id,
            flatNumber: pastFlat.flat_number,
            flatType: pastFlat.flat_type,
            floorNumber: pastFlat.floor_number,
            blockName: pastFlat.block_name,
            role: pastFlat.role || resident.resident_type || "RESIDENT",
            isVacated: true,
            moveInDate: pastFlat.move_in_date,
            moveOutDate: pastFlat.move_out_date,
          });
        });
      } else {
        tableRows.push({
          rowKey: `${soc.id || "soc"}-none`,
          societyId: soc.id,
          societyName: soc.name || "Society",
          membershipStatus: soc.membership_status || "ACTIVE",
          isPrimary,
          socRoles,
          flatNumber: null,
          flatType: null,
          floorNumber: null,
          blockName: null,
          role: null,
          isVacated: false,
        });
      }
    }
  });

  // Also include any past flats from occupancyHistory for societies not in the societies list
  // A flat can have old occupancy-history rows after it is assigned again.
  // Do not render that history as a "Past Flat" while the same flat is active.
  const activeFlatIds = new Set(
    tableRows
      .filter((r) => !r.isVacated && r.flatId != null)
      .map((r) => String(r.flatId))
  );
  const seenPastFlatKeys = new Set(
    tableRows
      .filter((r) => r.isVacated)
      .map((r) => `${r.societyId || ""}-${r.flatId || r.flatNumber || ""}`)
  );
  occupancyHistory.forEach((pastFlat, pIdx) => {
    const pastFlatKey = `${pastFlat.society_id || ""}-${pastFlat.flat_id || pastFlat.flat_number || ""}`;
    if (
      pastFlat.flat_id != null && activeFlatIds.has(String(pastFlat.flat_id))
    ) return;
    if (!seenPastFlatKeys.has(pastFlatKey)) {
      seenPastFlatKeys.add(pastFlatKey);
      tableRows.push({
        rowKey: `past-extra-${pastFlat.flat_id || pIdx}`,
        societyId: pastFlat.society_id,
        societyName: pastFlat.society_name || resident.society_name || "Society",
        membershipStatus: "VACATED",
        isPrimary: false,
        socRoles: ["RESIDENT"],
        flatNumber: pastFlat.flat_number,
        flatId: pastFlat.flat_id,
        flatType: pastFlat.flat_type,
        floorNumber: pastFlat.floor_number,
        blockName: pastFlat.block_name,
        role: pastFlat.role || "RESIDENT",
        isVacated: true,
        moveInDate: pastFlat.move_in_date,
        moveOutDate: pastFlat.move_out_date,
      });
    }
  });

  const committeeSociety = societies.find((s) => (s.roles || []).includes("COMMITTEE_MEMBER"));

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(5px)",
        padding: "14px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card-bg, #181c2a)",
          borderRadius: 16,
          border: "1px solid var(--divider, rgba(255,255,255,0.1))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          width: "100%",
          maxWidth: 740,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--text-primary, #ffffff)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--divider, rgba(255,255,255,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(107,70,193,0.2) 0%, rgba(59,130,246,0.2) 100%)",
                border: "1px solid rgba(107,70,193,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent, #a78bfa)",
              }}
            >
              <MdPerson size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Resident Profile Details
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary, rgba(255,255,255,0.6))" }}>
                Personal Info · Household Details · Multi-Society Flat Assignments · KYC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-secondary, rgba(255,255,255,0.7))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.color = "var(--text-secondary, rgba(255,255,255,0.7))";
            }}
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* SECTION 1: PERSONAL INFORMATION (CLEAR, SEPARATED & POLISHED) */}
          <div
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
              borderRadius: 12,
              border: "1px solid var(--divider, rgba(255,255,255,0.08))",
              padding: "16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {/* AVATAR */}
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <UserAvatar
                name={resident.name}
                src={avatarSrc}
                size={62}
                radius="14px"
              />
            </div>

            <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Name & Status / Approval badges with explicit separation */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary, #ffffff)", letterSpacing: "-0.01em" }}>
                  {resident.name}
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {resident.status && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 20,
                        background:
                          resident.status === "ACTIVE"
                            ? "rgba(34,197,94,0.14)"
                            : "rgba(239,68,68,0.14)",
                        color: resident.status === "ACTIVE" ? "#4ade80" : "#f87171",
                        border: `1px solid ${
                          resident.status === "ACTIVE"
                            ? "rgba(34,197,94,0.3)"
                            : "rgba(239,68,68,0.3)"
                        }`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: resident.status === "ACTIVE" ? "#4ade80" : "#f87171" }} />
                      {resident.status}
                    </span>
                  )}
                  {resident.approval_status && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 20,
                        background:
                          resident.approval_status === "APPROVED"
                            ? "rgba(59,130,246,0.14)"
                            : "rgba(245,158,11,0.14)",
                        color:
                          resident.approval_status === "APPROVED" ? "#60a5fa" : "#fbbf24",
                        border: `1px solid ${
                          resident.approval_status === "APPROVED"
                            ? "rgba(59,130,246,0.3)"
                            : "rgba(245,158,11,0.3)"
                        }`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {resident.approval_status === "APPROVED" ? "✓" : "⏳"} {resident.approval_status}
                    </span>
                  )}
                  {(resident.is_vacated || resident.occupancy_status === "VACATED") && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 20,
                        background: "rgba(245,158,11,0.16)",
                        color: "#f59e0b",
                        border: "1px solid rgba(245,158,11,0.35)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      Left / Vacated
                    </span>
                  )}
                </div>
              </div>

              {/* Email & Phone Contact Row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary, rgba(255,255,255,0.75))" }}>
                  <MdEmail size={15} style={{ color: "var(--accent, #a78bfa)", flexShrink: 0 }} />
                  <a
                    href={`mailto:${resident.email}`}
                    style={{ color: "inherit", textDecoration: "none", fontWeight: 500 }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {resident.email}
                  </a>
                </div>
                {resident.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary, rgba(255,255,255,0.75))" }}>
                    <MdPhone size={15} style={{ color: "#34d399", flexShrink: 0 }} />
                    <a
                      href={`tel:${resident.phone}`}
                      style={{ color: "inherit", textDecoration: "none", fontWeight: 500 }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {resident.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Explicit Labeling for Resident Type & Roles (NO MORE OWNERRESIDENT GLUE) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                {resident.resident_type && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      padding: "3px 9px",
                      borderRadius: 6,
                      background: "rgba(107,70,193,0.12)",
                      color: "var(--accent, #a78bfa)",
                      border: "1px solid rgba(107,70,193,0.25)",
                    }}
                  >
                    <span style={{ fontSize: 10, color: "var(--text-secondary, rgba(255,255,255,0.5))", textTransform: "uppercase", fontWeight: 600 }}>
                      Type:
                    </span>
                    <span style={{ fontWeight: 700, textTransform: "uppercase" }}>
                      {resident.resident_type}
                    </span>
                  </div>
                )}
                {rolesList.map((role) => {
                  const isCommittee = role === "COMMITTEE_MEMBER" || role === "COMMITTEE";
                  const roleLabel = isCommittee && committeeSociety
                    ? `COMMITTEE MEMBER (${committeeSociety.name})`
                    : role.replace(/_/g, " ");

                  return (
                    <div
                      key={role}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 6,
                        background: isCommittee ? "rgba(234,179,8,0.14)" : "rgba(255,255,255,0.05)",
                        color: isCommittee ? "#facc15" : "var(--text-secondary, rgba(255,255,255,0.9))",
                        border: isCommittee ? "1px solid rgba(234,179,8,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span style={{ fontSize: 10, color: isCommittee ? "rgba(250,204,21,0.7)" : "var(--text-secondary, rgba(255,255,255,0.5))", textTransform: "uppercase", fontWeight: 600 }}>
                        Role:
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {roleLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: HOUSEHOLD DETAILS & EMERGENCY CONTACT (COMPACT & NEAT) */}
          <div
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
              borderRadius: 10,
              border: "1px solid var(--divider, rgba(255,255,255,0.08))",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Stat Counters: No. of Vehicles & Family Members */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {/* Vehicles */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "rgba(59,130,246,0.14)",
                    color: "#60a5fa",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdDirectionsCar size={14} />
                </span>
                <span style={{ color: "var(--text-secondary, rgba(255,255,255,0.6))", fontSize: 11, fontWeight: 600 }}>
                  Vehicles:
                </span>
                <span style={{ fontWeight: 800, fontSize: 13, color: "var(--text-primary, #ffffff)" }}>
                  {resident.vehicle_count ?? 0}
                </span>
              </div>

              <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />

              {/* Family Members */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "rgba(34,197,94,0.14)",
                    color: "#4ade80",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdPeople size={14} />
                </span>
                <span style={{ color: "var(--text-secondary, rgba(255,255,255,0.6))", fontSize: 11, fontWeight: 600 }}>
                  Family Members:
                </span>
                <span style={{ fontWeight: 800, fontSize: 13, color: "var(--text-primary, #ffffff)" }}>
                  {resident.occupant_count ?? 1}
                </span>
              </div>
            </div>

            {/* Emergency Contact */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                background: "rgba(255,255,255,0.025)",
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <MdContactPhone size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary, rgba(255,255,255,0.6))" }}>
                Emergency:
              </span>
              {hasEmergencyContact ? (
                <span style={{ fontWeight: 700, color: "var(--text-primary, #ffffff)" }}>
                  {ecName ? `${ecName}` : ""}
                  {ecName && ecPhone ? " · " : ""}
                  {ecPhone ? (
                    <a
                      href={`tel:${ecPhone}`}
                      style={{ color: "#60a5fa", textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {ecPhone}
                    </a>
                  ) : null}
                </span>
              ) : (
                <span style={{ color: "var(--text-secondary, rgba(255,255,255,0.4))", fontSize: 11 }}>
                  None provided
                </span>
              )}
            </div>
          </div>

          {/* SECTION 3: SOCIETIES & FLAT ASSIGNMENTS (CLEAN 5-COLUMN TABULAR FORMAT) */}
          <div
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
              borderRadius: 12,
              border: "1px solid var(--divider, rgba(255,255,255,0.08))",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--accent, #a78bfa)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MdApartment size={15} /> {isSuper ? "Societies & Flat Assignments" : "Society & Flat Assignment"}
              </span>
              {isSuper && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 10,
                    background: "rgba(107,70,193,0.15)",
                    color: "var(--accent, #a78bfa)",
                    border: "1px solid rgba(107,70,193,0.25)",
                  }}
                >
                  {societies.length} {societies.length === 1 ? "Society" : "Societies"}
                </span>
              )}
            </div>

            {/* TABULAR LAYOUT */}
            <div
              style={{
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Society
                      </th>
                      <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Flat / Unit
                      </th>
                      <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Type
                      </th>
                      <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Role
                      </th>
                      <th style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, idx) => {
                      const flatLabel = row.flatNumber
                        ? row.flatNumber.toLowerCase().startsWith("flat")
                          ? row.flatNumber
                          : `Flat ${row.flatNumber}`
                        : null;

                      const wingPart = row.blockName && !flatLabel?.toLowerCase().includes(row.blockName.toLowerCase())
                        ? (row.blockName.toLowerCase().includes("wing") ? row.blockName : `Wing ${row.blockName}`)
                        : null;
                      const floorPart = row.floorNumber != null ? `Floor ${row.floorNumber}` : null;
                      const metaText = [wingPart, floorPart].filter(Boolean).join(" · ");

                      return (
                        <tr
                          key={row.rowKey || idx}
                          style={{
                            borderBottom:
                              idx < tableRows.length - 1
                                ? "1px solid rgba(255,255,255,0.05)"
                                : "none",
                            background: idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
                          }}
                        >
                          {/* Society Name (Clean, No Address) */}
                          <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <MdHomeWork size={16} style={{ color: "var(--accent, #a78bfa)", flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary, #ffffff)" }}>
                                {row.societyName}
                              </span>
                            </div>
                          </td>

                          {/* Flat / Unit */}
                          <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                            {flatLabel ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: "3px 9px",
                                    borderRadius: 6,
                                    background: row.isVacated ? "rgba(245,158,11,0.14)" : "rgba(34,197,94,0.10)",
                                    color: row.isVacated ? "#f59e0b" : "#4ade80",
                                    border: `1px solid ${row.isVacated ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.22)"}`,
                                  }}
                                >
                                  {flatLabel} {row.isVacated ? "(Past Flat)" : ""}
                                </span>
                                {metaText && (
                                  <span style={{ fontSize: 11, color: "var(--text-secondary, rgba(255,255,255,0.55))" }}>
                                    ({metaText})
                                  </span>
                                )}
                                {row.isVacated && (row.moveOutDate || row.moveInDate) && (
                                  <span style={{ fontSize: 11, color: "var(--text-secondary, rgba(255,255,255,0.65))" }}>
                                    {row.moveOutDate ? `Vacated: ${new Date(row.moveOutDate).toLocaleDateString()}` : "Vacated"}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--text-secondary, rgba(255,255,255,0.4))", fontStyle: "italic" }}>
                                No unit assigned
                              </span>
                            )}
                          </td>

                          {/* Flat Type */}
                          <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                            {row.flatType ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                  background: "rgba(255,255,255,0.06)",
                                  color: "var(--text-secondary, rgba(255,255,255,0.85))",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                {row.flatType}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Occupancy & Society Roles */}
                          <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {row.role ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    background: "rgba(59,130,246,0.12)",
                                    color: "#60a5fa",
                                    border: "1px solid rgba(59,130,246,0.25)",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {row.role}
                                </span>
                              ) : null}

                              {row.socRoles?.includes("COMMITTEE_MEMBER") && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    background: "rgba(234,179,8,0.16)",
                                    color: "#facc15",
                                    border: "1px solid rgba(234,179,8,0.35)",
                                    textTransform: "uppercase",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                  title="Committee Member in this society"
                                >
                                  ★ COMMITTEE MEMBER
                                </span>
                              )}

                              {row.socRoles
                                ?.filter((r) => r !== "COMMITTEE_MEMBER" && r !== "RESIDENT" && r !== row.role)
                                .map((r) => (
                                  <span
                                    key={r}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 7px",
                                      borderRadius: 4,
                                      background: "rgba(107,70,193,0.12)",
                                      color: "#c084fc",
                                      border: "1px solid rgba(107,70,193,0.25)",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {r.replace(/_/g, " ")}
                                  </span>
                                ))}

                              {!row.role && (!row.socRoles || row.socRoles.length === 0) && "—"}
                            </div>
                          </td>

                          {/* Membership Status & Actions */}
                          <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                            {(() => {
                              const effectiveStatus = statusOverrides[row.rowKey] || row.membershipStatus;
                              const canAct = effectiveStatus === "PENDING" && (isSuper || Number(currentSocId) === Number(row.societyId));
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 7px",
                                      borderRadius: 12,
                                      background:
                                        effectiveStatus === "ACTIVE"
                                          ? "rgba(34,197,94,0.12)"
                                          : effectiveStatus === "VACATED" || row.isVacated
                                          ? "rgba(245,158,11,0.14)"
                                          : effectiveStatus === "PENDING"
                                          ? "rgba(245,158,11,0.12)"
                                          : "rgba(239,68,68,0.12)",
                                      color:
                                        effectiveStatus === "ACTIVE"
                                          ? "#4ade80"
                                          : effectiveStatus === "VACATED" || row.isVacated
                                          ? "#f59e0b"
                                          : effectiveStatus === "PENDING"
                                          ? "#fbbf24"
                                          : "#f87171",
                                      border: `1px solid ${
                                        effectiveStatus === "ACTIVE"
                                          ? "rgba(34,197,94,0.25)"
                                          : effectiveStatus === "VACATED" || row.isVacated
                                          ? "rgba(245,158,11,0.35)"
                                          : effectiveStatus === "PENDING"
                                          ? "rgba(245,158,11,0.25)"
                                          : "rgba(239,68,68,0.25)"
                                      }`,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {row.isVacated ? "VACATED" : effectiveStatus}
                                  </span>

                                  {canAct && (
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                      <button
                                        type="button"
                                        disabled={actionLoading === row.rowKey}
                                        onClick={() => handleRowApprove(row)}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                          fontSize: 11,
                                          fontWeight: 700,
                                          padding: "3px 9px",
                                          borderRadius: 6,
                                          background: "#16a34a",
                                          color: "#ffffff",
                                          border: "none",
                                          cursor: actionLoading === row.rowKey ? "not-allowed" : "pointer",
                                          boxShadow: "0 2px 6px rgba(22,163,74,0.3)",
                                          transition: "all 0.15s ease",
                                        }}
                                        title={`Approve registration for ${row.societyName}`}
                                      >
                                        <MdCheck size={13} />
                                        {actionLoading === row.rowKey ? "..." : "Approve"}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={actionLoading === row.rowKey}
                                        onClick={() => { setRejectingRow(row); setRejectReason(""); }}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                          fontSize: 11,
                                          fontWeight: 700,
                                          padding: "3px 9px",
                                          borderRadius: 6,
                                          background: "rgba(239,68,68,0.15)",
                                          color: "#ef4444",
                                          border: "1px solid rgba(239,68,68,0.3)",
                                          cursor: actionLoading === row.rowKey ? "not-allowed" : "pointer",
                                          transition: "all 0.15s ease",
                                        }}
                                        title={`Reject registration for ${row.societyName}`}
                                      >
                                        <MdClose size={13} />
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 4: KYC VERIFICATION DOCUMENTS */}
          <div
            style={{
              background: "var(--card-inner-bg, rgba(255,255,255,0.03))",
              borderRadius: 12,
              border: "1px solid var(--divider, rgba(255,255,255,0.08))",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--accent, #a78bfa)",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <MdBadge size={15} /> KYC Verification Documents
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {/* Aadhaar Card */}
              <div
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: aadharUrl ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                      color: aadharUrl ? "#4ade80" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MdBadge size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary, #ffffff)" }}>
                      Aadhaar Card
                    </div>
                    <div style={{ fontSize: 10, color: aadharUrl ? "#4ade80" : "var(--text-secondary, rgba(255,255,255,0.4))", display: "flex", alignItems: "center", gap: 3 }}>
                      {aadharUrl ? (
                        <>
                          <MdCheckCircle size={12} /> Document on file
                        </>
                      ) : (
                        "Not Uploaded"
                      )}
                    </div>
                  </div>
                </div>

                {aadharUrl && (
                  <a
                    href={aadharUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 10px",
                      borderRadius: 6,
                      background: "rgba(107,70,193,0.15)",
                      border: "1px solid rgba(107,70,193,0.3)",
                      color: "var(--accent, #a78bfa)",
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(107,70,193,0.25)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(107,70,193,0.15)")}
                  >
                    <MdOpenInNew size={12} /> View ↗
                  </a>
                )}
              </div>

              {/* PAN Card */}
              <div
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: panUrl ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                      color: panUrl ? "#4ade80" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MdCreditCard size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary, #ffffff)" }}>
                      PAN Card
                    </div>
                    <div style={{ fontSize: 10, color: panUrl ? "#4ade80" : "var(--text-secondary, rgba(255,255,255,0.4))", display: "flex", alignItems: "center", gap: 3 }}>
                      {panUrl ? (
                        <>
                          <MdCheckCircle size={12} /> Document on file
                        </>
                      ) : (
                        "Not Uploaded"
                      )}
                    </div>
                  </div>
                </div>

                {panUrl && (
                  <a
                    href={panUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "5px 10px",
                      borderRadius: 6,
                      background: "rgba(107,70,193,0.15)",
                      border: "1px solid rgba(107,70,193,0.3)",
                      color: "var(--accent, #a78bfa)",
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(107,70,193,0.25)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(107,70,193,0.15)")}
                  >
                    <MdOpenInNew size={12} /> View ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--divider, rgba(255,255,255,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-primary, #ffffff)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(resident)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
              }}
            >
              <MdEdit size={14} /> Edit Resident
            </button>
          )}
        </div>
      </div>

      {/* Reject Society Registration Modal */}
      {rejectingRow && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setRejectingRow(null); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--card-bg, #1e1e2d)",
              border: "1px solid var(--glass-border, rgba(255,255,255,0.12))",
              borderRadius: 20,
              padding: "24px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              color: "var(--text-primary, #ffffff)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(251,191,36,0.14)",
                  border: "1px solid rgba(251,191,36,0.3)",
                }}
              >
                <MdWarning size={22} style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary, #ffffff)", letterSpacing: "-0.02em" }}>
                  Reject Registration
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #94a3b8)" }}>
                  {resident.name} · {rejectingRow.societyName}
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #94a3b8)", lineHeight: 1.6 }}>
              This will reject the registration for <strong>{rejectingRow.societyName}</strong> and free up any assigned unit. The resident will be notified by email.
            </p>

            <label style={{ display: "block", marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary, #ffffff)" }}>
              Reason for rejection <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              rows={3}
              maxLength={255}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Identity documents could not be verified. Please upload clear documents."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--card-inner-bg, rgba(255,255,255,0.05))",
                border: "1px solid var(--glass-border, rgba(255,255,255,0.15))",
                color: "var(--text-primary, #ffffff)",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-secondary, #94a3b8)" }}>
              Required. This reason is emailed to the resident. <span style={{ opacity: 0.7 }}>{rejectReason.trim().length}/255</span>
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setRejectingRow(null)}
                disabled={rejectLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary, #ffffff)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRowReject}
                disabled={rejectLoading || !rejectReason.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: (rejectLoading || !rejectReason.trim()) ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MdClose size={15} />
                {rejectLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}
