import { useState } from "react";
import { toast } from "react-toastify";
import { MdPersonOff, MdPersonAdd } from "react-icons/md";

import { useLang } from "../../../context/LanguageContext";
import { getErrorMessage } from "../../../utils/validators";
import GlobalConfirmDialog from "../../../components/common/GlobalConfirmDialog";
import { updateCleaningStaffStatus } from "../cleaningStaffService";
import { STAFF_STATUS } from "../constants";

/**
 * Delete.jsx — deliberately NOT a delete.
 *
 * The backend refuses hard deletion by design: DELETE /cleaning-staff/:id
 * always answers 405 because attendance and pass rows reference the record and
 * must stay meaningful. So this file owns the only destructive-looking action
 * the API allows — the ACTIVE/INACTIVE toggle — and confirms it through the
 * shared GlobalConfirmDialog.
 *
 * Notes:
 *  • PATCH /:id/status accepts only { status }; it has no "reason" field, so
 *    none is collected here. The backend records its own revoke reason when a
 *    deactivation cancels outstanding passes.
 *  • Nothing is deleted: historical passes and attendance stay visible in the
 *    detail view after a deactivation.
 */
export default function Delete({ isOpen, onClose, staff, onChanged }) {
  const { t } = useLang();
  const [submitting, setSubmitting] = useState(false);

  if (!staff) return null;

  const deactivating = staff.status !== STAFF_STATUS.INACTIVE;
  const nextStatus = deactivating ? STAFF_STATUS.INACTIVE : STAFF_STATUS.ACTIVE;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await updateCleaningStaffStatus(staff.id, nextStatus);
      toast.success(
        deactivating
          ? t("csDeactivated", "Staff marked inactive. History is preserved.")
          : t("csReactivated", "Staff marked active.")
      );
      onClose();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t("csStatusFail", "Could not change staff status.")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlobalConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      loading={submitting}
      icon={deactivating ? MdPersonOff : MdPersonAdd}
      variant={deactivating ? "warning" : "success"}
      title={
        deactivating ? t("csDeactivateTitle", "Mark staff inactive") : t("csActivateTitle", "Mark staff active")
      }
      confirmLabel={deactivating ? t("csConfirmDeactivate", "Mark Inactive") : t("csConfirmActivate", "Mark Active")}
      cancelLabel={t("cancel", "Cancel")}
      message={
        deactivating
          ? t(
              "csDeactivateMsg",
              "{name} will no longer be selectable and any active pass will be cancelled. Their past passes and attendance are kept and remain visible.",
              { name: staff.name }
            )
          : t("csActivateMsg", "{name} will become selectable and can be issued new passes.", {
              name: staff.name,
            })
      }
    />
  );
}