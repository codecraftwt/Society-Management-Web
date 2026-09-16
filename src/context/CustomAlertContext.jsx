import React, { createContext, useContext, useState, useCallback } from "react";
import CustomAlertModal from "../components/common/CustomAlertModal";

const CustomAlertContext = createContext(null);

export const ALERT_TYPES = {
  UNAUTHORIZED: "unauthorized",
  CONFIRM: "confirm",
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

// Imperative listener bridge for non-component calls (e.g., API interceptors)
let alertListener = null;

export const customAlert = {
  show: (config) => {
    if (alertListener) {
      alertListener(config);
    }
  },
  showUnauthorized: (message = "You do not have permission to perform this action.") => {
    customAlert.show({
      type: ALERT_TYPES.UNAUTHORIZED,
      title: "Permission Restricted",
      message,
      confirmText: "Got It",
    });
  },
  showConfirm: ({ title = "Confirm Action", message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel, confirmStyle = "primary" }) => {
    customAlert.show({
      type: ALERT_TYPES.CONFIRM,
      title,
      message,
      confirmText,
      cancelText,
      confirmStyle,
      onConfirm,
      onCancel,
    });
  },
  showSuccess: (message, title = "Success") => {
    customAlert.show({
      type: ALERT_TYPES.SUCCESS,
      title,
      message,
      confirmText: "OK",
    });
  },
  showError: (message, title = "Error") => {
    customAlert.show({
      type: ALERT_TYPES.ERROR,
      title,
      message,
      confirmText: "Close",
    });
  },
  showWarning: (message, title = "Warning") => {
    customAlert.show({
      type: ALERT_TYPES.WARNING,
      title,
      message,
      confirmText: "OK",
    });
  },
};

export function CustomAlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState(null);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  const showAlert = useCallback((config) => {
    setAlertConfig({
      type: ALERT_TYPES.INFO,
      confirmText: "OK",
      cancelText: "Cancel",
      ...config,
    });
  }, []);

  const showUnauthorized = useCallback((message = "You do not have permission to perform this action.") => {
    showAlert({
      type: ALERT_TYPES.UNAUTHORIZED,
      title: "Permission Restricted",
      message,
      confirmText: "Got It",
    });
  }, [showAlert]);

  const showConfirm = useCallback(({ title = "Confirm Action", message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel, confirmStyle = "primary" }) => {
    showAlert({
      type: ALERT_TYPES.CONFIRM,
      title,
      message,
      confirmText,
      cancelText,
      confirmStyle,
      onConfirm,
      onCancel,
    });
  }, [showAlert]);

  const showSuccess = useCallback((message, title = "Success") => {
    showAlert({
      type: ALERT_TYPES.SUCCESS,
      title,
      message,
      confirmText: "OK",
    });
  }, [showAlert]);

  const showError = useCallback((message, title = "Error") => {
    showAlert({
      type: ALERT_TYPES.ERROR,
      title,
      message,
      confirmText: "Close",
    });
  }, [showAlert]);

  const showWarning = useCallback((message, title = "Warning") => {
    showAlert({
      type: ALERT_TYPES.WARNING,
      title,
      message,
      confirmText: "OK",
    });
  }, [showAlert]);

  // Register imperative listener
  React.useEffect(() => {
    alertListener = (config) => showAlert(config);
    return () => {
      alertListener = null;
    };
  }, [showAlert]);

  return (
    <CustomAlertContext.Provider
      value={{
        alertConfig,
        showAlert,
        showUnauthorized,
        showConfirm,
        showSuccess,
        showError,
        showWarning,
        hideAlert,
      }}
    >
      {children}
      <CustomAlertModal config={alertConfig} onClose={hideAlert} />
    </CustomAlertContext.Provider>
  );
}

export function useCustomAlert() {
  const context = useContext(CustomAlertContext);
  if (!context) {
    // Fallback to imperative Bridge if used outside provider
    return {
      showAlert: customAlert.show,
      showUnauthorized: customAlert.showUnauthorized,
      showConfirm: customAlert.showConfirm,
      showSuccess: customAlert.showSuccess,
      showError: customAlert.showError,
      showWarning: customAlert.showWarning,
      hideAlert: () => {},
    };
  }
  return context;
}
