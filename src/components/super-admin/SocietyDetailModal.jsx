import { useCallback, useEffect, useState } from "react";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import GlobalModal from "../common/GlobalModal";
import GlobalButton from "../common/GlobalButton";
import {
  MdApartment, MdHomeWork, MdWarning, MdCheckCircle, MdGroups,
  MdPark, MdLocalParking, MdPestControl, MdCampaign,
  MdDirectionsCar, MdHealthAndSafety, MdOutlineInbox, MdDescription,
  MdAccountBalanceWallet, MdReceiptLong, MdAttachMoney, MdCalendarToday,
  MdLocationOn, MdEdit, MdClose, MdShield,
} from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import { FiUser, FiUsers, FiLock, FiShield, FiBriefcase } from "react-icons/fi";
import { LuCrown } from "react-icons/lu";
import { AiOutlineSafetyCertificate, AiOutlineCreditCard } from "react-icons/ai";
import { PiMedalBold } from "react-icons/pi";

const inr = (n) =>
  "₹" + (Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }));

const CASE_COLORS = {
  "Row Houses": "#10b981",
  Commercial: "#5B8DEF",
  Mixed: "#9F87D7",
};

function Tile({ label, value, icon: Icon, color = "var(--accent)", note = null, fin = false }) {
  return (
    <div className={`sd-stat ${fin ? "sd-stat-fin" : ""}`}>
      <div className="sd-stat-row">
        <span className="sd-stat-ic" style={{ background: `${color}1A`, color }}>
          <Icon size={17} />
        </span>
        <span className="sd-stat-label">{label}</span>
      </div>
      <div className="sd-stat-val">{value}</div>
      {note && <div className="sd-stat-note">{note}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, count = null, color = "var(--accent)" }) {
  return (
    <div className="sd-sec-title">
      <span className="sd-sec-ic" style={{ color, background: `${color}1A` }}>
        <Icon size={16} />
      </span>
      <h4>{label}</h4>
      {count != null && <span className="sd-sec-count">{count}</span>}
    </div>
  );
}

export default function SocietyDetailModal({ society, onClose, onEditAdmin, onManage, t }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async (force = false) => {
    if (!society) return;
    if (force) {
      setLoading(true);
      setError(false);
    }
    try {
      const res = await API.get(`/societies/${society.id}/detail`);
      setDetail(res.data?.data || null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [society]);

  useEffect(() => {
    load();
  }, [load]);

  const typeColor = (pt) => {
    const map = { ...CASE_COLORS, Apartments: "var(--accent)" };
    return map[pt] || "var(--accent)";
  };

  const d = detail;
  const s = d || society || {};
  const isAssigned = d ? (d.admins?.length > 0) : !!society?.societyAdmins;
  const admin = d?.admins?.[0] || society?.societyAdmins || null;
  const created = d?.created_at;

  return (
    <GlobalModal
      isOpen={!!society}
      onClose={onClose}
      title={s.name || ""}
      subtitle={s.address || t("saSocDetailNoAddr", "No address")}
      icon={MdApartment}
      size="xxl"
      bodyClassName="modal-scroll-thin"
      disableUnsavedWarning
    >
      <div className="sd-modal-body">
        {/* Loading */}
        {loading && (
          <div className="sd-state">
            <div className="sd-state-spin" />
            <p className="sd-state-text">
              {t("saSocDetailLoading", "Loading society details…")}
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="sd-state">
            <MdWarning size={40} className="sd-state-ic" />
            <p className="sd-state-text">
              {t("saSocDetailErr", "Could not load society details.")}
            </p>
            <GlobalButton variant="secondary" size="sm" icon={MdOutlineInbox} onClick={() => load(true)}>
              {t("retry", "Retry")}
            </GlobalButton>
          </div>
        )}

        {/* Detail body */}
        {!loading && !error && d && (
          <>
            {/* ── Hero banner ── */}
            <div className="sd-hero">
              <div className="sd-hero-icon">
                <MdApartment size={28} />
              </div>
              <div className="sd-hero-info">
                <div className="sd-hero-title-row">
                  <h3 className="sd-hero-title">{s.name}</h3>
                  <span className={`sd-chip ${isAssigned ? "sd-chip-status" : "sd-chip-status-pending"}`}>
                    <span className="sd-chip-dot" />
                    {isAssigned ? t("saBadgeActive") : t("saBadgePending")}
                  </span>
                </div>
                <div className="sd-hero-addr">
                  <MdLocationOn size={15} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.address || "—"}</span>
                </div>
                <div className="sd-hero-chips">
                  {(d.propertyTypes || []).slice(0, 3).map((pt) => (
                    <span
                      key={pt}
                      className="sd-chip"
                      style={{ color: typeColor(pt), background: `${typeColor(pt)}18`, borderColor: `${typeColor(pt)}30` }}
                    >
                      {pt}
                    </span>
                  ))}
                  {created && (
                    <span className="sd-chip sd-chip-ghost">
                      <MdCalendarToday size={13} />
                      {new Date(created).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Admin card ── */}
            {isAssigned && admin ? (
              <div className="sd-admin-card">
                <div className="sd-admin-avatar">
                  {admin.name?.charAt(0).toUpperCase()}
                </div>
                <div className="sd-admin-body">
                  <div className="sd-admin-name">
                    {admin.name}
                    <span className="sd-admin-role-tag">SOCIETY ADMIN</span>
                  </div>
                  <div className="sd-admin-mail">
                    <FiUser size={13} />
                    {admin.email}
                  </div>
                </div>
                <div className="sd-admin-actions">
                  <GlobalButton variant="secondary" size="sm" icon={MdEdit} onClick={onEditAdmin}>
                    {t("saEditAdmin")}
                  </GlobalButton>
                </div>
              </div>
            ) : (
              <div className="sd-admin-card">
                <div className="sd-admin-avatar">
                  <MdWarning size={22} style={{ color: "#fff" }} />
                </div>
                <div className="sd-admin-body">
                  <div className="sd-admin-name">
                    {t("saNotAssigned")}
                  </div>
                  <div className="sd-admin-mail">
                    <MdShield size={13} />
                    {t("saSocDetailNoAdmin", "Assign a society admin to activate this society.")}
                  </div>
                </div>
                <div className="sd-admin-actions">
                  <GlobalButton variant="primary" size="sm" icon={FiShield} onClick={onEditAdmin}>
                    {t("saAssignAdmin")}
                  </GlobalButton>
                </div>
              </div>
            )}

            {/* ── Structure ── */}
            <div>
              <SectionTitle
                icon={MdApartment}
                label={t("saSocSecStructure", "Structure")}
                color="#5B8DEF"
              />
              <div className="sd-grid">
                <Tile label={t("saSocSecBlocks", "Blocks")} value={d.structure?.blocks ?? "–"} icon={FaBuilding} color="#5B8DEF" />
                <Tile label={t("saSocSecFloors", "Floors")} value={d.structure?.floors ?? "–"} icon={MdHomeWork} color="#9F87D7" />
                <Tile label={t("saSocSecFlats", "Flats")} value={d.structure?.flats ?? "–"} icon={MdApartment} color="var(--accent)" />
                <Tile
                  label={t("saSocSecOccupied", "Occupied")}
                  value={d.structure?.occupiedFlats ?? "–"}
                  icon={MdCheckCircle}
                  color="#22C55E"
                  note={d.structure?.vacantFlats != null ? `${d.structure.vacantFlats} ${t("saSocSecVacant", "vacant")}` : null}
                />
              </div>
            </div>

            {/* ── People ── */}
            <div>
              <SectionTitle icon={MdGroups} label={t("saSocSecPeople", "People")} color="#22d3ee" />
              <div className="sd-grid sd-grid-2">
                <Tile label={t("saSocSecResidents", "Residents")} value={d.people?.residents ?? "–"} icon={FiUsers} color="#22d3ee" />
                <Tile label={t("saSocSecOwners", "Owners")} value={d.people?.owners ?? "–"} icon={LuCrown} color="#3b82f6" />
                <Tile label={t("saSocSecTenants", "Tenants")} value={d.people?.tenants ?? "–"} icon={FiUser} color="#fb7185" />
                <Tile label={t("saSocSecPending", "Pending")} value={d.people?.pending ?? "–"} icon={FiLock} color="#f59e0b" />
                <Tile label={t("saSocSecGuards", "Guards")} value={d.people?.guards ?? "–"} icon={AiOutlineSafetyCertificate} color="#a78bfa" />
                <Tile label={t("saSocSecCommittee", "Committee")} value={d.people?.committee ?? "–"} icon={PiMedalBold} color="#2FC27E" />
                <Tile label={t("saSocSecAccountants", "Accountants")} value={d.people?.accountants ?? "–"} icon={FiBriefcase} color="#f472b6" />
              </div>
            </div>

            {/* ── Activity ── */}
            <div>
              <SectionTitle icon={MdCampaign} label={t("saSocSecActivity", "Activity")} color="#fb7185" />
              <div className="sd-grid sd-grid-2">
                <Tile
                  label={t("saSocSecComplaints", "Complaints")}
                  value={d.activity?.complaints ?? "–"}
                  icon={MdPestControl}
                  color="#fb7185"
                  note={`${d.activity?.openComplaints ?? 0} ${t("saSocSecOpen", "open")} · ${d.activity?.resolvedComplaints ?? 0} ${t("saSocSecResolved", "resolved")}`}
                />
                <Tile label={t("saSocSecNotices", "Notices")} value={d.activity?.notices ?? "–"} icon={MdCampaign} color="#f59e0b" />
                <Tile label={t("saSocSecVisitors", "Visitors")} value={d.activity?.visitors ?? "–"} icon={MdDirectionsCar} color="#22d3ee" />
                <Tile label={t("saSocSecEmergencies", "Emergencies")} value={d.activity?.emergencies ?? "–"} icon={MdHealthAndSafety} color="#ef4444" />
                <Tile label={t("saSocSecVehicles", "Vehicles")} value={d.activity?.vehicles ?? "–"} icon={MdDirectionsCar} color="#3b82f6" />
                <Tile
                  label={t("saSocSecParking", "Parking Slots")}
                  value={d.activity?.parkingSlots ?? "–"}
                  icon={MdLocalParking}
                  color="#6d28d9"
                  note={`${d.activity?.assignedSlots ?? 0} ${t("saSocSecAssigned", "assigned")}`}
                />
                <Tile label={t("saSocSecAmenities", "Amenities")} value={d.activity?.amenities ?? "–"} icon={MdPark} color="#2FC27E" />
                <Tile label={t("saSocSecDocs", "Documents")} value={d.activity?.documents ?? "–"} icon={MdDescription} color="#9F87D7" />
              </div>
            </div>

            {/* ── Finance ── */}
            <div>
              <SectionTitle icon={MdAccountBalanceWallet} label={t("saSocSecFinance", "Finance")} color="#22c55e" />
              <div className="sd-grid sd-grid-2">
                <Tile
                  label={t("saSocSecBills", "Bills")}
                  value={d.finance?.billCount ?? "–"}
                  icon={MdReceiptLong}
                  color="#5B8DEF"
                  fin
                  note={`${d.finance?.paidCount ?? 0} ${t("saSocSecPaid", "paid")} · ${d.finance?.pendingCount ?? 0} ${t("saSocSecPending", "pending")}`}
                />
                <Tile label={t("saSocSecBilled", "Billed")} value={inr(d.finance?.billedAmount)} icon={MdReceiptLong} color="#3b82f6" fin />
                <Tile label={t("saSocSecCollected", "Collected")} value={inr(d.finance?.collectedAmount)} icon={MdAttachMoney} color="#22c55e" fin />
                <Tile label={t("saSocSecDue", "Outstanding")} value={inr(d.finance?.pendingAmount)} icon={AiOutlineCreditCard} color="#f59e0b" fin />
                <Tile label={t("saSocSecOpening", "Opening Balance")} value={inr(d.opening_balance)} icon={MdAccountBalanceWallet} color="#9F87D7" fin />
              </div>
            </div>
          </>
        )}

        {/* Footer actions */}
        {!loading && !error && d && (
          <div className="sd-footer-actions" style={{ marginTop: 4 }}>
            <GlobalButton variant="secondary" icon={MdClose} onClick={onClose}>
              {t("close", "Close")}
            </GlobalButton>
            <span className="sd-spacer" />
            <GlobalButton variant="primary" borderDraw icon={MdOutlineInbox} onClick={onManage}>
              {t("saManageBtn")}
            </GlobalButton>
          </div>
        )}
      </div>
    </GlobalModal>
  );
}