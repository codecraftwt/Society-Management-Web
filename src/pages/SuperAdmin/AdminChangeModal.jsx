import React, { useEffect, useState } from "react";
import { useLang } from "../../context/LanguageContext"; // ← NEW

const AdminChangeModal = ({ onClose, onSubmit, existingAdmin }) => {
  const { t }    = useLang(); // ← NEW
  const isEdit   = Boolean(existingAdmin);
  const [name, setName] = useState("");

  useEffect(() => {
    if (isEdit) setName(existingAdmin);
  }, [existingAdmin, isEdit]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card-bg p-6 rounded-2xl shadow-card w-full max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          {isEdit ? t("amModalEditTitle") : t("amModalAddTitle")}
        </h2>

        <input placeholder={t("amAdminName")} value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 mb-4" />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100">
            {t("cancel")}
          </button>
          <button onClick={() => onSubmit(name)}
            className={`px-4 py-2 rounded-xl font-medium ${isEdit ? "bg-pastel-purple" : "bg-pastel-green"}`}>
            {isEdit ? t("amUpdateBtn") : t("amAddBtn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminChangeModal;