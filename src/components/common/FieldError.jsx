import React from "react";
import { MdErrorOutline } from "react-icons/md";

/**
 * FieldError Component
 *
 * Renders standardized red error message text directly below form inputs.
 *
 * Props:
 * - error: string or null
 * - className: optional CSS string
 * - id: optional string for aria-describedby
 */
export function FieldError({ error, className = "", id = undefined }) {
  if (!error) return null;

  return (
    <p
      id={id}
      className={`text-xs text-red-500 mt-1 font-medium flex items-center gap-1.5 animate-fadeIn ${className}`}
      style={{ color: "var(--reject-color, #ef4444)" }}
      role="alert"
      aria-live="polite"
    >
      <MdErrorOutline size={14} className="shrink-0" />
      <span>{error}</span>
    </p>
  );
}

export default FieldError;
