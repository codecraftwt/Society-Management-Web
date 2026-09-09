import React, { useEffect, useState } from "react";
import { useLang } from "../../context/LanguageContext";
import { MdPersonAdd, MdEdit } from "react-icons/md";
import GlobalModal from "../../components/common/GlobalModal";

const AdminChangeModal = ({ onClose, onSubmit, existingAdmin }) => {
  const { t } = useLang();
  const isEdit = Boolean(existingAdmin);
  const [name, setName] = useState("");

  useEffect(() => {
    if (isEdit) setName(existingAdmin);
  }, [existingAdmin, isEdit]);

  const submit = () => {
    if (!String(name || "").trim()) return;
    onSubmit(name.trim());
  };

  return (
    <GlobalModal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? t("amModalEditTitle") : t("amModalAddTitle")}
      subtitle={
        isEdit
          ? t("amModalEditSub") || "Update the society administrator"
          : t("amModalAddSub") || "Assign an administrator to this society"
      }
      icon={isEdit ? MdEdit : MdPersonAdd}
      size="sm"
      showFooter
      submitLabel={isEdit ? t("amUpdateBtn") || "Update Admin" : t("amAddBtn") || "Add Admin"}
      cancelLabel={t("cancel") || "Cancel"}
      onSubmit={submit}
      submitDisabled={!String(name || "").trim()}
      submitIcon={isEdit ? MdEdit : MdPersonAdd}
      submitVariant={isEdit ? "edit" : "primary"}
    >
      <div className="sa-input-group">
        <label className="sa-label">{t("amAdminName")}</label>
        <input
          placeholder={t("amAdminName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="input"
          autoFocus
        />
      </div>
    </GlobalModal>
  );
};

export default AdminChangeModal;