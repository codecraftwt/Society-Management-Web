import { useState } from "react";
import API from "../../../services/api";
import { useLang } from "../../../context/LanguageContext";
import { useAuthContext } from "../../../context/AuthContext";
import { useCustomAlert } from "../../../context/CustomAlertContext";
import { hasPermission } from "../../../utils/permissions";
import GlobalConfirmDialog from "../../../components/common/GlobalConfirmDialog";

export default function Delete({ isOpen, doc, onClose, onDeleted, onToast }) {
  const { t } = useLang();
  const { user } = useAuthContext();
  const { showUnauthorized } = useCustomAlert();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!hasPermission(user, "society_documents", "delete")) {
      showUnauthorized("You do not have permission to delete society documents.");
      return;
    }
    try {
      setDeleting(true);
      await API.delete(`/documents/admin/${doc.id}?hard=true`);
      onToast(`"${doc.title}" ${t("adDocDeleteSuccess")}`);
      onDeleted();
      onClose();
    } catch (err) {
      onToast(err.response?.data?.message || t("adDocDeleteFail"), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <GlobalConfirmDialog
      isOpen={isOpen}
      onClose={() => !deleting && onClose()}
      onConfirm={handleDelete}
      title={t("adDocDeleteTitle")}
      message={doc ? `"${doc.title}" ${t("adDocDeleteBody")}` : ""}
      variant="danger"
      loading={deleting}
    />
  );
}