import { MdClose } from "react-icons/md";
import { createPortal } from "react-dom";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) {
  if (!isOpen) return null;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center px-4">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className={`relative w-full ${sizeClass[size]} bg-card rounded-xl p-6 animate-scaleIn max-h-[90vh] overflow-y-auto`}
      >
        {/* er */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>

          <button
            onClick={onClose}
            className="text-xl text-secondary hover:text-white"
          >
            <MdClose />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
