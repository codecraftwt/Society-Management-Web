import { useState, useRef, useEffect, useCallback } from "react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  MdClose,
  MdCameraAlt,
  MdLocationOn,
  MdCheckCircle,
  MdRefresh,
  MdFileUpload,
  MdLogin,
  MdLogout,
  MdWarning,
} from "react-icons/md";
import { useLang } from "../../context/LanguageContext";

/**
 * GuardPunchModal
 *
 * Handles Punch-In and Punch-Out on Web:
 * - Punch-In: Webcam stream capture or image file upload fallback + GPS coordinates.
 * - Punch-Out: GPS coordinates only (NO photo required).
 * - Server is sole authority for geofence validation and timestamps.
 */
export default function GuardPunchModal({
  isOpen,
  onClose,
  mode = "PUNCH_IN", // "PUNCH_IN" | "PUNCH_OUT"
  isOnDuty = true,
  onSuccess,
  forced = false,
  onLogout,
}) {
  const { t } = useLang();

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const isPunchIn = mode === "PUNCH_IN";

  /* ── Stop Camera Stream Helper ── */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  /* ── Start Camera Stream ── */
  const startCamera = useCallback(async () => {
    setErrorMessage("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      } catch (err) {
        // Fallback for laptops/desktops where facingMode constraint may fail
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("Camera access failed or unavailable:", err.message);
      setCameraActive(false);
      setErrorMessage(
        t("gdCameraError", "Unable to access camera. Please allow camera permissions in browser settings or use photo upload fallback.")
      );
    }
  }, [t]);

  /* ── Ensure Stream is attached to Video element when active ── */
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.warn("video play error:", err));
    }
  }, [cameraActive]);

  /* ── Get Device GPS Location ── */
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t("gdGpsUnsupported", "Geolocation is not supported by your browser."));
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationLoading(false);
      },
      (err) => {
        console.warn("GPS error:", err.message);
        setLocationLoading(false);
        setLocationError(
          err.code === 1
            ? t("gdGpsDenied", "Location permission denied. Please allow location access in your browser.")
            : t("gdGpsTimeout", "Unable to retrieve GPS coordinates. Please try again.")
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [t]);

  /* ── Initialize on Open (Fetch GPS & attempt camera start) ── */
  useEffect(() => {
    if (isOpen) {
      setCapturedBlob(null);
      setCapturedPreview(null);
      setErrorMessage("");
      setLocationError("");
      fetchLocation();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera, fetchLocation]);

  /* ── Capture Frame from Webcam ── */
  const handleSnapSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreview(url);
        stopCamera();
      },
      "image/jpeg",
      0.85
    );
  };

  /* ── Fallback File Upload ── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedBlob(file);
    const url = URL.createObjectURL(file);
    setCapturedPreview(url);
    stopCamera();
  };

  /* ── Retake Selfie ── */
  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    startCamera();
  };

  /* ── Handle Modal Backdrop Click ── */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !forced && !isSubmitting) {
      onClose();
    }
  };

  /* ── Submit Punch Action ── */
  const handleSubmit = async () => {
    setErrorMessage("");
    if (!location) {
      fetchLocation();
      setErrorMessage(t("gdGpsRequired", "Please wait while fetching your GPS location."));
      return;
    }

    if (isPunchIn && !capturedBlob) {
      setErrorMessage(t("gdSelfieRequired", "A selfie photo is required to punch in."));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isPunchIn) {
        const formData = new FormData();
        formData.append("lat", String(location.lat));
        formData.append("lng", String(location.lng));
        if (location.accuracy != null) {
          formData.append("accuracy", String(location.accuracy));
        }
        formData.append("selfie", capturedBlob, `punch-in-${Date.now()}.jpg`);

        const res = await API.post("/guard-attendance/punch-in", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success(res.data?.message || t("gdPunchInSuccess", "Punch-in recorded successfully! Shift active."));
      } else {
        const payload = {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
        };

        const res = await API.post("/guard-attendance/punch-out", payload);
        toast.success(res.data?.message || t("gdPunchOutSuccess", "Punch-out recorded successfully!"));
      }

      window.dispatchEvent(new Event("refresh_guard_data"));
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Attendance punch error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        (isPunchIn
          ? t("gdPunchInFailed", "Punch-in failed. Please try again.")
          : t("gdPunchOutFailed", "Punch-out failed. Please try again."));
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-card rounded-3xl border border-glass-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-card-inner-bg/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${
                isPunchIn
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/25"
                  : "bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/25"
              }`}
            >
              {isPunchIn ? <MdLogin size={24} /> : <MdLogout size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-primary">
                  {isPunchIn
                    ? t("gdPunchInTitle", "Guard Punch In")
                    : t("gdPunchOutTitle", "Guard Punch Out")}
                </h3>
                {forced && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    {t("gdMandatory", "Required")}
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary">
                {isPunchIn
                  ? t("gdPunchInSubtitle", "Capture live selfie and verify society GPS location")
                  : t("gdPunchOutSubtitle", "Verify GPS location to conclude your duty")}
              </p>
            </div>
          </div>

          {!forced ? (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-card-inner-bg transition"
            >
              <MdClose size={20} />
            </button>
          ) : (
            <div
              className="p-2 text-secondary/50 cursor-not-allowed"
              title={t("gdPunchInMandatoryNote", "Duty punch-in is required before accessing gate operations")}
            >
              <MdClose size={20} className="opacity-30" />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Mandatory Duty Prompt Notice */}
          {forced && isPunchIn && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
              <MdCheckCircle size={18} className="shrink-0 mt-0.5" />
              <span>
                {t(
                  "gdMandatoryPunchInMsg",
                  "Security duty has started. Complete your punch-in attendance to unlock gate operations and visitor registration."
                )}
              </span>
            </div>
          )}

          {/* Off Duty Alert */}
          {isPunchIn && !isOnDuty && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <MdWarning size={18} className="shrink-0 mt-0.5" />
              <span>{t("gdOffDutyModalWarn", "You are currently off duty. Punch in is only permitted during your assigned shift window.")}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2.5">
              <MdWarning size={18} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Location Status Card */}
          <div className="p-4 rounded-2xl bg-card-inner-bg border border-glass-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  location
                    ? "bg-emerald-500/20 text-emerald-500"
                    : locationError
                    ? "bg-rose-500/20 text-rose-500"
                    : "bg-blue-500/20 text-blue-500"
                }`}
              >
                <MdLocationOn size={20} className={locationLoading ? "animate-bounce" : ""} />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary">
                  {locationLoading
                    ? t("gdFetchingGps", "Locating your GPS position...")
                    : location
                    ? t("gdGpsAcquired", "GPS Location Acquired")
                    : t("gdGpsMissing", "GPS Location Required")}
                </p>
                <p className="text-[11px] text-secondary">
                  {location
                    ? `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`
                    : locationError || t("gdGpsAccuracyNote", "High-accuracy geolocation required")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchLocation}
              disabled={locationLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-card border border-glass-border text-secondary hover:text-primary transition flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95"
              title={t("gdRetryGps", "Refresh GPS")}
            >
              <MdRefresh size={14} className={locationLoading ? "animate-spin" : ""} />
              <span>{t("gdRetry", "Retry")}</span>
            </button>
          </div>

          {/* Punch-In Camera / Upload Section */}
          {isPunchIn && (
            <div className="space-y-3">
              <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-glass-border flex items-center justify-center shadow-inner">
                {capturedPreview ? (
                  <img
                    src={capturedPreview}
                    alt="Selfie preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
                      className={`w-full h-full object-cover scale-x-[-1] ${
                        cameraActive ? "block" : "hidden"
                      }`}
                    />
                    {!cameraActive && (
                      <div className="flex flex-col items-center gap-3 p-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center shadow-md">
                          <MdCameraAlt size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">
                            {t("gdCameraReadyTitle", "Selfie Photo Required")}
                          </p>
                          <p className="text-xs text-secondary max-w-xs mt-0.5">
                            {t(
                              "gdCameraReadyDesc",
                              "Click the button below to turn on your webcam, or use photo upload fallback."
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="mt-1 px-5 py-2.5 text-xs font-bold rounded-xl bg-accent hover:opacity-90 text-white shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-2"
                        >
                          <MdCameraAlt size={16} />
                          <span>{t("gdOpenCameraButton", "Open Camera")}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Live Camera Snap overlay button */}
                {cameraActive && !capturedPreview && (
                  <button
                    type="button"
                    onClick={handleSnapSelfie}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white text-black font-bold text-xs shadow-lg hover:bg-white/95 hover:scale-105 active:scale-95 transition flex items-center gap-2"
                  >
                    <MdCameraAlt size={16} />
                    <span>{t("gdTakeSelfie", "Take Selfie")}</span>
                  </button>
                )}
              </div>

              {/* Retake / Upload Controls */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {capturedPreview ? (
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-card-inner-bg border border-glass-border text-secondary hover:text-primary transition flex items-center gap-1.5 hover:scale-105"
                  >
                    <MdRefresh size={16} />
                    <span>{t("gdRetake", "Retake Photo")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-card-inner-bg border border-glass-border text-secondary hover:text-primary transition flex items-center gap-1.5 hover:scale-105"
                  >
                    <MdFileUpload size={16} />
                    <span>{t("gdUploadFallback", "Upload Photo Fallback")}</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* Punch-Out Friendly Summary */}
          {!isPunchIn && (
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center space-y-2">
              <p className="text-sm font-semibold text-primary">
                {t("gdConfirmPunchOutMsg", "Ready to punch out and conclude your shift?")}
              </p>
              <p className="text-xs text-secondary">
                {t("gdPunchOutNote", "No photo is required. Your worked duration and punch-out timestamp will be calculated by the server.")}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-glass-border bg-card-inner-bg/50">
          <div>
            {forced && onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-rose-500 hover:bg-rose-500/10 transition"
              >
                {t("gdLogoutInstead", "Log Out")}
              </button>
            ) : !forced ? (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-card border border-glass-border text-secondary hover:text-primary transition"
              >
                {t("gdCancel", "Cancel")}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (isPunchIn && (!isOnDuty || !capturedBlob)) || !location}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${
              isPunchIn ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25" : "bg-rose-600 hover:bg-rose-500 shadow-rose-500/25"
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t("gdSubmitting", "Submitting...")}</span>
              </>
            ) : (
              <>
                <MdCheckCircle size={16} />
                <span>
                  {isPunchIn
                    ? t("gdConfirmPunchIn", "Confirm Punch In")
                    : t("gdConfirmPunchOut", "Confirm Punch Out")}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
