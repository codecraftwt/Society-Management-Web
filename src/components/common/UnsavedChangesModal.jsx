import React from "react";
import { MdWarning } from "react-icons/md";
import GlobalConfirmDialog from "./GlobalConfirmDialog";

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
  title = "Discard Unsaved Changes?",
  message = "You have unsaved changes. Are you sure you want to close this form?",
}) {
  return (
    <GlobalConfirmDialog
      isOpen={isOpen}
      onClose={onKeepEditing}
      onConfirm={onDiscard}
      title={title}
      message={message}
      confirmLabel="Discard Changes"
      cancelLabel="Keep Editing"
      variant="warning"
      icon={MdWarning}
    />
  );
}

export default UnsavedChangesModal;
