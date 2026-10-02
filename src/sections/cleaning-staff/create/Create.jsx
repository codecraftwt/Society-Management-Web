import { useState } from "react";
import { toast } from "react-toastify";
import { MdCleaningServices } from "react-icons/md";

import { useLang } from "../../../context/LanguageContext";
import { getErrorMessage } from "../../../utils/validators";
import GlobalModal from "../../../components/common/GlobalModal";
import CleaningStaffForm from "../CleaningStaffForm";
import { createCleaningStaff } from "../cleaningStaffService";
import { todayIST } from "../format";

const blankForm = () => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  designation: "",
  joining_date: todayIST(),
});

export default function Create({ isOpen, onClose, onCreated }) {
  const { t } = useLang();

  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [form, setForm] = useState(blankForm);

  const reset = () => {
    setForm(blankForm());
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await createCleaningStaff(form, photoFile);
      toast.success(t("csCreateSuccess", "Cleaning staff added."));
      reset();
      onClose();
      onCreated?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t("csCreateFail", "Could not add cleaning staff.")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("csCreateTitle", "Add Cleaning Staff")}
      subtitle={t("csCreateSubtitle", "Manage cleaning staff profile and attendance")}
      icon={MdCleaningServices}
      size="md"
      showFooter
      submitLabel={t("csAddStaff", "Add Staff")}
      cancelLabel={t("cancel", "Cancel")}
      onSubmit={handleSubmit}
      submitLoading={submitting}
      submitIcon={MdCleaningServices}
      submitVariant="primary"
    >
      <CleaningStaffForm
        mode="create"
        form={form}
        setForm={setForm}
        photoFile={photoFile}
        setPhotoFile={setPhotoFile}
        photoPreview={photoPreview}
        setPhotoPreview={setPhotoPreview}
      />
    </GlobalModal>
  );
}