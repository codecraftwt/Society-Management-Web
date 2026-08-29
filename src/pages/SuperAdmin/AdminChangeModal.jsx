import React, { useEffect, useState } from "react";
import { useLang } from "../../context/LanguageContext";
import { MdClose, MdPersonAdd, MdEdit } from "react-icons/md";

const AdminChangeModal = ({ onClose, onSubmit, existingAdmin }) => {
  const { t }    = useLang();
  const isEdit   = Boolean(existingAdmin);
  const [name, setName] = useState("");

  useEffect(() => {
    if (isEdit) setName(existingAdmin);
  }, [existingAdmin, isEdit]);

  const submit = () => {
    if (!String(name || "").trim()) return;
    onSubmit(name.trim());
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal">
        <div className="sa-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="sa-form-icon">
              {isEdit ? <MdEdit size={18} /> : <MdPersonAdd size={18} />}
            </div>
            <div>
              <h3 className="sa-form-title">
                {isEdit ? t("amModalEditTitle") : t("amModalAddTitle")}
              </h3>
              <p className="sa-form-subtitle">
                {isEdit ? t("amModalEditSub") || "Update the society administrator" : t("amModalAddSub") || "Assign an administrator to this society"}
              </p>
            </div>
          </div>
        </div>

        <div className="sa-modal-body">
          <label className="sa-label">{t("amAdminName")}</label>
          <input
            placeholder={t("amAdminName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="input"
            autoFocus
          />
        </div>

        <div className="sa-modal-footer">
          <button onClick={onClose} className="sa-btn sa-btn-ghost">
            <MdClose size={15} /> {t("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={!String(name || "").trim()}
            className="sa-btn sa-btn-primary"
            style={{ opacity: (!String(name || "").trim()) ? 0.55 : 1, cursor: (!String(name || "").trim()) ? "not-allowed" : "pointer" }}
          >
            {isEdit ? <MdEdit size={15} /> : <MdPersonAdd size={15} />}
            {isEdit ? t("amUpdateBtn") : t("amAddBtn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminChangeModal;