import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  MdAdd, MdPerson, MdClose, MdDelete,
  MdShield, MdPhone, MdEmail, MdWork,
  MdFamilyRestroom, MdAdminPanelSettings, MdEdit, MdCheck,
} from "react-icons/md";
import { useLang } from "../../context/LanguageContext";
import API from "../../services/api";
import { getTitleError, getMobileError, getEmailError } from "../../utils/validators";
import ExpandableSearch from "../../components/common/ExpandableSearch";
import SlidingTabs from "../../components/common/SlidingTabs";
import useUnsavedDirty from "../../hooks/useUnsavedDirty";
import ConfirmDiscard from "../../components/common/ConfirmDiscard";

/* Daily Help classification — mirrors backend utils/dailyHelpUtils.js.
   A member is a helper when `work` is set, `relation` is a standard helper
   role (legacy rows), or the backend already flagged `isDailyHelp`. */
const DAILY_HELP_RELATIONS = new Set(["maid", "cook", "driver", "cleaner", "helper", "nanny", "daily help"]);

const isHelper = (m) =>
  (typeof m.isDailyHelp === "boolean" ? m.isDailyHelp : false) ||
  Boolean(m.work) ||
  DAILY_HELP_RELATIONS.has((m.relation || "").toLowerCase());

/* Quick-pick options — mirrors App's AddFamilyScreen (relations) and
   AddHelpsScreen (roles). "Other" reveals a custom text input. */
const RELATION_KEYS = ["spouse", "son", "daughter", "father", "mother", "other"];
const WORK_KEYS = ["maid", "cook", "driver", "nanny", "gardener", "other"];
const WORK_STORED = {
  maid: "Maid", cook: "Cook", driver: "Driver",
  nanny: "Nanny", gardener: "Gardener", other: "Other",
};
const tKey = (t, prefix, k) => t(`${prefix}${k.charAt(0).toUpperCase()}${k.slice(1)}`);

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

  /* unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(true);
  const requestClose = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else onClose();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const phoneErr = getMobileError(phone, "Phone number");
    if (phoneErr) { setError(phoneErr); return; }
    if (email) {
      const emailErr = getEmailError(email);
      if (emailErr) { setError(emailErr); return; }
    }
    setSaving(true); setError(null);
    try {
      const res = await API.put(`/household/${member.id}`, { email: email.trim(), phone: phone.trim() });
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t("hhEditFail"));
    } finally { setSaving(false); }
  };

  return (
    <PortalModal>
      <div onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }} className="hh-overlay">
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
            <button type="button" onClick={requestClose} className="hh-close-btn">
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

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose(); }}
      />
    </PortalModal>
  );
}

/* ═══════════════════════════ MAIN ═══════════════════════════ */
export default function MyHouseHold() {
  const { t }    = useLang();

  const [activeTab,    setActiveTab]    = useState("family");
  const [showModal,    setShowModal]    = useState(false);
  const [members,      setMembers]      = useState([]);
  const [flats,        setFlats]        = useState([]);
  const [pendingFlatId,setPendingFlatId]= useState(null);
  const [flatAssigned, setFlatAssigned] = useState(true);  // optimistic default
  const [confirm,      setConfirm]      = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [editMember,   setEditMember]   = useState(null);
  const [search,       setSearch]       = useState("");

  const [formData, setFormData] = useState({
    name: "", phone: "", email: "", relation: "", work: "",
  });

  /* unsaved-changes guard */
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirtyRef = useUnsavedDirty(showModal);

  useEffect(() => { checkFlat(); loadHousehold(); }, []);

  /* ✅ FIX: /users/get-flat returns an ARRAY — check array length, not .flat_number */
  async function checkFlat() {
    try {
      const res   = await API.get("/users/get-flat");
      const flats = Array.isArray(res.data) ? res.data : [];
      setFlats(flats);
      setPendingFlatId(flats.length ? String(flats[0].flat_id) : null);
      setFlatAssigned(flats.length > 0);
    } catch {
      setFlats([]);
      setPendingFlatId(null);
      setFlatAssigned(false);
    }
  }

  async function loadHousehold() {
    try {
      const res = await API.get("/household");
      setMembers(res.data || []);
    } catch { setMembers([]); }
  }

  const handleAdd = async (payload) => {
    if (!flatAssigned) return;
    try {
      await API.post("/household/add", payload);
      setFormData({ name: "", phone: "", email: "", relation: "", work: "" });
      setShowModal(false);
      loadHousehold();
    } catch (err) {
      throw new Error(err.response?.data?.message || "Failed to add member");
    }
  };

  const closeAddModal = () => {
    if (dirtyRef.current) setConfirmDiscard(true);
    else setShowModal(false);
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

  const familyMembers = members.filter((m) => !isHelper(m) && m.relation !== "Vehicle");
  const helpMembers   = members.filter((m) => isHelper(m) && m.relation !== "Vehicle");
  const adminCount    = familyMembers.filter((m) => m.isAdmin).length;
  const q = search.trim().toLowerCase();
  const matches = (m) =>
    !q ||
    [m.name, m.phone, m.email, m.relation, m.work].some((v) =>
      String(v || "").toLowerCase().includes(q)
    );
  const filtered = (list) => list.filter(matches);
  const familyList = filtered(familyMembers);
  const helpList   = filtered(helpMembers);
  const flatLabel  = (id) => {
    if (id == null) return "";
    const f = flats.find((x) => String(x.flat_id) === String(id));
    return f ? [f.block_name, f.flat_number].filter(Boolean).join(" ") : "";
  };

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
          <div className="ge-er-right">
            {activeTab === "family" ? (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <MdAdd size={16} /> {t("hhAddFamilyTitle")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="btn-muted flex items-center gap-2"
              >
                <MdAdd size={16} /> {t("hhAddHelperTitle")}
              </button>
            )}
          </div>
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
          <div className="ml-auto">
            <ExpandableSearch
              placeholder={t("hhFieldNamePlaceholder") || "Search members..."}
              value={search}
              onChange={setSearch}
            />
          </div>
        </div>

        {flatAssigned && (
          <div className="hh-sections">
            {/* ── TOGGLE: FAMILY MEMBERS (default) / HOUSEHOLD HELP ── */}
            <SlidingTabs
              className="hh-tabs"
              items={[
                { id: "family", label: t("hhTabFamily"), badge: familyMembers.length },
                { id: "help",   label: t("hhSectionHelp"), badge: helpMembers.length },
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />

            <section className="hh-section">
              <div className="hh-section-head">
                <span className={`hh-avatar ${activeTab === "family" ? "hh-avatar--family" : "hh-avatar--help"}`}>
                  {activeTab === "family" ? <MdFamilyRestroom size={16} /> : <MdWork size={16} />}
                </span>
                <span className="hh-section-title">
                  {activeTab === "family" ? t("hhSectionFamily") : t("hhSectionHelp")}
                  <span className="hh-section-count">
                    {activeTab === "family" ? familyMembers.length : helpMembers.length}
                  </span>
                </span>
                {flats.length > 1 && (
                  <span className="hh-flat-tag">
                    <MdWork size={12} /> {t("hhFieldSelectFlat")}: {flatLabel(pendingFlatId)}
                  </span>
                )}
              </div>

              {(activeTab === "family" ? familyList : helpList).length === 0 ? (
                <div className="bg-card hh-empty-state">
                  <div className="hh-empty-icon-wrap">
                    {activeTab === "family" ? <MdFamilyRestroom size={19} /> : <MdWork size={19} />}
                  </div>
                  <p className="text-secondary" style={{ fontSize: "0.83rem", margin: 0 }}>
                    {q ? t("hhEmptyHint") : (activeTab === "family" ? t("hhEmptyFamily") : t("hhEmptyHelp"))}
                  </p>
                  {!q && <p className="hh-empty-hint">{t("hhEmptyHint")}</p>}
                </div>
              ) : (
                <div className="hh-list">
                  {(activeTab === "family" ? familyList : helpList).map((m) => (
                    <MemberRow key={m.id} member={m} isFamily={activeTab === "family"}
                      onDelete={() => askDelete(m.id, m.name)}
                      onToggleAdmin={() => askToggleAdmin(m.id, m.name, m.isAdmin)}
                      onEdit={() => setEditMember(m)}
                      t={t} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      {showModal && flatAssigned && (
        <PortalModal>
          <div onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }} className="hh-overlay">
            <div className="bg-card animate-scaleIn hh-add-box">
              <ModalContent activeTab={activeTab} formData={formData}
                setFormData={setFormData} handleAdd={handleAdd}
                setShowModal={closeAddModal} t={t}
                flats={flats} flatId={pendingFlatId}
                onFlatChange={setPendingFlatId} />
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

      <ConfirmDiscard
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); setShowModal(false); }}
      />
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
function ModalContent({ activeTab, formData, setFormData, handleAdd, setShowModal, t, flats = [], flatId, onFlatChange }) {
  const isFamily = activeTab === "family";
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customRelation, setCustomRelation] = useState("");
  const [customWork, setCustomWork] = useState("");
  const showFlatPicker = flats.length > 1;

  const pickRelation = (key) => {
    setFormData((prev) => ({ ...prev, relation: key === "other" ? "Other" : tKey(t, "hhRel", key) }));
  };

  const pickWork = (key) => {
    setFormData((prev) => ({ ...prev, work: WORK_STORED[key] }));
  };

  /* Family:  name + relation quick-picks + custom relation + optional phone/email (mirrors AddFamilyScreen).
     Daily help: name + role quick-picks + custom role + required phone, no email (mirrors AddHelpsScreen). */
  const onSubmit = async (e) => {
    e.preventDefault();
    const nameErr = getTitleError(formData.name, "Name");
    if (nameErr) { setError(nameErr); return; }

    if (isFamily) {
      const finalRelation = formData.relation === "Other" ? customRelation.trim() : (formData.relation || "").trim();
      if (!finalRelation) { setError(t("hhRelationRequired")); return; }
      if (formData.phone.trim() && getMobileError(formData.phone.trim(), "Phone number")) {
        setError(getMobileError(formData.phone.trim(), "Phone number")); return;
      }
      if (formData.email.trim() && getEmailError(formData.email.trim())) {
        setError(getEmailError(formData.email.trim())); return;
      }
      setError(null);
      setSaving(true);
      try {
        await handleAdd({
          name: formData.name.trim(),
          relation: finalRelation,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          work: null,
          isAdmin: false,
          flat_id: flatId ? String(flatId) : undefined,
        });
      } catch (err) { setError(err.message); setSaving(false); }
      return;
    }

    const effectiveWork = formData.work === "Other" ? customWork.trim() : (formData.work || "").trim();
    const phoneErr = getMobileError(formData.phone, "Phone number");
    if (!effectiveWork) { setError(t("hhRoleRequired")); return; }
    if (phoneErr) { setError(phoneErr); return; }
    setError(null);
    setSaving(true);
    try {
      await handleAdd({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        relation: "Daily Help",
        work: effectiveWork,
        email: null,
        isAdmin: false,
        flat_id: flatId ? String(flatId) : undefined,
      });
    } catch (err) { setError(err.message); setSaving(false); }
  };

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

      <form onSubmit={onSubmit} className="hh-form">
        {error && (
          <div className="hh-error-box" style={{ marginBottom: "0.75rem" }}>
            <span style={{ flexShrink: 0 }}>⚠️</span> {error}
          </div>
        )}

        <FieldLabel icon={<MdPerson size={11} />} label={t("hhFieldName")} />
        <input className="input" placeholder={t("hhFieldNamePlaceholder")}
          value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />

        {showFlatPicker && (
          <>
            <FieldLabel icon={<MdWork size={11} />} label={t("hhFieldSelectFlat")} />
            <div className="hh-pill-grid">
              {flats.map((f) => {
                const label = [f.block_name, f.flat_number].filter(Boolean).join(" ");
                const selected = String(flatId) === String(f.flat_id);
                return (
                  <button type="button" key={f.flat_id}
                    className={`hh-pill ${selected ? "hh-pill--selected" : ""}`}
                    onClick={() => { onFlatChange(String(f.flat_id)); }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {isFamily && (
          <>
            <FieldLabel icon={<MdFamilyRestroom size={11} />} label={t("hhFieldSelectRelation")} />
            <div className="hh-pill-grid">
              {RELATION_KEYS.map((key) => {
                const label = tKey(t, "hhRel", key);
                const selected = formData.relation === label || (key === "other" && formData.relation === "Other");
                return (
                  <button type="button" key={key}
                    className={`hh-pill ${selected ? "hh-pill--selected" : ""}`}
                    onClick={() => pickRelation(key)}>
                    {label}
                  </button>
                );
              })}
            </div>
            {formData.relation === "Other" && (
              <input className="input" placeholder={t("hhFieldSpecifyRelationPlaceholder")}
                value={customRelation}
                onChange={(e) => setCustomRelation(e.target.value)}
                required />
            )}
          </>
        )}

        {!isFamily && (
          <>
            <FieldLabel icon={<MdWork size={11} />} label={t("hhRoleTitle")} />
            <p className="hh-role-sub">{t("hhRoleSubtitle")}</p>
            <div className="hh-pill-grid">
              {WORK_KEYS.map((key) => {
                const label = tKey(t, "hhRole", key);
                const selected = formData.work === WORK_STORED[key];
                return (
                  <button type="button" key={key}
                    className={`hh-pill ${selected ? "hh-pill--selected" : ""}`}
                    onClick={() => pickWork(key)}>
                    {label}
                  </button>
                );
              })}
            </div>
            {formData.work === "Other" && (
              <input className="input" placeholder={t("hhFieldCustomRolePlaceholder")}
                value={customWork}
                onChange={(e) => setCustomWork(e.target.value)}
                required />
            )}
          </>
        )}

        <FieldLabel icon={<MdPhone size={11} />} label={isFamily ? t("hhFieldPhoneOptional") : t("hhFieldMobile")} />
        <input className="input" placeholder="+91 98765 43210" maxLength={10}
          value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />

        {isFamily && (
          <>
            <FieldLabel icon={<MdEmail size={11} />} label={t("hhFieldEmail")} />
            <input className="input" type="email" placeholder="example@email.com"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </>
        )}

        <button type="submit" disabled={saving} className="btn-primary hh-save-btn">
          {isFamily ? <MdFamilyRestroom size={16} /> : <MdWork size={16} />}
          {isFamily ? t("hhAddFamilyTitle") : t("hhAddHelperTitle")}
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