import { useEffect } from "react";
import { createPortal } from "react-dom";
import SuccessAnimation from "./SuccessAnimation";

export default function SuccessOverlay({
  open,
  caption = "",
  size = 160,
  duration = 2400,
  onDone = null,
}) {
  useEffect(() => {
    if (!open || !onDone) return undefined;
    const id = setTimeout(onDone, duration);
    return () => clearTimeout(id);
  }, [open, onDone, duration]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <SuccessAnimation size={size} caption={caption} />
    </div>,
    document.body
  );
}
