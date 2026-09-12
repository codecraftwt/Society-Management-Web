import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  MdPerson, MdAdd, MdClose, MdDelete,
  MdShield, MdPhone, MdEmail, MdWork,
  MdFamilyRestroom, MdAdminPanelSettings, MdEdit, MdCheck, MdSearch,
} from "react-icons/md";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import SlidingTabs from "../../components/common/SlidingTabs";

function PortalModal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function AdminToggle({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange}
      className={`hh-admin-toggle ${checked ? "hh-admin-toggle--on" : "hh-admin-toggle--off"}`}>
      <span className={`hh-admin-toggle__knob ${checked ? "hh-admin-toggle__knob--on" : ""}`} />
    </button>
  );
}

/* ConfirmModal */
function ConfirmModal({ message, subtext, onConfirm, onCancel, confirmLabel, danger, errorMsg, t }) {
  return (
    <PortalModal>
      <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} className="hh-overlay">
        <div className="bg-card animate-scaleIn hh-confirm-box">
          <div className={`hh-confirm-icon ${danger ? "hh-confirm-icon--danger" : "hh-confirm-icon--admin"}`}>
            {danger
              ? <MdDelete size={19} className="hh-icon-danger" />
              : <MdAdminPanelSettings size={19} className="hh-icon-admin" />}
          </div>
          <p className="hh-confirm-title">{message}</p>
          {subtext && <p className="hh-confirm-sub">{subtext}</p>}
          {errorMsg && (
            <div className="hh-error-box">
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
              {errorMsg}
            </div>
          )}
          <div className="hh-confirm-actions">
            <button type="button" onClick={onCancel} className="hh-btn-cancel">{t("cancel")}</button>
            <button type="button" onClick={onConfirm}
              className={danger ? "btn-danger hh-btn-confirm" : "btn-primary hh-btn-confirm"}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </PortalModal>
  );
}

/* EditModal */
function EditModal({ member, onClose, onSaved, t }) {
  const [email,  setEmail]  = useState(member.email || "");
  const [phone,  setPhone]  = useState(member.phone || "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await API.put(`/household/${member.id}`, { email, phone });
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t("hhEditFail"));
    } finally { setSaving(false); }
  };

  return (
    <PortalModal>
      <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="hh-overlay">
        <div className="bg-card animate-scaleIn hh-edit-box">
          <div className="hh-edit-er">
            <div className="hh-edit-er-left">
              <div className="hh-edit-er-icon">
                <MdEdit size={15} className="hh-icon-admin" />
              </div>
              <div>
                <p className="hh-edit-title">{t("hhEditTitle")}</p>
                <p className="hh-edit-sub">{member.name}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="hh-close-btn">
              <MdClose size={14} />
            </button>
          </div>

          {error && (
            <div className="hh-error-box" style={{ marginBottom: "0.75rem" }}>
              <span style={{ flexShrink: 0 }}>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSave} className="hh-form">
            <FieldLabel icon={<MdPhone size={11} />} label={t("hhFieldMobile")} />
            <input className="input" placeholder="+91 98765 43210"
              value={phone} onChange={(e) => setPhone(e.target.value)} required />

            <FieldLabel icon={<MdEmail size={11} />} label={t("hhFieldEmail")} />
            <input className="input" type="email" placeholder="example@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />

            <button type="submit" disabled={saving} className="btn-primary hh-save-btn">
              {saving
                ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                : <MdCheck size={16} />
              }
              {saving ? t("hhSaving") : t("hhSaveChanges")}
            </button>
          </form>
        </div>
      </div>
    </PortalModal>
  );
}

