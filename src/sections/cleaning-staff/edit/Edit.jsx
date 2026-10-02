import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MdEdit } from "react-icons/md";

import { useLang } from "../../../context/LanguageContext";
import { getErrorMessage } from "../../../utils/validators";
import GlobalModal from "../../../components/common/GlobalModal";
import CleaningStaffForm from "../CleaningStaffForm";
import { updateCleaningStaff } from "../cleaningStaffService";

export default function Edit({ isOpen, onClose, staff, onUpdated }) {
  const { t } = useLang();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!isOpen || !staff) return;
    setForm({
      name: staff.name || "",
      phone: staff.phone || "",
      email: staff.email || "",
      address: staff.address || "",
      designation: staff.designation || "",
      joining_date: staff.joining_date || "",
    });
  }, [isOpen, staff]);

  if (!staff || !form) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.joining_date) payload.joining_date = "";

      await updateCleaningStaff(staff.id, payload);
      toast.success(t("csEditSuccess", "Cleaning staff updated."));
      onClose();
      onUpdated?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t("csEditFail", "Could not update cleaning staff.")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("csEditTitle", "Edit Cleaning Staff")}
      subtitle={staff.name}
      icon={MdEdit}
      size="md"
      showFooter
      submitLabel={t("csSaveChanges", "Save Changes")}
      cancelLabel={t("cancel", "Cancel")}
      onSubmit={handleSubmit}
      submitLoading={submitting}
      submitDisabled={submitting}
      submitIcon={MdEdit}
      submitVariant="primary"
    >
      <CleaningStaffForm
        mode="edit"
        form={form}
        setForm={setForm}
        existingPhoto={staff.profile_picture}
      />
    </GlobalModal>
  );
}