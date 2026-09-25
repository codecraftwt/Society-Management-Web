import { useState } from "react";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { useCustomAlert } from "../../../context/CustomAlertContext";
import GlobalConfirmDialog from "../../../components/common/GlobalConfirmDialog";

export default function Delete({ isOpen, notice, onClose, onDeleted }) {
  const { t } = useLang();
  const { showError } = useCustomAlert();
  const [loading, setLoading] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!notice) return;
    try {
      setLoading(true);
      await API.delete(`/notices/${notice.id}`);
      onDeleted(notice);
    } catch (err) {
      showError(err.response?.data?.message || t("noticeDeleteFail", "Failed to delete notice"));
      setLoading(false);
    }
  };

  return (
    <GlobalConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDeleteConfirm}
      title={t("noticeDeleteTitle", "Delete Notice")}
      message={t("noticeDeleteMsg", "Are you sure you want to delete this notice broadcast? Residents will no longer see it on their noticeboard.")}
      variant="danger"
      loading={loading}
    />
  );
}