/* ═══════════════════════════ MAIN ═══════════════════════════ */
export default function MyHouseHold() {
  const { t }    = useLang();

  const [activeTab,    setActiveTab]    = useState("family");
  const [showModal,    setShowModal]    = useState(false);
  const [members,      setMembers]      = useState([]);
  const [flatAssigned, setFlatAssigned] = useState(true);  // optimistic default
  const [confirm,      setConfirm]      = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [editMember,   setEditMember]   = useState(null);
  const [search,       setSearch]       = useState("");

  const [formData, setFormData] = useState({
    name: "", phone: "", email: "", relation: "", work: "",
  });

  useEffect(() => { checkFlat(); loadHousehold(); }, []);

  /* ✅ FIX: /users/get-flat returns an ARRAY — check array length, not .flat_number */
  const checkFlat = async () => {
    try {
      const res   = await API.get("/users/get-flat");
      const flats = Array.isArray(res.data) ? res.data : [];
      setFlatAssigned(flats.length > 0);
    } catch {
      setFlatAssigned(false);
    }
  };

  const loadHousehold = async () => {
    try {
      const res = await API.get("/household");
      setMembers(res.data || []);
    } catch { setMembers([]); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!flatAssigned) return;
    try {
      await API.post("/household/add", {
        name:     formData.name,
        phone:    formData.phone,
        email:    formData.email || null,
        relation: activeTab === "family" ? formData.relation : "Daily Help",
        work:     activeTab === "help"   ? formData.work     : null,
        isAdmin:  false,
      });
      setFormData({ name: "", phone: "", email: "", relation: "", work: "" });
      setShowModal(false);
      loadHousehold();
    } catch (err) {
      console.error("Add member failed:", err.response?.data?.message || err.message);
    }
  };

  const handleMemberSaved = (updated) => {
    setMembers((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
  };

  const askDelete = (id, name) =>
    setConfirm({
      type: "delete", id,
      message: t("hhConfirmRemoveTitle"),
      subtext: `"${name}" ${t("hhConfirmRemoveSub")}`,
    });

  const askToggleAdmin = (id, name, isAdmin) =>
    setConfirm({
      type: "admin", id, isAdmin,
      message: isAdmin ? t("hhConfirmRevokeTitle") : t("hhConfirmGrantTitle"),
      subtext:  isAdmin
        ? `"${name}" ${t("hhConfirmRevokeSub")}`
        : `"${name}" ${t("hhConfirmGrantSub")}`,
    });

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmError(null);
    try {
      if (confirm.type === "delete") {
        await API.delete(`/household/${confirm.id}`);
        setMembers((p) => p.filter((m) => m.id !== confirm.id));
        setConfirm(null);
      } else {
        const res = await API.patch(`/household/${confirm.id}/toggle-admin`);
        setMembers((p) =>
          p.map((m) => m.id === confirm.id ? { ...m, isAdmin: res.data.isAdmin } : m)
        );
        setConfirm(null);
      }
    } catch (err) {
      setConfirmError(err.response?.data?.message || t("hhConfirmErr"));
    }
  };

  const familyMembers = members.filter((m) => !m.work);
  const helpMembers   = members.filter((m) => m.work);
  const adminCount    = familyMembers.filter((m) => m.isAdmin).length;
  const q = search.trim().toLowerCase();
  const matches = (m) =>
    !q ||
    [m.name, m.phone, m.email, m.relation, m.work].some((v) =>
      String(v || "").toLowerCase().includes(q)
    );
  const filtered = (activeTab === "family" ? familyMembers : helpMembers).filter(matches);

  return (
    <>
      <div className="ge-root hh-page animate-fadeIn">
        <div className="ge-er">
          <div className="ge-er-left">
            <div className="ad-page-icon">
              <MdFamilyRestroom size={22} />
            </div>
            <div>
              <h2 className="page-title">{t("hhTitle")}</h2>
              <p className="page-subtitle">
                {members.length} {members.length !== 1 ? t("hhMembers") : t("hhMember")} · {adminCount} {adminCount !== 1 ? t("hhAdmins") : t("hhAdmin")}
              </p>
            </div>
          </div>
          {flatAssigned && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <MdAdd size={18} /> {t("hhAddMemberBtn")}
            </button>
          )}
        </div>

        {!flatAssigned && (
          <div className="gc-warn">
            <MdShield size={15} /> {t("hhFlatWarning")}
          </div>
        )}

        <div className="ge-stats">
          <div className="complaint-stat-card complaint-stat-total">
            <span className="complaint-stat-val">{familyMembers.length}</span>
            <span className="complaint-stat-label">{t("hhTabFamily")}</span>
          </div>
          <div className="complaint-stat-card complaint-stat-inprogress">
            <span className="complaint-stat-val">{helpMembers.length}</span>
            <span className="complaint-stat-label">{t("hhTabHelp")}</span>
          </div>
          <div className="complaint-stat-card complaint-stat-resolved">
            <span className="complaint-stat-val">{adminCount}</span>
            <span className="complaint-stat-label">{t("hhAdmins")}</span>
          </div>
        </div>

        <div className="ge-toolbar">
          <div className="ge-search-wrap">
            <MdSearch className="ge-search-icon" size={17} />
            <input
              className="ge-search-input"
              placeholder={t("hhFieldNamePlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button type="button" onClick={() => setSearch("")} className="ge-search-clear" aria-label="Clear search">
                <MdClose size={13} />
              </button>
            ) : null}
          </div>

          <SlidingTabs
            className="ge-filter-tabs"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: "family", label: t("hhTabFamily"), icon: <MdFamilyRestroom size={15} />, badge: familyMembers.length },
              { id: "help",   label: t("hhTabHelp"),   icon: <MdWork size={15} />,           badge: helpMembers.length },
            ]}
          />
        </div>

        {flatAssigned && (
          <div className="hh-list">
            {filtered.length === 0 ? (
              <div className="bg-card hh-empty-state">
                <div className="hh-empty-icon-wrap">
                  {activeTab === "family"
                    ? <MdFamilyRestroom size={19} />
                    : <MdWork size={19} />}
                </div>
                <p className="text-secondary" style={{ fontSize: "0.83rem", margin: 0 }}>
                  {q
                    ? t("hhEmptyHint")
                    : activeTab === "family" ? t("hhEmptyFamily") : t("hhEmptyHelp")}
                </p>
                {!q && <p className="hh-empty-hint">{t("hhEmptyHint")}</p>}
              </div>
            ) : filtered.map((m) => (
              <MemberRow key={m.id} member={m} isFamily={activeTab === "family"}
                onDelete={() => askDelete(m.id, m.name)}
                onToggleAdmin={() => askToggleAdmin(m.id, m.name, m.isAdmin)}
                onEdit={() => setEditMember(m)}
                t={t} />
            ))}
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && flatAssigned && (
        <PortalModal>
          <div onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }} className="hh-overlay">
            <div className="bg-card animate-scaleIn hh-add-box">
              <ModalContent activeTab={activeTab} formData={formData}
                setFormData={setFormData} handleAdd={handleAdd}
                setShowModal={setShowModal} t={t} />
            </div>
          </div>
        </PortalModal>
      )}

      {/* ── EDIT MODAL ── */}
      {editMember && (
        <EditModal member={editMember} onClose={() => setEditMember(null)}
          onSaved={handleMemberSaved} t={t} />
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirm && (
        <ConfirmModal
          message={confirm.message} subtext={confirm.subtext}
          danger={confirm.type === "delete"}
          confirmLabel={
            confirm.type === "delete"
              ? t("hhRemoveBtn")
              : confirm.isAdmin ? t("hhRevokeBtn") : t("hhGrantBtn")
          }
          onConfirm={handleConfirm}
          onCancel={() => { setConfirm(null); setConfirmError(null); }}
          errorMsg={confirmError}
          t={t}
        />
      )}
    </>
  );
}

