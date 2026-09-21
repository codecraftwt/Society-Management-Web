import { useState, useEffect, useCallback } from "react";

/**
 * useUnsavedChanges Hook
 *
 * Provides reusable protection against losing unsaved form data.
 * Intercepts Close, Cancel, Backdrop clicks, and Escape key presses.
 *
 * @param {boolean} hasUnsavedChanges - Whether the form currently has dirty unsaved changes
 * @param {function} onActualClose - The function that actually closes the form/modal and resets state
 */
export function useUnsavedChanges(hasUnsavedChanges, onActualClose) {
  const [showPrompt, setShowPrompt] = useState(false);

  const requestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowPrompt(true);
    } else if (onActualClose) {
      onActualClose();
    }
  }, [hasUnsavedChanges, onActualClose]);

  const confirmDiscard = useCallback(() => {
    setShowPrompt(false);
    if (onActualClose) {
      onActualClose();
    }
  }, [onActualClose]);

  const cancelDiscard = useCallback(() => {
    setShowPrompt(false);
  }, []);

  // Intercept Escape key press when modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  return {
    showPrompt,
    setShowPrompt,
    requestClose,
    confirmDiscard,
    cancelDiscard,
  };
}

export default useUnsavedChanges;
