import React from "react";
import { MdWarning } from "react-icons/md";
import GlobalConfirmDialog from "./GlobalConfirmDialog";
import { useLang } from "../../context/LanguageContext";

/**
 * UnsavedChangesModal Component
 *
 * Prompts the user when attempting to exit/close a dirty form with unsaved changes.
 *
 * Props:
 * - isOpen: boolean
 * - onKeepEditing: function (cancels closing, keeps modal open)
 * - onDiscard: function (resets form & closes modal)
 * - title: string
 * - message: string
 */
export function UnsavedChangesModal({
  isOpen,
  onKeepEditing,
  onDiscard,
  title,
  message,
}) {
  const { t } = useLang();
  return (
    <GlobalConfirmDialog
      isOpen={isOpen}
      onClose={onKeepEditing}
      onConfirm={onDiscard}
      title={title || t("cdTitle", "Discard unsaved changes?")}
      message={message || t("cdMessage", "You have unsaved changes in this form. If you close now they will be lost.")}
      confirmLabel={t("cdDiscard", "Discard & Close")}
      cancelLabel={t("cdKeep", "Keep Editing")}
      variant="warning"
      icon={MdWarning}
    />
  );
}

export default UnsavedChangesModal;
