import { useEffect, useState } from "react";
import { MdApartment, MdHomeWork } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import "./SocietyLogo.css";

/**
 * SocietyLogo
 *
 * Renders a society logo inside a polished "matte plate" frame so logos of
 * any aspect ratio (square, wide word-marks, tall crests) are displayed
 * properly instead of being cropped or stretched.
 *
 * Features:
 * - `object-fit: contain` with breathing room so nothing is ever cut off
 * - Soft white plate + coloured ring so transparent PNG logos always read
 * - Graceful fallback to a property-type glyph when no logo is configured
 *   or when the remote image fails to load (broken URL / offline)
 *
 * Props:
 *   src          – logo URL (null / "" when the society has no logo)
 *   name         – society name (used for the alt text)
 *   propertyType – "Apartments" | "Row Houses" | "Mixed" | "Commercial"
 *   size         – rendered square size in px
 *   radius       – corner radius in px (defaults to a proportional value)
 *   tone         – accent colour used for the ring + fallback glyph
 *   ring         – draw the coloured ring around the plate
 *   className    – extra class names
 */
const TYPE_GLYPH = {
  Apartments: MdApartment,
  "Row Houses": MdHomeWork,
  Mixed: MdApartment,
  Commercial: FaBuilding,
};

export default function SocietyLogo({
  src,
  name = "",
  propertyType = "",
  size = 64,
  radius,
  className = "",
  tone = "var(--accent)",
  ring = true,
}) {
  const [failed, setFailed] = useState(false);

  // Reset the error state whenever the source changes (e.g. opening the
  // detail modal for a different society that does have a logo).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const hasLogo = Boolean(src) && !failed;
  const Glyph = TYPE_GLYPH[propertyType] || MdApartment;
  const iconSize = Math.max(16, Math.round(size * 0.42));
  const plateRadius = radius ?? Math.round(size * 0.28);

  return (
    <span
      className={`soc-logo${ring ? " soc-logo--ring" : ""}${className ? ` ${className}` : ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: plateRadius,
        "--soc-logo-tone": tone,
      }}
    >
      {hasLogo ? (
        <img
          className="soc-logo__img"
          src={src}
          alt={`${name || "Society"} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="soc-logo__fallback" aria-hidden="true">
          <Glyph size={iconSize} />
        </span>
      )}
    </span>
  );
}
