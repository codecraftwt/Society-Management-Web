import { useContext, useState } from "react";
import { MdEdit, MdCampaign } from "react-icons/md";
import API from "../../../services/api";
import { AuthContext } from "../../../context/AuthContext";
import { useLang } from "../../../context/LanguageContext";
import { useCustomAlert } from "../../../context/CustomAlertContext";
import { getTitleError, getDescriptionError } from "../../../utils/validators";
import GlobalModal from "../../../components/common/GlobalModal";
import NoticeForm from "../NoticeForm";

export default function Edit({
  isOpen,
  notice,
  onClose,
  onUpdated,
  isSuperAdmin,
  societiesList,
  filterSocietyId,
}) {
  const { t } = useLang();
  const { user } = useContext(AuthContext);
  const { showError } = useCustomAlert();

  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(() => ({
    title: notice?.title || "",
    description: notice?.description || "",
    society_id: notice?.society_id || "",
    acknowledgement_required: Boolean(notice?.acknowledgement_required),
  }));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!notice) return;
    const titleErr = getTitleError(form.title, "Title");
    if (titleErr) { showError(titleErr); return; }
    const descErr = getDescriptionError(form.description, "Description");
    if (descErr) { showError(descErr); return; }
    if (isSuperAdmin && !form.society_id) { showError(t("noticeSelectSocietyErr", "Please select a society.")); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("acknowledgement_required", form.acknowledgement_required ? "true" : "false");

      const targetSocId = isSuperAdmin ? (form.society_id || (filterSocietyId === "ALL" ? "" : filterSocietyId)) : user?.society_id;
      if (targetSocId) formData.append("society_id", targetSocId);
      if (file) formData.append("file", file);

      await API.put(`/notices/${notice.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setForm({ title: "", description: "", society_id: "", acknowledgement_required: false });
      setFile(null);
      onClose();
      onUpdated();
    } catch (err) {
      showError(err.response?.data?.message || t("noticePublishFail", "Failed to publish notice"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("noticeUpdateTitle")}
      subtitle={t("noticeModalSubtitle")}
      icon={MdCampaign}
      size="md"
      showFooter
      submitLabel={t("noticeUpdateTitle")}
      cancelLabel={t("cancel") || "Cancel"}
      onSubmit={handleSubmit}
      submitLoading={submitting}
      submitDisabled={submitting || Boolean(getTitleError(form.title, "Title")) || Boolean(getDescriptionError(form.description, "Description")) || (isSuperAdmin && !form.society_id)}
      submitIcon={MdEdit}
      submitVariant="edit"
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <NoticeForm
          isSuperAdmin={isSuperAdmin}
          societiesList={societiesList}
          form={form}
          setForm={setForm}
          file={file}
          setFile={setFile}
        />
      </form>
    </GlobalModal>
  );
}