/* ── MEMBER ROW ── */
function MemberRow({ member, isFamily, onDelete, onToggleAdmin, onEdit, t }) {
  const initial = member.name?.charAt(0).toUpperCase();
  return (
    <div className="ra-booking-row hh-member-row">
      <div className="ra-booking-left">
        <div className={`hh-avatar ${isFamily ? "hh-avatar--family" : "hh-avatar--help"}`}>
          {initial}
        </div>
        <div>
          <div className="hh-name-row">
            <span className="ra-booking-name" style={{ margin: 0 }}>{member.name}</span>
            {isFamily && member.isAdmin && (
              <span className="hh-admin-badge">
                <MdAdminPanelSettings size={9} /> {t("hhAdminBadge")}
              </span>
            )}
          </div>
          <div className="hh-meta-row">
            <span className="ra-booking-date">{isFamily ? member.relation : member.work}</span>
            {member.phone && (
              <span className="ra-booking-date hh-meta-item">
                <MdPhone size={10} className="hh-meta-icon" /> {member.phone}
              </span>
            )}
            {member.email && (
              <span className="ra-booking-date hh-meta-item">
                <MdEmail size={10} className="hh-meta-icon" /> {member.email}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="ra-booking-right" style={{ gap: "6px" }}>
        {isFamily && <AdminToggle checked={!!member.isAdmin} onChange={onToggleAdmin} />}
        <button type="button" onClick={onEdit} className="hh-icon-btn hh-icon-btn--edit" title={t("hhEditMember")}>
          <MdEdit size={14} />
        </button>
        <button type="button" onClick={onDelete} className="hh-icon-btn hh-icon-btn--delete" title={t("hhRemoveMember")}>
          <MdDelete size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── MODAL CONTENT ── */
function ModalContent({ activeTab, formData, setFormData, handleAdd, setShowModal, t }) {
  const isFamily = activeTab === "family";
  return (
    <>
      <div className="hh-edit-er">
        <div className="hh-edit-er-left">
          <div className="hh-edit-er-icon">
            {isFamily
              ? <MdFamilyRestroom size={16} className="hh-icon-admin" />
              : <MdWork size={16} className="hh-icon-admin" />}
          </div>
          <div>
            <p className="hh-edit-title">
              {isFamily ? t("hhAddFamilyTitle") : t("hhAddHelperTitle")}
            </p>
            <p className="hh-edit-sub">{t("hhFormSub")}</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowModal(false)} className="hh-close-btn">
          <MdClose size={14} />
        </button>
      </div>

      <form onSubmit={handleAdd} className="hh-form">
        <FieldLabel icon={<MdPerson size={11} />} label={t("hhFieldName")} />
        <input className="input" placeholder={t("hhFieldNamePlaceholder")}
          value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />

        <FieldLabel icon={<MdPhone size={11} />} label={t("hhFieldMobile")} />
        <input className="input" placeholder="+91 98765 43210"
          value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />

        <FieldLabel icon={<MdEmail size={11} />} label={t("hhFieldEmail")} />
        <input className="input" type="email" placeholder="example@email.com"
          value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />

        {isFamily && (
          <>
            <FieldLabel icon={<MdFamilyRestroom size={11} />} label={t("hhFieldRelation")} />
            <input className="input" placeholder={t("hhFieldRelationPlaceholder")}
              value={formData.relation} onChange={(e) => setFormData({ ...formData, relation: e.target.value })} required />
          </>
        )}

        {!isFamily && (
          <>
            <FieldLabel icon={<MdWork size={11} />} label={t("hhFieldWork")} />
            <input className="input" placeholder={t("hhFieldWorkPlaceholder")}
              value={formData.work} onChange={(e) => setFormData({ ...formData, work: e.target.value })} required />
          </>
        )}

        <button type="submit" className="btn-primary hh-save-btn">
          <MdPerson size={16} /> {t("hhAddMemberBtn")}
        </button>
      </form>
    </>
  );
}

/* ── FIELD LABEL ── */
function FieldLabel({ icon, label }) {
  return (
    <label className="hh-field-label">
      <span className="hh-field-label-icon">{icon}</span>
      {label}
    </label>
  );
}